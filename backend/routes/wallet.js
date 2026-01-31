const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const axios = require('axios');
const { createWallet } = require('../services/tonService');
const { saveSecret } = require('../services/secretService');
const { tonApiUrl, tonApiKey } = require('../config');

// Helper to verify Firebase ID Token (Middleware usually, but inline for speed/simplicity here)
const verifyAuth = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
};

// POST /api/wallet/create
// Creates a TON Wallet for the authenticated user
router.post('/create', async (req, res) => {
    try {
        // 1. Auth Check
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        // 2. Check if wallet already exists
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data().wallet) {
            return res.status(400).json({ error: "Wallet already exists" });
        }

        // 3. Generate Wallet (V4R2)
        const walletData = await createWallet(); // { mnemonic, address, publicKey }

        // 4. Securely Store Mnemonic in Secret Manager
        const secretId = `wallet-${uid}`;
        await saveSecret(secretId, walletData.mnemonic);

        // 5. Store Address Publicly in Firestore
        await admin.firestore().collection('users').doc(uid).set({
            wallet: {
                address: walletData.address,
                publicKey: walletData.publicKey,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                secretId: secretId // Reference for debugging/audit
            }
        }, { merge: true });

        return res.status(200).json({
            address: walletData.address,
            status: "created"
        });

    } catch (error) {
        console.error("Create Wallet Error:", error);
        if (error.message === 'Unauthorized') return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/wallet/balance/:address
// Proxies to Toncenter API to avoid releasing API Key to frontend
router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // toncenter /jsonRPC - Use POST for stability
        const response = await axios.post(`${tonApiUrl}`, {
            method: 'getAddressBalance',
            params: { address },
            jsonrpc: '2.0'
        });

        if (response.data.ok) {
            // Balance is in nanoton string
            const nanoBalance = response.data.result;
            // Return both for convenience
            return res.status(200).json({
                nano: nanoBalance,
                ton: (parseInt(nanoBalance) / 1e9).toString()
            });
        } else {
            throw new Error(response.data.error || "Toncenter API Error");
        }

    } catch (error) {
        console.error("Get Balance Error:", error);
        return res.status(500).json({ error: "Failed to fetch balance" });
    }
});

// POST /api/wallet/withdraw
// Withdraws fund from user's wallet to external address
router.post('/withdraw', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const { amount, toAddress } = req.body;

        if (!amount || !toAddress) return res.status(400).json({ error: "Missing amount or address" });

        // 1. Get SecretId
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists || !userDoc.data().wallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }
        const secretId = userDoc.data().wallet.secretId;

        // 2. Load Mnemonic
        const { getSecret } = require('../services/secretService');
        const mnemonic = await getSecret(secretId);

        // 3. Transfer
        const { transferTon } = require('../services/tonService');
        const seqno = await transferTon(mnemonic, toAddress, amount);

        return res.status(200).json({ status: "success", seqno });

    } catch (error) {
        console.error("Withdraw Error:", error);
        return res.status(500).json({ error: "Withdraw failed: " + error.message });
    }
});

// POST /api/wallet/deposit
// Generates a payment link (TON Invoice)
router.post('/deposit', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const { amount } = req.body; // TON amount

        if (!amount) return res.status(400).json({ error: "Missing amount" });

        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const address = userDoc.data()?.wallet?.address;

        if (!address) return res.status(404).json({ error: "No wallet address found" });

        // Generate TON deep link
        // ton://transfer/<address>?amount=<nanoton>
        const nanoton = Math.floor(parseFloat(amount) * 1e9);
        const paymentLink = `ton://transfer/${address}?amount=${nanoton}`;

        return res.status(200).json({
            paymentLink,
            address,
            amount,
            qrPayload: paymentLink
        });

    } catch (error) {
        console.error("Deposit Error:", error);
        return res.status(500).json({ error: "Failed to generate deposit" });
    }
});

module.exports = router;
