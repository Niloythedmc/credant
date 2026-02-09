const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// GET /api/search
// Query: ?q=query_string&type=user|channel|all
router.get('/', async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;
        if (!q || q.length < 2) {
            return res.json({ results: [] });
        }

        const searchTerm = q.toLowerCase();
        let results = [];

        // 1. Search Users (by username or display name)
        // Firestore doesn't support native partial text search easily without third-party services like Algolia/Typesense.
        // For this MVP, we will do a simple prefix search if possible, or fetch a reasonable subset.
        // STARTAt/ENDAt trick works for prefix.

        if (type === 'all' || type === 'user') {
            const usersRef = admin.firestore().collection('users');
            // Try searching by username (most common for @mention)
            const snapshot = await usersRef
                .where('username', '>=', searchTerm)
                .where('username', '<=', searchTerm + '\uf8ff')
                .limit(5)
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                results.push({
                    id: doc.id,
                    type: 'user',
                    title: data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : 'User',
                    username: data.username,
                    photoUrl: data.photoUrl || data.photoURL
                });
            });
        }

        // 2. Search Channels
        if (type === 'all' || type === 'channel') {
            const channelsRef = admin.firestore().collection('channels');
            const snapshot = await channelsRef
                .where('title', '>=', searchTerm) // Case sensitive usually, but assuming stored lowercase or consistent
                // Ideally we should have a 'searchKey' field in lowercase
                .where('title', '<=', searchTerm + '\uf8ff')
                .limit(5)
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                results.push({
                    id: doc.id,
                    type: 'channel',
                    title: data.title,
                    username: data.username, // Channels might have username
                    photoUrl: data.photoUrl
                });
            });
        }

        return res.json({ results });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
