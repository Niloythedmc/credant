const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getSecret } = require('../services/secretService');
const { transferTon } = require('../services/tonService');
// Placeholder Platform Wallet (Replace with real one)
const PLATFORM_WALLET_ADDRESS = 'EQD__________________________________________0vo';

// Helper to verify auth
const verifyAuth = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
};

// POST /api/ads/create-contract
// Handles payment via Inner Wallet and creates ad
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

        // Platform Fee 5%
        const totalCost = (budget * duration * 1.05);
        const amountStr = totalCost.toFixed(9); // Ensure safe string for TON

        // 2. Get User Wallet
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists || !userDoc.data().wallet) {
            return res.status(400).json({ error: "No inner wallet found" });
        }

        const secretId = userDoc.data().wallet.secretId;

        // 3. Load Mnemonic
        const mnemonic = await getSecret(secretId);

        // 4. Execute Transfer (Platform/Escrow)
        // Uses the service to send TON from inner wallet to Platform Wallet
        console.log(`Processing payment of ${amountStr} TON from user ${uid}`);

        let seqno;
        try {
            seqno = await transferTon(mnemonic, PLATFORM_WALLET_ADDRESS, amountStr);
        } catch (txError) {
            console.error("Transfer failed:", txError);
            return res.status(500).json({ error: "Payment transaction failed: " + txError.message });
        }

        // 5. Create Ad Record
        const adData = {
            ...payload,
            userId: uid,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            payment: {
                amount: totalCost,
                txSeqno: seqno,
                method: 'inner_wallet',
                timestamp: Date.now()
            }
        };

        const adRef = await admin.firestore().collection('ads').add(adData);

        // 6. Update User Profile (Add to myAds)
        await admin.firestore().collection('users').doc(uid).update({
            ads: admin.firestore.FieldValue.arrayUnion({
                id: adRef.id,
                title: payload.title,
                status: 'active',
                budget: payload.budget
            })
        });

        return res.status(200).json({
            success: true,
            contractAddress: PLATFORM_WALLET_ADDRESS, // Mock contract address
            adId: adRef.id,
            totalCost
        });

    } catch (error) {
        console.error("Create Contract Error:", error);
        if (error.message === 'Unauthorized') return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /api/ads/confirm-contract
// (Legacy/Optional) verification endpoint if external wallet used
// But for this flow, create-contract handles everything.
// We'll keep it as a stub or handle saving if external wallet flow passes data here.
router.post('/confirm-contract', async (req, res) => {
    // If logic moves to frontend calling "confirm" after "create" returns messages...
    // But we are doing direct processing.
    // We can just return success or save duplicate if needed.
    // For now, let's assume create-contract does the work for Inner Wallet mode.
    return res.status(200).json({ success: true });
});

module.exports = router;
