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
    const { channelId, userId, templateId } = req.body;

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
            purityScore: 0,
            verificationMessageId: messageId,
            verificationStartTime: admin.firestore.FieldValue.serverTimestamp(),
            // Store template used?
            templateId: templateId
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

        const previewData = {
            id: chat.id,
            title: chat.title,
            username: chat.username,
            description: chat.description,
            photoUrl: photoUrl,
            memberCount: memberCount,
            type: chat.type,
            checks: checks
        };

        return res.status(200).json(previewData);
    } catch (error) {
        console.error("Channel Preview Error:", error);
        return res.status(404).json({ error: "Channel not found or Bot not accessible" });
    }
});

module.exports = router;
