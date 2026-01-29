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
            id: '1',
            jsonrpc: '2.0'
        }, {
            headers: { 'X-API-Key': tonApiKey }
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

module.exports = router;
