const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getChat, getFileLink, getChatMemberCount } = require('../services/botService');
const axios = require('axios');

// GET /api/users/:id/profile
// Fetches public user profile
router.get('/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Missing user ID" });

        const userDoc = await admin.firestore().collection('users').doc(id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        const userData = userDoc.data();

        // Return only public info
        const publicProfile = {
            id: userDoc.id,
            name: userData.displayName || (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'User'),
            username: userData.username,
            photoUrl: userData.photoUrl || userData.photoURL,
            verified: userData.isVerified || false, // Assuming isVerified field exists or will exist
            bio: userData.bio || '',
            // Add other public fields as needed
        };

        return res.json(publicProfile);
    } catch (error) {
        console.error("Get User Profile Error:", error);
        return res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// GET /api/users/resolve/:username
// Resolves a username OR ID to User or Channel
router.get('/resolve/:username', async (req, res) => {
    try {
        const { username } = req.params;
        console.log(`[Resolve] Request for: '${username}'`);

        if (!username) return res.status(400).json({ error: "Missing username" });

        const db = admin.firestore();
        const usersRef = db.collection('users');
        const channelsRef = db.collection('channels');

        // Strategy:
        // 1. Precise match (username as provided)
        // 2. Lowercase match (if provided is not already lower)
        // 3. ID match (if input looks like numeric ID)

        let userDoc = null;
        let userData = null;

        // Check if input is a numeric ID (Telegram ID)
        const isNumericId = /^\d+$/.test(username);

        // ALWAYS try to fetch by ID first (Document ID), because post.userId is passed here
        // and it might be alphanumeric (Auth ID) or numeric (Telegram ID).
        try {
            const potentialUserDoc = await usersRef.doc(username).get();
            if (potentialUserDoc.exists) {
                console.log(`[Resolve] Found user by Doc ID: ${username}`);
                userDoc = potentialUserDoc;
                userData = userDoc.data();
            } else {
                console.log(`[Resolve] No user found by Doc ID: ${username}`);
            }
        } catch (e) {
            console.error(`[Resolve] Error fetching by Doc ID: ${e.message}`);
            // Ignore error if doc ID is invalid format
        }

        // If not found by ID, try username
        if (!userDoc) {
            console.log(`[Resolve] Searching by username field: ${username}`);
            let userSnapshot = await usersRef.where('username', '==', username).limit(1).get();
            if (userSnapshot.empty && username !== username.toLowerCase()) {
                console.log(`[Resolve] Searching by lowercase username: ${username.toLowerCase()}`);
                userSnapshot = await usersRef.where('username', '==', username.toLowerCase()).limit(1).get();
            }

            if (!userSnapshot.empty) {
                console.log(`[Resolve] Found user by username: ${username}`);
                userDoc = userSnapshot.docs[0];
                userData = userDoc.data();
            } else {
                console.log(`[Resolve] No user found by username: ${username}`);
            }
        }

        let dbResponse = null;

        if (userDoc && userData) {
            const calculatedName = userData.displayName || (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'User');

            const responsePayload = {
                type: 'user',
                id: userDoc.id,
                name: calculatedName,
                username: userData.username, // might be undefined if they only have ID
                photoUrl: userData.photoUrl || userData.photoURL,
                bio: userData.bio || '',
                verified: userData.isVerified || false
            };

            // If we have a good name, OR if it's not a numeric ID (so we can't check Telegram by ID), return DB data.
            // Also if we have a username we could check telegram by username? But let's stick to ID for now.
            if (calculatedName !== 'User' || !isNumericId) {
                return res.json(responsePayload);
            }

            console.log(`[Resolve] User found in DB but has default name 'User'. ID is numeric. Attempting Telegram fetch to enrich.`);
            dbResponse = responsePayload;
            // Fall through to try Telegram...
        }

        // Check Channels ONLY if we didn't find a user doc at all (to avoid ambiguity)
        if (!userDoc) {
            console.log(`[Resolve] Checking channels for: ${username}`);

            // 1. Try Channel Document ID first
            try {
                const channelDocById = await channelsRef.doc(username).get();
                if (channelDocById.exists) {
                    console.log(`[Resolve] Found channel by Doc ID: ${username}`);
                    const channelData = channelDocById.data();
                    return res.json({
                        type: 'channel',
                        id: channelDocById.id,
                        name: channelData.title,
                        username: channelData.username,
                        photoUrl: channelData.image || channelData.photoUrl,
                        subscribers: parseInt(channelData.memberCount || channelData.subscribers || 0),
                        verified: channelData.status === 'verified'
                    });
                }
            } catch (e) {
                // Ignore error
            }

            // 2. Try Username
            let channelSnapshot = await channelsRef.where('username', '==', username).limit(1).get();
            if (channelSnapshot.empty && username !== username.toLowerCase()) {
                channelSnapshot = await channelsRef.where('username', '==', username.toLowerCase()).limit(1).get();
            }

            if (!channelSnapshot.empty) {
                console.log(`[Resolve] Found channel: ${username}`);
                const channelDoc = channelSnapshot.docs[0];
                const channelData = channelDoc.data();
                return res.json({
                    type: 'channel',
                    id: channelDoc.id,
                    name: channelData.title,
                    username: channelData.username,
                    photoUrl: channelData.image || channelData.photoUrl,
                    subscribers: parseInt(channelData.memberCount || channelData.subscribers || 0),
                    verified: channelData.status === 'verified'
                });
            }
        }

        // --- FALLBACK: FETCH FROM TELEGRAM ---
        // DISABLED TO PREVENT CRASHES ON INVALID INPUTS (Railway Deployment Fix)
        // If not found in DB, try fetching via Bot API
        console.log(`[Resolve] Entity not found in DB: ${username}`);
        return res.status(404).json({ error: "Entity not found" });

        /* 
        try {
            // ... (rest of the logic commented out)
        } catch (tgFetchError) {
             console.error(`[Resolve] Telegram fetch failed: ${tgFetchError.message}`);
        }
        */

        if (dbResponse) {
            console.log(`[Resolve] Telegram fetch failed or yielded no result. Returning DB fallback.`);
            return res.json(dbResponse);
        }

        console.log(`[Resolve] 404 Not Found for: ${username}`);
        return res.status(404).json({ error: "Entity not found" });

    } catch (error) {
        console.error("Resolve Username Error:", error);
        return res.status(500).json({ error: "Failed to resolve username" });
    }
});

module.exports = router;
