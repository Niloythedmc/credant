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

// GET /api/inbox
router.get('/', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        const snapshot = await admin.firestore().collection('users').doc(uid).collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return res.status(200).json({ notifications });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/inbox/read
router.post('/read', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        // Mark all as read
        const batch = admin.firestore().batch();
        const snapshot = await admin.firestore().collection('users').doc(uid).collection('notifications')
            .where('read', '==', false)
            .get();

        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
