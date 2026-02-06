const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getChat, getFileLink, getChatMemberCount } = require('../services/botService'); // Import bot services

// ... existing code ...

// POST /api/ads/resolve-link
router.post('/resolve-link', async (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Link is required" });

    try {
        // Extract username
        // Regex handles: t.me/username, @username, t.me/username/123, t.me/bot?start=...
        const match = link.match(/(?:t\.me\/|@)([\w_]+)/);
        if (!match) return res.status(400).json({ error: "Invalid Telegram link or username" });

        const username = match[1];
        const chat = await getChat(`@${username}`);

        let photoUrl = null;
        if (chat.photo && chat.photo.big_file_id) {
            photoUrl = await getFileLink(chat.photo.big_file_id);
        }

        // Try fetch member count if it's a channel/supergroup
        let memberCount = 0;
        try {
            memberCount = await getChatMemberCount(chat.id);
        } catch (e) { }

        const result = {
            id: chat.id,
            title: chat.title || chat.first_name, // Bots might have first_name
            username: chat.username,
            description: chat.description || chat.bio, // Bots use bio often
            photoUrl,
            type: chat.type,
            memberCount
        };

        return res.json(result);

    } catch (error) {
        console.error("Resolve Link Error:", error.message);
        return res.status(404).json({ error: "Could not resolve link. Bot might not have access or invalid user." });
    }
});
const { getSecret, saveSecret } = require('../services/secretService');
const { transferTon, createWallet, getBalance } = require('../services/tonService'); // Import getBalance from updated service

// Platform/Escrow Wallet Address (Where fees eventually go)
const PLATFORM_WALLET_ADDRESS = 'UQAw9i_A6CvyXjGTWVwuJxZz_MgnxLTMUlxzCRxVi3IQv9jD';

// Helper to verify auth
const verifyAuth = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
};

// Background Poller: Checks Escrow Balance and Sends Fee
const monitorAndDeductFee = async (escrowAddress, escrowMnemonic, platformFeeAmount, maxRetries = 24) => {
    // Poll every 5 seconds for 2 minutes (24 * 5 = 120s)
    let attempts = 0;
    const feeStr = platformFeeAmount.toFixed(9);

    console.log(`[FeeMonitor] Starting monitor for ${escrowAddress}. Target Fee: ${feeStr} TON`);

    const checkLoop = setInterval(async () => {
        attempts++;
        try {
            const balanceBigInt = await getBalance(escrowAddress);
            const balanceTon = Number(balanceBigInt) / 1e9;

            console.log(`[FeeMonitor] ${escrowAddress} Balance: ${balanceTon} TON (Attempt ${attempts}/${maxRetries})`);

            // Check if we have enough funds (Fee + minimal gas ~0.05)
            // Just checking if balance >= fee isn't enough, we need gas. 
            // Current budget logic: Cost = Budget + 5%. 
            // So Balance should be >= Budget + 5%.
            // We want to extract only the 5% Fee.

            if (balanceTon >= platformFeeAmount) {
                console.log(`[FeeMonitor] Funds detected! Sending ${feeStr} TON fee to Platform...`);
                clearInterval(checkLoop);

                try {
                    await transferTon(escrowMnemonic, PLATFORM_WALLET_ADDRESS, feeStr);
                    console.log(`[FeeMonitor] Fee deduction success!`);
                } catch (err) {
                    console.error(`[FeeMonitor] Failed to send fee:`, err);
                }
            } else if (attempts >= maxRetries) {
                console.log(`[FeeMonitor] Timeout waiting for funds.`);
                clearInterval(checkLoop);
            }
        } catch (err) {
            console.error(`[FeeMonitor] Error checking balance:`, err);
        }
    }, 5000);
};


router.post('/create-contract', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const payload = req.body;

        // 1. Calculate Cost
        const budget = parseFloat(payload.budget);
        const duration = parseInt(payload.duration);
        if (isNaN(budget) || isNaN(duration)) {
            return res.status(400).json({ error: "Invalid budget or duration" });
        }

        // Fee Calculation Logic
        // Budget = 0.1
        // Platform Fee = 5% of Budget = 0.005
        // Total User Pays = Budget + Fee = 0.105

        const platformFee = (budget * 0.05);
        // Note: User says "sum of 105%... extract 5% means the 0.005".
        // If Budget is 100, Total is 105. Fee is 5. Correct.

        const totalCost = (budget * duration * 1.05); // Total amount to fund
        const totalFee = (budget * duration * 0.05); // Total Fee to extract

        const amountStr = totalCost.toFixed(9);

        // 2. Get User Wallet
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists || !userDoc.data().wallet) {
            return res.status(400).json({ error: "No inner wallet found" });
        }
        const userSecretId = userDoc.data().wallet.secretId;

        // 3. Generate Escrow
        const escrowWallet = await createWallet();
        const escrowSecretId = `escrow-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await saveSecret(escrowSecretId, escrowWallet.mnemonic);

        // 4. Fund Escrow (User -> Escrow)
        const userMnemonic = await getSecret(userSecretId);
        console.log(`Funding Escrow ${escrowWallet.address} with ${amountStr} TON`);

        // Background: Start monitoring for funds to deduct fee
        // We pass the mnemonic so it can sign the transfer once funds arrive
        monitorAndDeductFee(escrowWallet.address, escrowWallet.mnemonic, totalFee);

        let seqno;
        try {
            seqno = await transferTon(userMnemonic, escrowWallet.address, amountStr);
        } catch (txError) {
            console.error("Funding failed:", txError);
            return res.status(500).json({ error: "Funding transaction failed: " + txError.message });
        }

        // 5. Create Ad Record
        const adData = {
            ...payload,
            userId: uid,
            status: 'active',
            contractAddress: escrowWallet.address,
            budget: budget,
            duration: duration,
            platformFee: totalFee,
            escrowSecretId: escrowSecretId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            payment: {
                amount: totalCost,
                txSeqno: seqno,
                method: 'inner_wallet',
                timestamp: Date.now()
            }
        };

        const adRef = await admin.firestore().collection('ads').add(adData);
        await admin.firestore().collection('users').doc(uid).update({
            ads: admin.firestore.FieldValue.arrayUnion({
                id: adRef.id,
                title: payload.title,
                description: payload.description, // Added for UI
                status: 'active',
                budget: payload.budget,
                duration: duration, // Added for UI
                subject: payload.subject, // Added for UI
                currency: 'TON'
            })
        });

        return res.status(200).json({
            success: true,
            contractAddress: escrowWallet.address,
            adId: adRef.id,
            totalCost
        });

    } catch (error) {
        console.error("Create Contract Error:", error);
        if (error.message === 'Unauthorized') return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: "Internal Error: " + error.message });
    }
});

router.post('/confirm-contract', async (req, res) => {
    return res.status(200).json({ success: true });
});

// GET /api/ads (Public - All Active Ads)
router.get('/', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('ads')
            .where('status', '==', 'active')
            // .orderBy('createdAt', 'desc') // Ensure index exists if using this
            .get();

        const ads = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Optional: Filter out sensitive data if needed, but for now budget/title is fine
            ads.push({ id: doc.id, ...data });
        });

        // Manual Sort (Desc Date)
        ads.sort((a, b) => {
            const tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA;
        });

        return res.status(200).json(ads);
    } catch (error) {
        console.error("Fetch Ads Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/ads/my-ads
router.get('/my-ads', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        const snapshot = await admin.firestore().collection('ads')
            .where('userId', '==', uid)
            // .orderBy('createdAt', 'desc') // Removed to avoid Index Error
            .get();

        const ads = [];
        snapshot.forEach(doc => {
            ads.push({ id: doc.id, ...doc.data() });
        });

        // Manual Sort (Desc Date)
        ads.sort((a, b) => {
            const tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA;
        });

        return res.status(200).json(ads);
    } catch (error) {
        if (error.message === 'Unauthorized') return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
