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

// Helper to update Quick Search Data
const addToQuickData = async (id, title, username) => {
    try {
        const quickRef = admin.firestore().collection('channels').doc('quickData');
        await quickRef.set({
            items: admin.firestore.FieldValue.arrayUnion({
                id: id.toString(),
                title: title || '',
                username: username || ''
            })
        }, { merge: true });
    } catch (e) {
        console.error("Failed to update quickData:", e);
    }
};

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

        // Add to Quick Data for Search
        try {
            const chat = await getChat(channelId);
            await addToQuickData(channelId, chat.title, chat.username);
        } catch (e) {
            console.error("Failed to fetch chat details for quickData update");
        }

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
        const db = admin.firestore();

        // 1. Check if User is Member
        let member;
        try {
            member = await getChatMember(channelId, userId);
        } catch (e) {
            console.error("Purity Check - Member fetch failed:", e.message);
            return res.status(200).json({ success: false, reason: "membership_check_failed" });
        }

        const isMember = ['creator', 'administrator', 'member'].includes(member.status);
        if (!isMember) {
            return res.status(200).json({ success: false, reason: "not_member" });
        }

        const channelRef = db.collection('channels').doc(channelId.toString());

        // Transaction for Atomic Updates
        await db.runTransaction(async (t) => {
            const channelDoc = await t.get(channelRef);
            if (!channelDoc.exists) throw new Error("Channel not found");

            const chData = channelDoc.data();
            const verifiedUserIds = chData.verifiedUserIds || [];

            // 2. Idempotency: Check if already verified
            if (verifiedUserIds.includes(userId.toString())) {
                // Already verified, do nothing
                return;
            }

            // 3. User Validation (Active & Premium)
            // Active: Any member who validates.
            // Premium: Member who has Telegram Premium
            const isPremium = member.user && member.user.is_premium === true;

            // Check if user is "New" for referral purposes (still keeping this per previous request context)
            const userRef = db.collection('users').doc(userId.toString());
            const userDoc = await t.get(userRef);
            let isNewUser = false;

            if (userDoc.exists) {
                const userData = userDoc.data();
                const createdAt = userData.createdAt ? (userData.createdAt.toMillis ? userData.createdAt.toMillis() : Date.parse(userData.createdAt)) : Date.now();
                const now = Date.now();
                if ((now - createdAt) < (5 * 60 * 1000)) {
                    isNewUser = true;
                }
            }

            // 4. Update Channel Stats
            t.update(channelRef, {
                verifiedUserIds: admin.firestore.FieldValue.arrayUnion(userId.toString()),
                activeUsers: admin.firestore.FieldValue.increment(1),
                premiumUsers: isPremium ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0)
            });

            // 5. Handle Referrals
            if (referrerId && referrerId !== userId && isNewUser) {
                const referrerRef = db.collection('users').doc(referrerId.toString());
                const referrerDoc = await t.get(referrerRef);

                if (referrerDoc.exists) {
                    t.update(referrerRef, {
                        referrals: admin.firestore.FieldValue.arrayUnion(userId.toString())
                    });
                    t.update(userRef, {
                        referredBy: referrerId.toString()
                    });
                }
            }
        });

        // Return verified=true. Frontend will start interaction tracking.
        return res.status(200).json({ success: true, verified: true });

    } catch (error) {
        console.error("Purity Check Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/channels/mark-pure
// Called by frontend after user interaction constraints are met (20s, 5 clicks)
router.post('/mark-pure', async (req, res) => {
    const { channelId, userId } = req.body;

    if (!channelId || !userId) return res.status(400).json({ error: "Missing fields" });

    try {
        const db = admin.firestore();
        const channelRef = db.collection('channels').doc(channelId.toString());

        await db.runTransaction(async (t) => {
            const doc = await t.get(channelRef);
            if (!doc.exists) throw new Error("Channel not found");

            const data = doc.data();
            const pureUserIds = data.pureUserIds || [];

            // Idempotency
            if (pureUserIds.includes(userId.toString())) return;

            // Increment Pure Users
            t.update(channelRef, {
                pureUserIds: admin.firestore.FieldValue.arrayUnion(userId.toString()),
                pureUsers: admin.firestore.FieldValue.increment(1)
            });
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Mark Pure Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/channels/calculate-purity
// Calculates score based on pureUsers / activeUsers and premiumUsers / activeUsers
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

        const activeUsers = data.activeUsers || 0;
        const pureUsers = data.pureUsers || 0;
        const premiumUsers = data.premiumUsers || 0;

        // Formulae
        let score = 0;
        let premiumScore = 0;

        if (activeUsers > 0) {
            score = (pureUsers / activeUsers) * 100;
            premiumScore = (premiumUsers / activeUsers) * 100;
        }

        score = parseFloat(Math.min(100, Math.max(0, score)).toFixed(1));
        premiumScore = parseFloat(Math.min(100, Math.max(0, premiumScore)).toFixed(1));

        // Fetch fresh member count for display purposes too
        const { getChatMemberCount } = require('../services/botService');
        let memberCount = data.memberCount || 0;
        try {
            const freshCount = await getChatMemberCount(channelId);
            if (freshCount > 0) memberCount = freshCount;
        } catch (e) { }

        // Update DB
        await channelRef.update({
            purityScore: score,
            premiumScore: premiumScore, // Store premium score
            memberCount: memberCount,
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

        // Add to Quick Data
        try {
            const chat = await getChat(channelId);
            await addToQuickData(channelId, chat.title, chat.username);
        } catch (e) {
            console.error("Failed to fetch chat details for quickData update", e);
        }

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
