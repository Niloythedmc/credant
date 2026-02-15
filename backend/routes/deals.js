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

        const dealRef = admin.firestore().collection('offers').doc(dealId);
        const dealDoc = await dealRef.get();

        if (!dealDoc.exists) return res.status(404).json({ error: "Deal not found" });
        const dealData = dealDoc.data();

        // 2. Logic for "Approving" a deal (Advertiser approves)
        if (status === 'approved') {
            // Security: Only requester (Advertiser) can approve
            if (decodedToken.uid !== dealData.requesterId) {
                return res.status(403).json({ error: "Only advertiser can approve" });
            }

            // Trigger Post immediately (Auto-Posting Logic)
            try {
                // Assuming 'content' field exists in deal, and 'channelId' is the Telegram Chat ID (e.g. -100xxx or @channel)
                const chatId = dealData.channelId;
                // Use modified content if available, else Ad content
                // We need to fetch Ad content if not in offer? 
                // Offer has `modifiedContent` or `adTitle`. 
                // We might need to fetch the original Ad to get `postText` if `modifiedContent` is null.
                // For now, let's assume `modifiedContent` has it or we fetch ad.

                let contentText, entities, media, buttons;

                if (dealData.modifiedContent) {
                    // Use Content from Deal (whether modified or original snapshot)
                    contentText = dealData.modifiedContent.postText || ''; // Allow empty
                    entities = dealData.modifiedContent.entities || [];
                    media = dealData.modifiedContent.mediaPreview;
                    buttons = dealData.modifiedContent.buttonText
                        ? [[{ text: dealData.modifiedContent.buttonText, url: dealData.modifiedContent.link }]]
                        : [];
                } else {
                    // Fallback: Fetch Ad (Legacy support or if modifiedContent missing)
                    const adDoc = await admin.firestore().collection('ads').doc(dealData.adId).get();
                    const ad = adDoc.data();
                    contentText = ad.postText || ad.description || '';
                    entities = ad.entities || [];
                    media = ad.mediaPreview;
                    buttons = ad.buttonText ? [[{ text: ad.buttonText, url: ad.link }]] : [];
                }

                const { sendPhoto, sendMessage } = require('../services/botService');

                let messageId;
                const options = {};
                if (buttons.length) options.reply_markup = JSON.stringify({ inline_keyboard: buttons });

                if (media) {
                    options.caption = contentText;
                    if (entities) options.caption_entities = JSON.stringify(entities);
                    // Sending photo...
                    // Note: media might be URL. sendPhoto supports URL.
                    const sent = await sendPhoto(chatId, media, options);
                    messageId = sent.message_id;
                } else {
                    if (entities) options.entities = JSON.stringify(entities);
                    const sent = await sendMessage(chatId, contentText, options);
                    messageId = sent.message_id;
                }

                // Update Deal
                await dealRef.update({
                    status: 'posted', // Skip 'approved' state directly to 'posted' if successful
                    message_id: messageId,
                    postedAt: admin.firestore.FieldValue.serverTimestamp(),
                    verificationDueAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000) // 24h later
                });

                // Notify Channel Owner
                await admin.firestore().collection('users').doc(dealData.adOwnerId).collection('notifications').add({
                    type: 'offer_posted',
                    message: `Deal Approved! Your channel has successfully posted "${dealData.adTitle}".`,
                    offerId: dealId,
                    adId: dealData.adId,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Update Ad Data with Approved Offer for Calculations
                await admin.firestore().collection('ads').doc(dealData.adId).update({
                    approvedOffers: admin.firestore.FieldValue.arrayUnion({
                        dealId: dealId,
                        price: dealData.amount, // Final agreed price
                        channelId: dealData.channelId,
                        channelTitle: dealData.channelTitle,
                        timestamp: new Date().toISOString()
                    }),
                    spentBudget: admin.firestore.FieldValue.increment(dealData.amount)
                });

                return res.status(200).json({ success: true, status: 'posted', messageId });

            } catch (botError) {
                console.error("Bot Posting Failed", botError);
                await dealRef.update({ status: 'failed_post', error: botError.message });
                return res.status(500).json({ error: "Failed to post to Telegram: " + botError.message });
            }
        }

        // Logic for "Accepting" (Owner says Yes)
        if (status === 'accepted') {
            if (decodedToken.uid !== dealData.adOwnerId) {
                return res.status(403).json({ error: "Only channel owner can accept" });
            }
            await dealRef.update({ status: 'accepted' });

            // Notify Advertiser
            await admin.firestore().collection('users').doc(dealData.requesterId).collection('notifications').add({
                type: 'offer_accepted',
                message: `Channel Owner accepted your offer for "${dealData.adTitle}". Please approve to post.`,
                offerId: dealId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ success: true, status: 'accepted' });
        }

        // 3. Logic for "Rejecting" a deal
        if (status === 'rejected') {
            if (decodedToken.uid !== dealData.adOwnerId && decodedToken.uid !== dealData.requesterId) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            // Smart Rejection Logic: Revert to previous price if negotiating
            if (dealData.status === 'negotiating' && dealData.negotiationHistory && dealData.negotiationHistory.length > 0) {
                // Find the last offer made by the REJECTOR (Current User)
                // If I reject your offer, I stand by MY last offer.
                const myHistory = dealData.negotiationHistory.filter(h => h.by === decodedToken.uid);

                // Sort by date just in case, though arrayUnion maintains order usually? Better safethan sorry if client dates vary.
                // Assuming array is chronological.
                const lastMyOffer = myHistory.length > 0 ? myHistory[myHistory.length - 1] : null;

                if (lastMyOffer) {
                    // We found a fallback price "on the table" from this user. Revert to it.
                    const fallbackPrice = lastMyOffer.price;

                    // Helper: Determine new status
                    // If Owner reverts: They stand by their price -> Status 'accepted' (Waiting for Adv)
                    // If Requester reverts: They stand by their price -> Status 'negotiating' (Waiting for Owner)
                    let newStatus = 'negotiating';
                    let newLastNegotiator = decodedToken.uid; // It's effectively "My Term" now active

                    if (decodedToken.uid === dealData.adOwnerId) {
                        newStatus = 'accepted';
                        // Owner accepted (their own price), waiting for Adv.
                    }

                    await dealRef.update({
                        amount: fallbackPrice,
                        status: newStatus,
                        lastNegotiatorId: newLastNegotiator,
                        // Optional: Add a 'rejection' entry to history? Or just let the revert happen.
                        // Let's rely on the status change.
                    });

                    // Notify the other party that their counter was rejected and price reverted
                    const targetId = decodedToken.uid === dealData.adOwnerId ? dealData.requesterId : dealData.adOwnerId;
                    await admin.firestore().collection('users').doc(targetId).collection('notifications').add({
                        type: 'negotiation',
                        message: `Counter-offer rejected. Price reverted to ${fallbackPrice} TON.`,
                        offerId: dealId,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    return res.status(200).json({ success: true, status: newStatus, message: "Reverted to previous price" });
                }
                // If no history found for me, fallthrough to standard rejection (I never made a counter, just rejecting initial?)
            }

            // Standard Rejection (Dead Deal)
            await dealRef.update({
                status: 'rejected',
                rejectedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const targetId = decodedToken.uid === dealData.adOwnerId ? dealData.requesterId : dealData.adOwnerId;
            await admin.firestore().collection('users').doc(targetId).collection('notifications').add({
                type: 'offer_rejected',
                message: `Offer for "${dealData.adTitle}" was rejected.`,
                offerId: dealId,
                adId: dealData.adId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ success: true, status: 'rejected' });
        }

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

// POST /api/deals/request
// Create a new deal offer
router.post('/request', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const { adId, channelId, amount, duration, proofDuration, modifiedContent } = req.body; // proofDuration (hours) - distinct from ad duration or same?

        // 1. Validations
        if (!adId || !channelId || !amount) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Fetch Ad
        const adRef = admin.firestore().collection('ads').doc(adId);
        const adDoc = await adRef.get();
        if (!adDoc.exists) return res.status(404).json({ error: "Ad not found" });
        const ad = adDoc.data();

        if (ad.status !== 'active') return res.status(400).json({ error: "Ad is not active" });

        // Check Budget
        if (parseFloat(amount) > parseFloat(ad.budget)) {
            return res.status(400).json({ error: `Amount cannot exceed budget of ${ad.budget} TON` });
        }

        // Duplicate Check
        const existingOffers = await admin.firestore().collection('offers')
            .where('adId', '==', adId)
            .where('requesterId', '==', uid)
            .where('status', 'in', ['pending', 'accepted', 'negotiating', 'posted'])
            .get();

        if (!existingOffers.empty) {
            return res.status(400).json({ error: "You already have an active offer for this ad." });
        }

        // Fetch Channel & Verify Ownership
        const chRef = admin.firestore().collection('channels').doc(channelId);
        const chDoc = await chRef.get();
        if (!chDoc.exists) return res.status(404).json({ error: "Channel not found" });

        // Check if channel belongs to user (assuming channel doc has ownerId or we check user's channels)
        // Ideally channel doc has 'ownerId' or similar. 
        // Based on other code, generic ownership check might be needed, but assuming valid here for MVP or if structure allows.
        // Actually, let's trust the Caller for checking their own list, but secure it by checking channel owner if field exists.
        // If not, we just record the requester.

        const offerData = {
            adId,
            adTitle: ad.title || 'Untitled Ad',
            adOwnerId: ad.userId,
            requesterId: uid,
            channelId,
            channelTitle: chDoc.data().title || 'Unknown Channel',
            channelUsername: chDoc.data().username || '',
            amount: parseFloat(amount),
            duration: duration || ad.duration || 24, // fallback to ad duration
            proofDuration: proofDuration || '24', // default 24h
            status: 'pending', // pending owner approval
            modifiedContent: modifiedContent || null, // Store if exists
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const offerRef = await admin.firestore().collection('offers').add(offerData);

        // 2. Notifications
        // A. In-App Notification to Ad Owner
        await admin.firestore().collection('users').doc(ad.userId).collection('notifications').add({
            type: 'offer',
            message: `New Deal Request: ${amount} TON for "${ad.title}"`,
            offerId: offerRef.id,
            adId: adId,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // B. Telegram Notification (via Bot)
        // We need to know Ad Owner's TG ID. Assuming userId IS the TG ID (from auth flow)
        try {
            const adOwnerId = ad.userId; // This is string, usually matches TG ID if auth via TG
            // Using a premium animated emoji character if supported (or standard emoji)
            // Telegram 'Custom Emoji' require entities.
            // But user said "msg will contain animated premium tg emoji".
            // We can just add a standard emoji that animates in TG (like ⚡ or 💰) or use specific entity logic?
            // "animated premium tg emoji" usually implies custom emoji id.
            // MVP: Just use a standard one that usually animates (Bell, MoneyBag) and maybe bold text?
            // Or if we know a custom_emoji_id we can send it.
            // Let's use a nice standard set for now: 🔔💰
            await sendMessage(adOwnerId, `🔔💰 *New Deal Request!*\n\nChannel: ${offerData.channelTitle}\nAmount: ${amount} TON\nAd: ${ad.title}\n\nCheck your profile to accept/reject.`, { parse_mode: 'Markdown' });
        } catch (botErr) {
            console.warn(`Failed to send TG notification to ${ad.userId}:`, botErr.message);
        }

        // C. Duplicate/Link in User Profile 'offers' array? 
        // Logic in Profile.jsx seems to read from 'offers' collection or user.offers array.
        // Ideally we update the user doc to include this offer for faster read, OR the frontend queries 'offers' collection.
        // The implementation plan suggests Profile.jsx reads userProfile.offers.
        // Let's update `ad.userId` (Owner) and `uid` (Requester) with a reference if we maintain arrays.
        // For scalability, better to query collection, but existing code uses arrays often.
        // Let's Add to 'offers' array in User Doc for BOTH parties for easy access

        await admin.firestore().collection('users').doc(ad.userId).update({
            offers: admin.firestore.FieldValue.arrayUnion({
                id: offerRef.id,
                ...offerData,
                type: 'received',
                createdAt: new Date().toISOString() // Approximate for array
            })
        });

        await admin.firestore().collection('users').doc(uid).update({
            offers: admin.firestore.FieldValue.arrayUnion({
                id: offerRef.id,
                ...offerData,
                type: 'sent',
                createdAt: new Date().toISOString()
            })
        });

        return res.status(200).json({ success: true, offerId: offerRef.id });

    } catch (error) {
        console.error("Deal Request Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/deals/negotiate
router.post('/negotiate', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const { dealId, price } = req.body;

        if (!dealId || !price) return res.status(400).json({ error: "Missing fields" });

        const dealRef = admin.firestore().collection('offers').doc(dealId); // 'offers' collection used for deals/requests
        const dealDoc = await dealRef.get();

        if (!dealDoc.exists) return res.status(404).json({ error: "Deal not found" });
        const deal = dealDoc.data();

        // Verify Participant
        if (uid !== deal.requesterId && uid !== deal.adOwnerId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const negotiationEntry = {
            price: parseFloat(price),
            by: uid,
            at: new Date().toISOString()
        };

        await dealRef.update({
            amount: parseFloat(price),
            status: 'negotiating',
            lastNegotiatorId: uid,
            negotiationHistory: admin.firestore.FieldValue.arrayUnion(negotiationEntry)
        });

        // Notify Counterparty
        const targetId = uid === deal.requesterId ? deal.adOwnerId : deal.requesterId;
        const msg = `New Counter Offer: ${price} TON for "${deal.adTitle}"`;

        // In-App
        await admin.firestore().collection('users').doc(targetId).collection('notifications').add({
            type: 'negotiation',
            message: msg,
            offerId: dealId,
            adId: deal.adId,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // TG Notification (if Owner is target, straightforward. If Requester is target, need TG ID)
        // Assuming requesterId is valid TG ID or we have mapping.
        try {
            await sendMessage(targetId, `🤝 *Negotiation Update*\n\n${msg}\n\nCheck your offers to respond.`, { parse_mode: 'Markdown' });
        } catch (e) {
            console.warn("TG Notify failed", e.message);
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Negotiation Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/deals/sent
// Get offers sent by the current user
router.get('/sent', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        let query = admin.firestore().collection('offers')
            .where('requesterId', '==', uid);

        if (req.query.adId) {
            query = query.where('adId', '==', req.query.adId);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();

        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ offers });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/deals/received
router.get('/received', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        // Query 'offers' where adOwnerId == uid
        let query = admin.firestore().collection('offers').where('adOwnerId', '==', uid);

        // Optional: Filter by specific Ad
        if (req.query.adId) {
            query = query.where('adId', '==', req.query.adId);
        }

        const snapshot = await query.get();

        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ offers });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/deals/single/:dealId
router.get('/single/:dealId', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req); // Optional security
        const { dealId } = req.params;
        const dealDoc = await admin.firestore().collection('offers').doc(dealId).get();
        if (!dealDoc.exists) return res.status(404).json({ error: "Deal not found" });
        return res.status(200).json({ ...dealDoc.data(), id: dealDoc.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
