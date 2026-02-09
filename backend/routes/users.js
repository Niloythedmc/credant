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

        if (isNumericId) {
            // Try fetching by ID directly
            const potentialUserDoc = await usersRef.doc(username).get();
            if (potentialUserDoc.exists) {
                userDoc = potentialUserDoc;
                userData = userDoc.data();
            }
        }

        // If not found by ID, try username
        if (!userDoc) {
            let userSnapshot = await usersRef.where('username', '==', username).limit(1).get();
            if (userSnapshot.empty && username !== username.toLowerCase()) {
                userSnapshot = await usersRef.where('username', '==', username.toLowerCase()).limit(1).get();
            }

            if (!userSnapshot.empty) {
                userDoc = userSnapshot.docs[0];
                userData = userDoc.data();
            }
        }

        if (userDoc && userData) {
            return res.json({
                type: 'user',
                id: userDoc.id,
                name: userData.displayName || (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'User'),
                username: userData.username, // might be undefined if they only have ID
                photoUrl: userData.photoUrl || userData.photoURL,
                bio: userData.bio || '',
                verified: userData.isVerified || false
            });
        }

        // Check Channels
        let channelSnapshot = await channelsRef.where('username', '==', username).limit(1).get();
        if (channelSnapshot.empty && username !== username.toLowerCase()) {
            channelSnapshot = await channelsRef.where('username', '==', username.toLowerCase()).limit(1).get();
        }

        if (!channelSnapshot.empty) {
            const channelDoc = channelSnapshot.docs[0];
            const channelData = channelDoc.data();
            return res.json({
                type: 'channel',
                id: channelDoc.id,
                name: channelData.title,
                username: channelData.username,
                photoUrl: channelData.image || channelData.photoUrl,
                subscribers: channelData.memberCount || channelData.subscribers || 0,
                verified: channelData.status === 'verified'
            });
        }

        // --- FALLBACK: FETCH FROM TELEGRAM ---
        // If not found in DB, try fetching via Bot API
        console.log(`[Resolve] Entity not found in DB. Fetching from Telegram: ${username}`);

        try {
            // Determine input for getChat (ID or @username)
            // If it's numeric ID, pass as is (int or string). If username, prepend @.
            const chatInput = isNumericId ? username : (username.startsWith('@') ? username : `@${username}`);

            let chat;
            try {
                chat = await getChat(chatInput);
            } catch (tgErr) {
                console.warn(`[Resolve] getChat failed for ${chatInput}: ${tgErr.message}`);
            }

            // If getChat failed or we want to try scraping for better photo (optional, but consistent with ads.js)
            let photoUrl = null;
            let memberCount = 0;

            if (chat) {
                // Try to get photo
                if (chat.photo && chat.photo.big_file_id) {
                    photoUrl = await getFileLink(chat.photo.big_file_id);
                }

                try {
                    memberCount = await getChatMemberCount(chat.id);
                } catch (e) { }

                // Determine type
                // chat.type can be 'private', 'group', 'supergroup', 'channel'
                const type = chat.type === 'channel' ? 'channel' : 'user'; // simplify 'private' -> 'user'

                return res.json({
                    type: type,
                    id: chat.id,
                    name: chat.title || chat.first_name || chat.username || 'Unknown',
                    username: chat.username,
                    photoUrl: photoUrl,
                    bio: chat.description || chat.bio || '',
                    subscribers: memberCount,
                    verified: false // From Telegram directly we don't know proprietary verified status easily without premium checks, or just default false
                });
            }

            // If getChat failed (e.g. bot hasn't seen user), try SCRAPING as last resort
            // Only works for public usernames, not IDs
            if (!isNumericId) {
                const scrapeUrl = `https://t.me/${username}`;
                const { data: html } = await axios.get(scrapeUrl);

                // Regex Extraction (borrowed from ads.js)
                const getMeta = (prop) => {
                    const regex = new RegExp(`<meta property="${prop}" content="([^"]+)"`);
                    const match = html.match(regex);
                    return match ? match[1] : null;
                };

                const titleRaw = getMeta('og:title') || '';
                const title = titleRaw.replace(/^Telegram: Contact @/, '').replace(/^Telegram: Join Group Chat/, '').trim();
                const description = getMeta('og:description');
                const scrapedPhoto = getMeta('og:image');

                if (title) {
                    return res.json({
                        type: 'user', // Default to user if scraped, or guess?
                        id: null, // Unknown ID
                        name: title,
                        username: username,
                        photoUrl: scrapedPhoto,
                        bio: description,
                        verified: false
                    });
                }
            }

        } catch (tgFetchError) {
            console.error(`[Resolve] Telegram fetch failed: ${tgFetchError.message}`);
        }

        return res.status(404).json({ error: "Entity not found" });

    } catch (error) {
        console.error("Resolve Username Error:", error);
        return res.status(500).json({ error: "Failed to resolve username" });
    }
});

module.exports = router;
