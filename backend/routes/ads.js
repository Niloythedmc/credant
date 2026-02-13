const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getChat, getFileLink, getChatMemberCount } = require('../services/botService'); // Import bot services

// ... existing code ...

// POST /api/ads/resolve-link
router.post('/resolve-link', async (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Link is required" });

    console.log(`[Resolve Link] Request for: ${link}`);

    try {
        // 1. Check if it's a specific POST link (t.me/username/123)
        const postMatch = link.match(/(?:t\.me\/|telegram\.me\/)([\w_]{5,})\/([0-9]+)/);

        if (postMatch) {
            const username = postMatch[1];
            const postId = postMatch[2];
            console.log(`[Resolve Link] Detected Post: @${username}/${postId}`);

            try {
                const scrapeUrl = `https://t.me/${username}/${postId}?embed=1`;
                const { data: html } = await require('axios').get(scrapeUrl);

                // Helper to extract meta content
                const getMeta = (prop) => {
                    const regex = new RegExp(`<meta property="${prop}" content="([^"]+)"`);
                    const match = html.match(regex);
                    return match ? match[1] : null;
                };

                // Helper to extract content inside specific classes (simple regex)
                const getClassContent = (className) => {
                    const regex = new RegExp(`class="${className}"[^>]*>([^<]+)<`);
                    const match = html.match(regex);
                    return match ? match[1] : null;
                };

                // Extract Data
                const channelTitle = getMeta('og:title') || username;

                // Text often in ".tgme_widget_message_text"
                let text = "";
                let entities = [];
                const textMatch = html.match(/class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);

                if (textMatch) {
                    let rawHtml = textMatch[1].replace(/<br\s*\/?>/g, "\n");
                    // Simple HTML Entity Decode Helper
                    const decodeHtml = (str) => {
                        return str.replace(/&nbsp;/g, " ")
                            .replace(/&amp;/g, "&")
                            .replace(/&lt;/g, "<")
                            .replace(/&gt;/g, ">")
                            .replace(/&quot;/g, '"')
                            .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec)) // Numeric
                            .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16))); // Hex
                    };

                    const emojiRegex = /<tg-emoji\s+emoji-id="(\d+)"[^>]*>(.*?)<\/tg-emoji>/g;
                    let match;
                    let lastIndex = 0;
                    let builtText = "";

                    while ((match = emojiRegex.exec(rawHtml)) !== null) {
                        // Text before emoji
                        const before = rawHtml.substring(lastIndex, match.index);
                        const cleanBefore = decodeHtml(before.replace(/<[^>]+>/g, ""));
                        builtText += cleanBefore;

                        // Emoji Info
                        const emojiId = match[1];
                        const innerContent = match[2];
                        let fallback = decodeHtml(innerContent.replace(/<[^>]+>/g, "")).trim();
                        if (!fallback || fallback.length === 0) fallback = "⭐"; // Default char if missing

                        const offset = builtText.length;
                        const length = fallback.length;

                        builtText += fallback;

                        entities.push({
                            type: 'custom_emoji',
                            offset,
                            length,
                            custom_emoji_id: emojiId
                        });

                        lastIndex = match.index + match[0].length;
                    }

                    // Remaining text
                    const remain = rawHtml.substring(lastIndex);
                    const cleanRemain = decodeHtml(remain.replace(/<[^>]+>/g, ""));
                    builtText += cleanRemain;

                    text = builtText;

                } else {
                    // Fallback to description if widget text not found
                    text = getMeta('og:description') || "";
                }

                // 1. Channel/Author Photo
                let channelPhotoUrl = null;
                // Match src with single or double quotes
                const authorPhotoMatch = html.match(/class="tgme_widget_message_user_photo"[^>]*src=["']([^"']+)["']/);
                if (authorPhotoMatch) {
                    channelPhotoUrl = authorPhotoMatch[1];
                }

                // 2. Post Media (Image/Video) - Strict Check
                // Only if actual media element exists
                let photoUrl = null;
                const hasMedia = html.match(/class="[^"]*tgme_widget_message_(photo|video)[^"]*"/);

                if (hasMedia) {
                    photoUrl = getMeta('og:image');
                    // Check for video thumb if og:image is default or missing
                    if (!photoUrl || photoUrl.includes('telegram.org/img/t_logo.png')) {
                        const styleMatch = html.match(/background-image:url\('([^']+)'\)/);
                        if (styleMatch) photoUrl = styleMatch[1];
                    }
                }

                // Views
                const viewsMatch = html.match(/class="tgme_widget_message_views"[^>]*>([^<]+)/);
                const views = viewsMatch ? viewsMatch[1] : "0";

                console.log(`[Resolve Link] Post Scraped: ${username}/${postId} - ${views} views. Entities: ${entities.length}`);

                return res.json({
                    id: null,
                    title: channelTitle,
                    username: username,
                    description: `Post from ${username}`,
                    channelPhotoUrl: channelPhotoUrl, // Send channel icon
                    photoUrl: photoUrl, // Send post media (or null)
                    type: 'post',
                    isPost: true,
                    postId: postId,
                    views: views,
                    text: text || "",
                    text: text || "",
                    entities: entities,
                    isBotMember: await checkBotMembership(`@${username}`) // Check if bot is in the channel
                });

            } catch (postErr) {
                console.error(`[Resolve Link] Post scrape failed:`, postErr.message);
                // Fallback to channel resolution if post fails?
                // No, distinct intent.
                return res.status(404).json({ error: "Could not fetch post details." });
            }
        }

        // 2. Normal Channel/User Resolution (Existing Logic)
        const match = link.match(/(?:t\.me\/|telegram\.me\/|@)([\w_]{5,})/);

        if (!match) {
            console.log(`[Resolve Link] Regex failed for: ${link}`);
            return res.status(400).json({ error: "Invalid Telegram link or username" });
        }

        const username = match[1];
        console.log(`[Resolve Link] Extracted username: ${username}`);

        // ... existing getChat logic ...
        let chat;
        try {
            chat = await getChat(`@${username}`);
        } catch (e) {
            console.warn(`[Resolve Link] getChat failed for @${username}. Trying fallback scrape...`);
        }

        if (chat) {
            let photoUrl = null;
            let memberCount = 0;

            // 1. Try to get STABLE photo from scraping t.me (CDN Link)
            try {
                const scrapeUrl = `https://t.me/${username}`;
                const { data: html } = await require('axios').get(scrapeUrl);
                const regex = new RegExp(`<meta property="og:image" content="([^"]+)"`);
                const match = html.match(regex);
                if (match && match[1]) {
                    photoUrl = match[1];
                }
            } catch (scrapeErr) { }

            // 2. Fallback to API Link
            if (!photoUrl && chat.photo && chat.photo.big_file_id) {
                photoUrl = await getFileLink(chat.photo.big_file_id);
            }

            try {
                memberCount = await getChatMemberCount(chat.id);
            } catch (e) { }

            // Check Bot Membership
            const isBotMember = await checkBotMembership(chat.id);

            return res.json({
                id: chat.id,
                title: chat.title || chat.first_name,
                username: chat.username,
                description: chat.description || chat.bio,
                photoUrl,
                type: chat.type,
                memberCount,
                isBotMember
            });
        }

        // FALLBACK: Scrape t.me/username
        try {
            const scrapeUrl = `https://t.me/${username}`;
            const { data: html } = await require('axios').get(scrapeUrl);

            const getMeta = (prop) => {
                const regex = new RegExp(`<meta property="${prop}" content="([^"]+)"`);
                const match = html.match(regex);
                return match ? match[1] : null;
            };

            const titleRaw = getMeta('og:title') || '';
            const title = titleRaw.replace(/^Telegram: Contact @/, '').replace(/^Telegram: Join Group Chat/, '').trim();
            const description = getMeta('og:description');
            const photoUrl = getMeta('og:image');

            if (!title) throw new Error("No title found in scrape");

            // We can't check membership via scrape easily without ID, 
            // but usually scrape is only for public entities where we might not have bot in it anyway.
            // We assume false for scraped fallback unless we can get ID?
            // Actually scrape sometimes reveals ID in deeper inspection, but let's default false.

            return res.json({
                id: null,
                title: title,
                username: username,
                description: description,
                photoUrl: photoUrl,
                type: 'bot_or_user',
                memberCount: 0,
                isBotMember: false // Fallback assumption
            });

        } catch (scrapeError) {
            console.error("[Resolve Link] Scrape failed:", scrapeError.message);
            return res.status(404).json({ error: "Channel/Bot not found." });
        }

    } catch (error) {
        console.error("[Resolve Link] Error:", error.message);
        return res.status(500).json({ error: "Could not resolve link: " + error.message });
    }
});

// Helper to safely check bot membership
const checkBotMembership = async (chatId) => {
    try {
        const { getBotId, getChatMember } = require('../services/botService');
        const botId = getBotId();
        const member = await getChatMember(chatId, botId);
        return ['administrator', 'member', 'restricted'].includes(member.status);
    } catch (e) {
        return false;
    }
}
const { getSecret, saveSecret } = require('../services/secretService');
const { transferTon, createWallet, getBalance } = require('../services/tonService'); // Import getBalance from updated service

// Platform/Escrow Wallet Address (Where fees eventually go)
const PLATFORM_WALLET_ADDRESS = 'UQAw9i_A6CvyXjGTWVwuJxZz_MgnxLTMUlxzCRxVi3IQv9jD';

// Helper to verify auth
const verifyAuth = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
};

// Background Poller: Checks Escrow Balance and Sends Fee
const monitorAndDeductFee = async (escrowAddress, escrowMnemonic, platformFeeAmount, maxRetries = 24) => {
    // Poll every 5 seconds for 2 minutes (24 * 5 = 120s)
    let attempts = 0;
    const feeStr = platformFeeAmount.toFixed(9);

    console.log(`[FeeMonitor] Starting monitor for ${escrowAddress}. Target Fee: ${feeStr} TON`);

    const checkLoop = setInterval(async () => {
        attempts++;
        try {
            const balanceBigInt = await getBalance(escrowAddress);
            const balanceTon = Number(balanceBigInt) / 1e9;

            console.log(`[FeeMonitor] ${escrowAddress} Balance: ${balanceTon} TON (Attempt ${attempts}/${maxRetries})`);

            // Check if we have enough funds (Fee + minimal gas ~0.05)
            // Just checking if balance >= fee isn't enough, we need gas. 
            // Current budget logic: Cost = Budget + 5%. 
            // So Balance should be >= Budget + 5%.
            // We want to extract only the 5% Fee.

            if (balanceTon >= platformFeeAmount) {
                console.log(`[FeeMonitor] Funds detected! Sending ${feeStr} TON fee to Platform...`);
                clearInterval(checkLoop);

                try {
                    await transferTon(escrowMnemonic, PLATFORM_WALLET_ADDRESS, feeStr);
                    console.log(`[FeeMonitor] Fee deduction success!`);
                } catch (err) {
                    console.error(`[FeeMonitor] Failed to send fee:`, err);
                }
            } else if (attempts >= maxRetries) {
                console.log(`[FeeMonitor] Timeout waiting for funds.`);
                clearInterval(checkLoop);
            }
        } catch (err) {
            console.error(`[FeeMonitor] Error checking balance:`, err);
        }
    }, 5000);
};


router.post('/create-contract', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;
        const payload = req.body;

        // 1. Calculate Cost
        const budget = parseFloat(payload.budget);
        const duration = parseInt(payload.duration);
        if (isNaN(budget) || isNaN(duration)) {
            return res.status(400).json({ error: "Invalid budget or duration" });
        }

        // Fee Calculation Logic
        // Budget = 0.1
        // Platform Fee = 5% of Budget = 0.005
        // Total User Pays = Budget + Fee = 0.105

        const platformFee = (budget * 0.05);
        // Note: User says "sum of 105%... extract 5% means the 0.005".
        // If Budget is 100, Total is 105. Fee is 5. Correct.

        const totalCost = (budget * duration * 1.05); // Total amount to fund
        const totalFee = (budget * duration * 0.05); // Total Fee to extract

        const amountStr = totalCost.toFixed(9);

        // 2. Get User Wallet
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists || !userDoc.data().wallet) {
            return res.status(400).json({ error: "No inner wallet found" });
        }
        const userSecretId = userDoc.data().wallet.secretId;

        // 3. Generate Escrow
        const escrowWallet = await createWallet();
        const escrowSecretId = `escrow-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await saveSecret(escrowSecretId, escrowWallet.mnemonic);

        // 4. Fund Escrow (User -> Escrow)
        const userMnemonic = await getSecret(userSecretId);
        console.log(`Funding Escrow ${escrowWallet.address} with ${amountStr} TON`);

        // Background: Start monitoring for funds to deduct fee
        // We pass the mnemonic so it can sign the transfer once funds arrive
        monitorAndDeductFee(escrowWallet.address, escrowWallet.mnemonic, totalFee);

        let seqno;
        try {
            seqno = await transferTon(userMnemonic, escrowWallet.address, amountStr);
        } catch (txError) {
            console.error("Funding failed:", txError);
            return res.status(500).json({ error: "Funding transaction failed: " + txError.message });
        }

        // 5. Create Ad Record
        const adData = {
            ...payload,
            userId: uid,
            status: 'active',
            contractAddress: escrowWallet.address,
            budget: budget,
            duration: duration,
            platformFee: totalFee,
            escrowSecretId: escrowSecretId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            payment: {
                amount: totalCost,
                txSeqno: seqno,
                method: 'inner_wallet',
                timestamp: Date.now()
            }
        };

        const adRef = await admin.firestore().collection('ads').add(adData);
        await admin.firestore().collection('users').doc(uid).update({
            ads: admin.firestore.FieldValue.arrayUnion({
                id: adRef.id,
                title: payload.title,
                description: payload.description, // Added for UI
                status: 'active',
                budget: payload.budget,
                duration: duration, // Added for UI
                subject: payload.subject, // Added for UI
                mediaPreview: payload.mediaPreview, // Added for UI Consistency
                currency: 'TON'
            })
        });

        return res.status(200).json({
            success: true,
            contractAddress: escrowWallet.address,
            adId: adRef.id,
            totalCost
        });

    } catch (error) {
        console.error("Create Contract Error:", error);
        if (error.message === 'Unauthorized') return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: "Internal Error: " + error.message });
    }
});

router.post('/confirm-contract', async (req, res) => {
    return res.status(200).json({ success: true });
});

// POST /api/ads/send-preview
router.post('/send-preview', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid; // Maps to Telegram User ID
        const { method, text, entities, media, buttons, link } = req.body;

        console.log(`[Preview] Sending preview to ${uid} via ${method}`);

        const { sendMessage, sendPhoto, forwardMessage } = require('../services/botService');

        if (method === 'forward') {
            // Extract channel and msg id from link
            // Link formats: t.me/c/123123/123 or t.me/username/123
            let match = link.match(/(?:t\.me\/|telegram\.me\/)([\w_]{5,})\/([0-9]+)/);
            if (!match) {
                return res.status(400).json({ error: "Invalid link format for preview. Use public post link." });
            }

            const username = match[1];
            const postId = match[2];
            const fromChatId = `@${username}`;

            try {
                await forwardMessage(uid, fromChatId, parseInt(postId));
                return res.json({ success: true });
            } catch (fwdErr) {
                console.warn("[Preview] Forward failed:", fwdErr.message);
                // User requested NO fallback to text/image if forward fails.
                return res.status(400).json({ error: "Could not forward post. Ensure the channel is public and the bot is not blocked." });
            }
        }

        // Method 'new'
        // Construct Message
        const options = {};

        // IMPORTANT: node-telegram-bot-api Requires entities to be stringified JSON for some methods/versions
        // especially when mixed with other options or depending on underlying request construction

        if (buttons && buttons.length > 0) {
            options.reply_markup = JSON.stringify({ inline_keyboard: buttons });
        }

        if (media) {
            // Media can be file_id (best) or URL
            options.caption = text || "";
            if (entities) {
                options.caption_entities = JSON.stringify(entities);
            }

            await sendPhoto(uid, media, options);
        } else {
            // Text only
            if (entities) {
                options.entities = JSON.stringify(entities);
            }
            await sendMessage(uid, text || "Preview", options);
        }

        return res.json({ success: true });

    } catch (error) {
        console.error("Send Preview Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/ads/my-ads
router.get('/my-ads', async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const uid = decodedToken.uid;

        const snapshot = await admin.firestore().collection('ads')
            .where('userId', '==', uid)
            // .orderBy('createdAt', 'desc') // Removed to avoid Index Error
            .get();

        const ads = [];
        snapshot.forEach(doc => {
            ads.push({ id: doc.id, ...doc.data() });
        });

        // Manual Sort (Desc Date)
        ads.sort((a, b) => {
            const tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA;
        });

        return res.status(200).json(ads);
    } catch (error) {
        if (error.message === 'Unauthorized') return res.status(401).json({ error: "Unauthorized" });
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/ads/:id (Public - Single Ad Details)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await admin.firestore().collection('ads').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Ad not found" });
        }

        return res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error("Fetch Ad Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// GET /api/ads (Public - All Active Ads)
router.get('/', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('ads')
            .where('status', '==', 'active')
            // .orderBy('createdAt', 'desc') // Ensure index exists if using this
            .get();

        const ads = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Optional: Filter out sensitive data if needed, but for now budget/title is fine
            ads.push({ id: doc.id, ...data });
        });

        // Manual Sort (Desc Date)
        ads.sort((a, b) => {
            const tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA;
        });

        return res.status(200).json(ads);
    } catch (error) {
        console.error("Fetch Ads Error:", error);
        return res.status(500).json({ error: error.message });
    }
});


module.exports = router;
