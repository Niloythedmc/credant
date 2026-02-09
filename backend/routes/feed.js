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

// GET /api/feed
// Returns paginated posts
router.get('/', async (req, res) => {
    try {
        const { limit = 10, lastId } = req.query;
        let query = admin.firestore().collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit));

        if (lastId) {
            const lastDoc = await admin.firestore().collection('posts').doc(lastId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return res.status(200).json({ posts });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/feed/like
// Toggles like for a post
router.post('/like', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const { postId } = req.body;

        if (!postId) return res.status(400).json({ error: "Missing postId" });

        const postRef = admin.firestore().collection('posts').doc(postId);
        const likeRef = postRef.collection('likes').doc(uid);

        await admin.firestore().runTransaction(async (t) => {
            const likeDoc = await t.get(likeRef);
            if (likeDoc.exists) {
                // Unlike
                t.delete(likeRef);
                t.update(postRef, { likesCount: admin.firestore.FieldValue.increment(-1) });
            } else {
                // Like
                t.set(likeRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
                t.update(postRef, { likesCount: admin.firestore.FieldValue.increment(1) });
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Like Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/feed
// Create a new post
router.post('/', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const { content, mediaUrl } = req.body;

        if (!content && !mediaUrl) {
            return res.status(400).json({ error: "Content or Media is required" });
        }

        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : { username: 'Unknown' };

        // Determine if it mentions anyone (for notification logic later)
        // ...

        const newPost = {
            userId: uid,
            username: userData.username || 'User',
            name: userData.displayName || (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'User'),
            userPhoto: userData.photoUrl || userData.photoURL || null,
            content: content || '',
            mediaUrl: mediaUrl || null,
            likesCount: 0,
            commentsCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'thought' // Distinguish from ads if needed
        };

        const docRef = await admin.firestore().collection('posts').add(newPost);
        return res.status(200).json({ success: true, id: docRef.id });

    } catch (error) {
        console.error("Create Post Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
