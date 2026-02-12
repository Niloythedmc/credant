const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Middleware to verify Firebase Auth Token
const verifyToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/drafts
// Fetch the latest draft for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const db = admin.firestore();

        // The bot saves drafts using the Telegram User ID, which maps 1:1 to our Firebase UID
        const draftDoc = await db.collection('drafts').doc(userId).get();

        if (!draftDoc.exists) {
            return res.json({ draft: null });
        }

        const draftData = draftDoc.data();

        // Check if draft is stale? (e.g., > 1 hour old)
        // User didn't specify, but let's just return it.
        // Frontend can decide to ignore old drafts if needed.

        // Resolve Photo URL if file_id is present
        let photoUrl = null;
        if (draftData.photoFileId) {
            const { getFileLink } = require('../services/botService');
            // This link expires in 1h, so we fetch it fresh every time
            photoUrl = await getFileLink(draftData.photoFileId);
        }

        return res.json({
            draft: {
                ...draftData,
                photoUrl: photoUrl
            }
        });

    } catch (error) {
        console.error("Fetch Draft Error:", error);
        return res.status(500).json({ error: "Failed to fetch draft" });
    }
});

module.exports = router;
