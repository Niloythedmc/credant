const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const verifyAuth = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
};

// GET /api/insights
// Returns analytics for the logged-in user's channel/account
router.get('/', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        // Fetch user specific stats from 'user_stats' or 'users' collection
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const userData = userDoc.data() || {};

        const stats = {
            subscribers: userData.subscribers || 0,
            growth: userData.growth || 0, // e.g. 12.5
            chartData: userData.chartData || [10, 20, 15, 30, 25, 40], // fallback
            demographics: userData.demographics || { male: 50, female: 40, other: 10 },
            topCountries: userData.topCountries || [],
            trustScore: userData.trustScore || 85
        };

        return res.status(200).json({ stats });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
