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

const { sendMessage, getChatMember, getChat, getChatMemberCount, getFileLink, getBotId } = require('../services/botService');

// Templates for verification posts
const POST_TEMPLATES = {
    1: {
        text: "🚀 We are verifying our channel audience quality on Credant.\n\nGiving us a quick boost helps us prove we have real, active members!\n\n👇 Click below to support us (It takes 2 seconds!)",
        btn: "Verify & Boost ⚡"
    },
    2: {
        text: "👋 Hey everyone! We are listing our channel on the Credant Marketplace.\n\nWe need to calculate our 'Purity Score' to show potential advertisers that you guys are the best!\n\nHelp us out by clicking the button below. Thanks! ❤️",
        btn: "Calculate Purity 📊"
    },
    3: {
        text: "🛡️ Official Channel Verification\n\nPlease verify your humanity by clicking the button below. This helps us filter out bots and maintain a high-quality community.\n\nThank you for your cooperation!",
        btn: "I am Human 🤖"
    }
};

// POST /api/channels/verify-post
// Post the verification message to the channel
router.post('/verify-post', async (req, res) => {
    const { channelId, userId, templateId, memberCount } = req.body;

    if (!channelId || !userId || !templateId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const template = POST_TEMPLATES[templateId];
    if (!template) return res.status(400).json({ error: "Invalid template ID" });

    // Construct Deep Link Payload
    // Format: c_{channelId}_r_{userId} (c=channel, r=referrer/owner)
    // We replace -100 prefix for shortness if possible, but safer to keep full ID or encode it.
    // Let's keep it simple: c_12345_r_67890
    // Note: Telegram start parameter allows [A-Za-z0-9_-] and max 64 chars.
    // Channel IDs are negative, so we must replace '-' with something safe like 'n' or just remove it if we assume -100 prefix.
    // Let's replace '-' with 'n'.
    const safeChannelId = channelId.toString().replace('-', 'n');
    const startParam = `c_${safeChannelId}_r_${userId}`;
    // User specified app name is 'verify'
    const deepLink = `https://t.me/CredantBot/verify?startapp=${startParam}`;

    try {
        // Send Message with Inline Button
        const messageId = await sendMessage(channelId, template.text, {
            reply_markup: {
                inline_keyboard: [[
                    { text: template.btn, url: deepLink }
                ]]
            }
        });

        // Save Channel State to Firestore
        const channelRef = admin.firestore().collection('channels').doc(channelId.toString());
        const channelData = {
            channelId: channelId,
            ownerId: userId,
            status: 'pending_verification',
            purityScore: null,
            verifiedCount: 0,
            verificationMessageId: messageId,
            verificationStartTime: admin.firestore.FieldValue.serverTimestamp(),
            // Store template used?
            templateId: templateId,
            memberCount: memberCount || 0
            // Store initial memberCount if we have it? 
            // We don't have it in req.body. 
            // Optimistically we will fetch it on calculation.
            // But we can try to fetch it here too if fast.
            // (Skipping for speed, calculate-purity will handle it)
        };
        await channelRef.set(channelData, { merge: true });

        // Update User's 'channels' array - STORE ONLY ID
        const userRef = admin.firestore().collection('users').doc(userId);

        await userRef.update({
            myChannels: admin.firestore.FieldValue.arrayUnion(channelId.toString())
        });

        return res.status(200).json({ success: true, messageId });
    } catch (error) {
        console.error("Verification Post Error:", error);
        // Return specific error for debugging
        return res.status(500).json({ error: `Failed to post message: ${error.message}` });
    }
});

// POST /api/channels/preview
// Fetch channel info from Telegram
router.post('/preview', async (req, res) => {
    // We expect { username, userId }
    // userId is needed to verify if the requestor is admin
    const { username, userId } = req.body;

    if (!username) return res.status(400).json({ error: "Username is required" });

    // Ensure username starts with @ if it's not a number (though getChat handles both usually, explicit is safely)
    const target = username.startsWith('@') || !isNaN(username) ? username : `@${username}`;

    try {
        const chat = await getChat(target);
        const { getChatMember, getBotId } = require('../services/botService');
        const botId = getBotId();

        // 1. Get Bot Status
        let botMember;
        try {
            botMember = await getChatMember(chat.id, botId);
        } catch (e) {
            // If bot can't get itself, it's likely not in the chat at all
            botMember = { status: 'left' };
        }

        // 2. Get User Status (if userId provided)
        let userMember = { status: 'unknown' };
        if (userId) {
            try {
                userMember = await getChatMember(chat.id, userId);
            } catch (e) {
                userMember = { status: 'left' };
            }
        }

        const memberCount = await getChatMemberCount(chat.id);

        let photoUrl = null;
        if (chat.photo && chat.photo.big_file_id) {
            photoUrl = await getFileLink(chat.photo.big_file_id);
        }

        // Verification Logic
        const isBotAdmin = botMember.status === 'administrator';
        // Check for specific rights if needed (can_post_messages, etc.)
        // Telegram Bot API 'ChatMemberAdministrator' object has these fields.
        const canPost = botMember.can_post_messages === true;

        const isUserAdmin = ['creator', 'administrator'].includes(userMember.status);

        const checks = {
            botIsAdmin: isBotAdmin,
            botCanPost: canPost,
            userIsAdmin: isUserAdmin,
            userInChat: userMember.status !== 'left' && userMember.status !== 'kicked'
        };

        // Check if already listed in Firestore
        const channelDoc = await admin.firestore().collection('channels').doc(chat.id.toString()).get();
        const isListed = channelDoc.exists;

        const previewData = {
            id: chat.id,
            title: chat.title,
            username: chat.username,
            description: chat.description,
            photoUrl: photoUrl,
            memberCount: memberCount,
            type: chat.type,
            checks: checks,
            isListed: isListed // Flag for frontend
        };

        return res.status(200).json(previewData);
    } catch (error) {
        console.error("Channel Preview Error:", error);
        return res.status(404).json({ error: "Channel not found or Bot not accessible" });
    }
});

// POST /api/channels/check-purity
// Called when a user enters via a deep link
router.post('/check-purity', async (req, res) => {
    const { channelId, userId, referrerId } = req.body;

    if (!channelId || !userId) {
        return res.status(400).json({ error: "Missing channelId or userId" });
    }

    try {
        const { getChatMember } = require('../services/botService');

        // 1. Verify Membership
        let member;
        try {
            member = await getChatMember(channelId, userId);
        } catch (e) {
            console.error("Purity Check - Member fetch failed:", e.message);
            // If we can't fetch, we assume not a member or bot blocked
            return res.status(200).json({ success: false, reason: "membership_check_failed" });
        }

        const isMember = ['creator', 'administrator', 'member'].includes(member.status);
        if (!isMember) {
            return res.status(200).json({ success: false, reason: "not_member" });
        }

        // 2. Check for Duplicate Verification (Idempotency)
        // We store verification records in a subcollection
        const verificationRef = admin.firestore()
            .collection('channels')
            .doc(channelId.toString())
            .collection('verifications')
            .doc(userId.toString());

        const doc = await verificationRef.get();
        if (doc.exists) {
            // Already counted
            return res.status(200).json({ success: true, alreadyVerified: true });
        }

        // 3. Update Stats (Atomic Increment)
        const channelRef = admin.firestore().collection('channels').doc(channelId.toString());
        await admin.firestore().runTransaction(async (t) => {
            t.set(verificationRef, {
                userId,
                referrerId: referrerId || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: member.status
            });

            // Increment Verified Count (NOT Purity Score yet)
            // User requested: "Whenever user enters... don't edit the purity score"
            // We track 'verifiedCount' as the raw number of real humans found.
            t.update(channelRef, {
                verifiedCount: admin.firestore.FieldValue.increment(1)
            });

            // 4. Update Referrer Stats if exists
            // 4. Update Referrer Stats if exists - ONLY IF USER IS NEW (e.g. created < 5 min ago)
            if (referrerId && referrerId !== userId) {
                // Fetch user to check creation time
                const userDoc = await admin.firestore().collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const createdAt = userData.createdAt; // Firestore Timestamp

                    // Check if created recently (e.g. within last 1 hour to allow for some delay)
                    // If no createdAt (old user), skip.
                    if (createdAt) {
                        const createdTime = createdAt.toMillis ? createdAt.toMillis() : Date.parse(createdAt);
                        const now = Date.now();
                        const isNew = (now - createdTime) < (60 * 60 * 1000); // 1 hour threshold

                        if (isNew) {
                            const referrerRef = admin.firestore().collection('users').doc(referrerId.toString());
                            t.update(referrerRef, {
                                referralCount: admin.firestore.FieldValue.increment(1),
                                lastReferral: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
            }
        });

        return res.status(200).json({ success: true, verified: true });

    } catch (error) {
        console.error("Purity Check Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/channels/calculate-purity
// Calculates score based on verifiedCount / memberCount
router.post('/calculate-purity', async (req, res) => {
    const { channelId, userId } = req.body;

    if (!channelId || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const channelRef = admin.firestore().collection('channels').doc(channelId.toString());
        const doc = await channelRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Channel not found" });
        }

        const data = doc.data();

        // Use verifiedCount (real users) and memberCount (from initial preview or update)
        // If memberCount is missing in DB, we might need to fetch it again or default to verifiedCount (100%)
        // BUT memberCount is not saved in verify-post. We should save it.
        // For now, let's fetch fresh member count to be accurate.

        const { getChatMemberCount } = require('../services/botService');
        let memberCount = data.memberCount || 0;

        try {
            // Try to get fresh count
            const freshCount = await getChatMemberCount(channelId);
            if (freshCount > 0) memberCount = freshCount;
        } catch (e) {
            console.log("Failed to fetch fresh member count, using stored or 0");
        }

        if (memberCount === 0) {
            // Avoid division by zero
            return res.status(200).json({ success: true, purityScore: 0 });
        }

        const verifiedCount = data.verifiedCount || 0;

        // Calculation: (Verified / Members) * 100
        let score = (verifiedCount / memberCount) * 100;
        score = Math.min(100, Math.max(0, score)); // Clamp 0-100
        score = parseFloat(score.toFixed(1)); // 1 decimal

        // Update DB
        await channelRef.update({
            purityScore: score,
            memberCount: memberCount, // Save latest count
            lastCalculatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, purityScore: score });

    } catch (error) {
        console.error("Calculate Purity Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/channels/list-later
// Adds channel to DB without posting verification message
router.post('/list-later', async (req, res) => {
    const { channelId, userId, memberCount } = req.body;

    if (!channelId || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const channelRef = admin.firestore().collection('channels').doc(channelId.toString());

        // Check if exists to avoid overwrite? 
        // We assume frontend did preview check, but safe to use merge.

        const channelData = {
            channelId: channelId,
            ownerId: userId,
            status: 'listed', // Distinct from 'pending_verification'
            purityScore: null, // N/A until calculated
            memberCount: memberCount || 0,
            verifiedCount: 0,
            verificationStartTime: null, // Not started
            verificationMessageId: null
        };

        await channelRef.set(channelData, { merge: true });

        // Update User
        const userRef = admin.firestore().collection('users').doc(userId);
        await userRef.update({
            myChannels: admin.firestore.FieldValue.arrayUnion(channelId.toString())
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("List Later Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// DELETE /api/channels/:channelId
router.delete('/:channelId', async (req, res) => {
    const { channelId } = req.params;
    const { userId } = req.body; // or req.query if passed differently, but axios delete uses data

    if (!channelId || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const channelRef = admin.firestore().collection('channels').doc(channelId.toString());
        const doc = await channelRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Channel not found" });
        }

        const data = doc.data();
        if (data.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Delete from Channels collection
        await channelRef.delete();

        // Remove from User's myChannels
        const userRef = admin.firestore().collection('users').doc(userId.toString());
        await userRef.update({
            myChannels: admin.firestore.FieldValue.arrayRemove(channelId.toString())
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete Channel Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
