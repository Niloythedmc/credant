const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');
const { botToken } = require('../config');

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
        const uid = `telegram:${user.id}`;

        // 4. Update User in Firestore
        await admin.firestore().collection("users").doc(uid).set({
            id: user.id,
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            username: user.username || "",
            photoUrl: user.photo_url || "",
            authDate: urlParams.get("auth_date"),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 5. Mint Custom Token
        const token = await admin.auth().createCustomToken(uid);

        return res.status(200).json({ token });

    } catch (error) {
        console.error("Auth Error:", error);
        return res.status(500).json({ error: "Internal Auth Error" });
    }
});

module.exports = router;
