const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');
const { botToken } = require('../config');
const { createWallet } = require('../services/tonService');
const { saveSecret } = require('../services/secretService');

// POST /api/auth/telegram
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: "Missing initData" });
        }

        // 1. Data Parsing
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get("hash");
        urlParams.delete("hash");
        urlParams.sort();

        let dataCheckString = "";
        for (const [key, value] of urlParams.entries()) {
            dataCheckString += `${key}=${value}\n`;
        }
        dataCheckString = dataCheckString.slice(0, -1);

        // 2. HMCA Signature Validation
        const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
        const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

        if (hash !== calculatedHash) {
            return res.status(403).json({ error: "Invalid hash signature. Auth failed." });
        }

        // 3. Extract User Info
        const userJson = urlParams.get("user");
        const user = JSON.parse(userJson);
        const uid = user.id.toString();

        // 4. Update User in Firestore & Auto-Create Wallet
        const userRef = admin.firestore().collection("users").doc(uid);
        const userSnap = await userRef.get();

        let walletDataToSave = {};

        if (!userSnap.exists || !userSnap.data()?.wallet) {
            console.log(`Creating new wallet for user ${uid}...`);
            // Generate Wallet
            const wallet = await createWallet(); // { mnemonic, address, publicKey }

            // Securely Store Mnemonic
            const secretId = `wallet-${uid}`;
            await saveSecret(secretId, wallet.mnemonic);

            walletDataToSave = {
                wallet: {
                    address: wallet.address,
                    publicKey: wallet.publicKey,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    secretId: secretId
                }
            };
        }

        await userRef.set({
            id: user.id,
            authDate: urlParams.get("auth_date"),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            ...walletDataToSave
        }, { merge: true });

        // 5. Mint Custom Token
        const token = await admin.auth().createCustomToken(uid);

        return res.status(200).json({ token });

    } catch (error) {
        console.error("Auth Error:", error);
        return res.status(500).json({ error: "Internal Auth Error" });
    }
});

// GET /api/auth/me
// Returns current user profile
router.get('/me', async (req, res) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const idToken = req.headers.authorization.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const userRef = admin.firestore().collection('users').doc(uid);
        const doc = await userRef.get();

        let userData = doc.exists ? doc.data() : { id: uid };

        // Auto-Create Wallet if missing (or if user is new/missing)
        if (!userData.wallet) {
            console.log(`Auto-creating wallet for user ${uid} in /me`);
            try {
                // Generate Wallet
                const wallet = await createWallet(); // { mnemonic, address, publicKey }

                // Securely Store Mnemonic
                const secretId = `wallet-${uid}`;
                await saveSecret(secretId, wallet.mnemonic);

                const walletData = {
                    wallet: {
                        address: wallet.address,
                        publicKey: wallet.publicKey,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        secretId: secretId
                    }
                };

                // Update/Create Firestore
                // Use set with merge: true to handle both new and existing cases safely
                await userRef.set({
                    ...userData,
                    ...walletData,
                    lastSeen: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Update local variable to return
                userData = { ...userData, ...walletData };
            } catch (err) {
                console.error("Failed to auto-create wallet in /me:", err);
                // Fallback: return user without wallet, but log critical error
            }
        }

        // Ensure we don't return 404 even if wallet creation failed but user implies valid auth
        return res.status(200).json(userData);
    } catch (e) {
        console.error("Get Me Error:", e);
        return res.status(401).json({ error: 'Session Invalid' });
    }
});

module.exports = router;
