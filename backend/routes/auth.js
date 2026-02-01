const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');
const { botToken } = require('../config');
const { createWallet } = require('../services/tonService');
const { saveSecret } = require('../services/secretService');

// POST /api/auth/telegram
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: "Missing initData" });
        }

        // 1. Data Parsing
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get("hash");
        urlParams.delete("hash");
        urlParams.sort();

        let dataCheckString = "";
        for (const [key, value] of urlParams.entries()) {
            dataCheckString += `${key}=${value}\n`;
        }
        dataCheckString = dataCheckString.slice(0, -1);

        // 2. HMCA Signature Validation
        const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
        const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

        if (hash !== calculatedHash) {
            return res.status(403).json({ error: "Invalid hash signature. Auth failed." });
        }

        // 3. Extract User Info
        const userJson = urlParams.get("user");
        const user = JSON.parse(userJson);
        const uid = user.id.toString();

        // 4. Update User in Firestore & Auto-Create Wallet
        const userRef = admin.firestore().collection("users").doc(uid);
        const userSnap = await userRef.get();

        let walletDataToSave = {};

        if (!userSnap.exists || !userSnap.data()?.wallet) {
            console.log(`Creating new wallet for user ${uid}...`);
            // Generate Wallet
            const wallet = await createWallet(); // { mnemonic, address, publicKey }

            // Securely Store Mnemonic
            const secretId = `wallet-${crypto.randomUUID()}`;
            await saveSecret(secretId, wallet.mnemonic);

            walletDataToSave = {
                wallet: {
                    address: wallet.address,
                    publicKey: wallet.publicKey,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    secretId: secretId
                }
            };
        }

        await userRef.set({
            id: user.id,
            authDate: urlParams.get("auth_date"),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            ...walletDataToSave
        }, { merge: true });

        // 5. Mint Custom Token
        const token = await admin.auth().createCustomToken(uid);

        // 6. Return Token AND User Data (so frontend has it immediately)
        // Construct the final user object to return
        const finalUserData = {
            id: user.id,
            authDate: urlParams.get("auth_date"),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(), // This will be a server timestamp object in DB, but for JSON return we might want to approximate or just omit if not needed strictly by FE immediately
            ...walletDataToSave,
            // merge with existing if any, but simplified here:
            ...((userSnap.exists ? userSnap.data() : {})),
            ...walletDataToSave // ensure new wallet overrides if created
        };

        return res.status(200).json({
            token,
            user: finalUserData
        });

    } catch (error) {
        console.error("Auth Error:", error);
        return res.status(500).json({ error: "Internal Auth Error" });
    }
});

// GET /api/auth/me
// Returns current user profile
router.get('/me', async (req, res) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const idToken = req.headers.authorization.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const userRef = admin.firestore().collection('users').doc(uid);
        const doc = await userRef.get();

        let userData = doc.exists ? doc.data() : { id: uid };

        // Auto-Create Wallet if missing (or if user is new/missing)
        if (!userData.wallet) {
            console.log(`Auto-creating wallet for user ${uid} in /me`);
            try {
                // Generate Wallet
                const wallet = await createWallet(); // { mnemonic, address, publicKey }

                // Securely Store Mnemonic
                const secretId = `wallet-${crypto.randomUUID()}`;
                await saveSecret(secretId, wallet.mnemonic);

                const walletData = {
                    wallet: {
                        address: wallet.address,
                        publicKey: wallet.publicKey,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        secretId: secretId
                    }
                };

                // Update/Create Firestore
                // Use set with merge: true to handle both new and existing cases safely
                await userRef.set({
                    ...userData,
                    ...walletData,
                    lastSeen: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Update local variable to return
                userData = { ...userData, ...walletData };
            } catch (err) {
                console.error("Failed to auto-create wallet in /me:", err);
                // Fallback: return user without wallet, but log critical error
            }
        }

        // Hydrate Channels if 'myChannels' exists
        if (userData.myChannels && Array.isArray(userData.myChannels) && userData.myChannels.length > 0) {
            const { getChat, getFileLink } = require('../services/botService');
            try {
                // Fetch details for each channel ID
                const channelPs = userData.myChannels.map(async (cid) => {
                    try {
                        const chat = await getChat(cid);
                        const chDoc = await admin.firestore().collection('channels').doc(cid.toString()).get();
                        const chData = chDoc.exists ? chDoc.data() : {};

                        // Fetch Photo
                        let photoUrl = null;
                        if (chat.photo && chat.photo.small_file_id) {
                            // Use small_file_id for list view (thumbnail)
                            photoUrl = await getFileLink(chat.photo.small_file_id);
                        }

                        // Get FRESH member count
                        let freshMemberCount = 0;
                        try {
                            const { getChatMemberCount } = require('../services/botService');
                            freshMemberCount = await getChatMemberCount(cid);

                            // Async update DB with fresh count (fire and forget)
                            if (freshMemberCount > 0 && freshMemberCount !== chData.memberCount) {
                                admin.firestore().collection('channels').doc(cid.toString()).update({
                                    memberCount: freshMemberCount
                                }).catch(err => console.error("Failed to update fresh member count in DB", err.message));
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch fresh member count for ${cid}`);
                        }

                        // Use fresh count if available, else stored
                        const finalMemberCount = freshMemberCount > 0 ? freshMemberCount : (chData.memberCount || 0);

                        const handle = chat.username ? `@${chat.username}` : "Private";
                        const isPending = chData.status === 'pending_verification';

                        // Convert Firestore timestamp to millis
                        let startTime = null;
                        if (chData.verificationStartTime) {
                            startTime = chData.verificationStartTime.toMillis ? chData.verificationStartTime.toMillis() : Date.parse(chData.verificationStartTime);
                        }

                        return {
                            id: cid,
                            title: chat.title,
                            sub: handle, // Just the handle or 'Private'
                            statusText: isPending ? 'Pending' : 'Verified',
                            status: chData.status || 'unknown',
                            image: photoUrl,
                            // Extended Stats
                            purityScore: chData.purityScore,
                            activityScore: chData.activityScore || 0,
                            pureMembersCount: chData.pureMembersCount || 0,
                            subscribers: chData.memberCount || chData.subscribers || 0, // Prefer memberCount as it is updated by our backend
                            memberCount: chData.memberCount || 0, // Explicitly pass memberCount too
                            startPrice: chData.startPrice || 0, // Include Start Price

                            // Metadata
                            username: chData.username,
                            description: chData.description,

                            startedAt: startTime,
                            messageId: chData.verificationMessageId
                        };
                    } catch (e) {
                        console.error(`Failed to hydrate channel ${cid}`, e.message);
                        return null;
                    }
                });

                const hydratedChannels = (await Promise.all(channelPs)).filter(c => c !== null);
                userData.channels = hydratedChannels; // Map to expected frontend property
            } catch (err) {
                console.error("Channel hydration error:", err);
            }
        }

        // Ensure we don't return 404 even if wallet creation failed but user implies valid auth
        return res.status(200).json(userData);
    } catch (e) {
        console.error("Get Me Error:", e);
        return res.status(401).json({ error: 'Session Invalid' });
    }
});

module.exports = router;
