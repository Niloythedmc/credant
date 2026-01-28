const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { sendMessage } = require('../services/botService');

const verifyAuth = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
};

// POST /api/deals/update
// Secure endpoint to update deal status (Adv -> Approved -> Posted)
router.post('/update', async (req, res) => {
    try {
        // 1. Auth & Input
        const decodedToken = await verifyAuth(req);
        const { dealId, status } = req.body;

        if (!dealId || !status) return res.status(400).json({ error: "Missing fields" });

        const dealRef = admin.firestore().collection('deals').doc(dealId);
        const dealDoc = await dealRef.get();

        if (!dealDoc.exists) return res.status(404).json({ error: "Deal not found" });
        const dealData = dealDoc.data();

        // 2. Logic for "Approving" a deal (Advertiser approves)
        if (status === 'approved') {
            // Security: Only advertiser can approve
            if (decodedToken.uid !== dealData.advertiserId) {
                return res.status(403).json({ error: "Only advertiser can approve" });
            }

            // Trigger Post immediately (Auto-Posting Logic)
            try {
                // Assuming 'content' field exists in deal, and 'channelId' is the Telegram Chat ID (e.g. -100xxx or @channel)
                const chatId = dealData.channelId;
                const messageId = await sendMessage(chatId, dealData.content || "Default Ad Content: " + dealData.id);

                // Update Deal
                await dealRef.update({
                    status: 'posted', // Skip 'approved' state directly to 'posted' if successful
                    message_id: messageId,
                    postedAt: admin.firestore.FieldValue.serverTimestamp(),
                    verificationDueAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000) // 24h later
                });

                return res.status(200).json({ success: true, status: 'posted', messageId });

            } catch (botError) {
                console.error("Bot Posting Failed", botError);
                // Revert/Set status to 'failed_post' so user knows
                await dealRef.update({ status: 'failed_post', error: botError.message });
                return res.status(500).json({ error: "Failed to post to Telegram" });
            }
        }

        // 3. Logic for other transitions (e.g. Funding)
        // ... (For MVP, focusing on the Auto-Posting requirement)

        return res.status(400).json({ error: "Invalid status transition" });

    } catch (error) {
        console.error("Deal Update Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/deals/verify/:dealId
// Endpoint to verify post existence after 24h (Called by Cloud Scheduler ideally)
router.get('/verify/:dealId', async (req, res) => {
    // Note: In production, verify this is called by a trusted service account
    try {
        const { dealId } = req.params;
        const dealRef = admin.firestore().collection('deals').doc(dealId);
        const deal = (await dealRef.get()).data();

        if (deal.status !== 'posted') return res.json({ status: deal.status });

        // Logic: Check if message still exists?
        // Bot API doesn't have a direct "check if functionality", but we can try to forward it or edit it.
        // Or simply assume if posted, it's pending final "completion".

        // For MVP: We 'complete' the deal 
        await dealRef.update({
            status: 'completed',
            fundsReleased: true // Virtual Flag
        });

        // TODO: Trigger actual crypto transfer from Escrow Wallet to Channel Owner using Wallet Service

        return res.status(200).json({ status: 'completed' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// GET /api/deals
// List deals for the current user
router.get('/', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        // Query deals where user is advertiser OR owner
        // Note: Firestore OR queries can be tricky, doing two queries or client-side filtering if small scale.
        // For MVP, just fetching where advertiserId == uid
        const snapshot = await admin.firestore().collection('deals')
            .where('advertiserId', '==', uid)
            .get();

        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ deals });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
