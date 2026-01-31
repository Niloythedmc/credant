const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// GET /api/channels
// Public marketplace listing
router.get('/', async (req, res) => {
    try {
        // Query 'channels' collection (verified/top channels)
        // For MVP, if empty, we can return a Seeded "System" set or empty
        const snapshot = await admin.firestore().collection('channels').limit(20).get();

        let channels = [];
        if (snapshot.empty) {
            // OPTIONAL: Auto-seed if empty for demo purposes? 
            // Better to return empty and handle in UI, but user wants "Real Data". 
            // We will manually seed via script later.
        } else {
            channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        return res.status(200).json({ channels });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
