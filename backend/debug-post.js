const admin = require('firebase-admin');
const { serviceAccount, botToken } = require('./config');
const TelegramBot = require('node-telegram-bot-api');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkDeals() {
    console.log("Fetching recent deals...");
    try {
        const snapshot = await db.collection('offers')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log("No deals found.");
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\nDeal ID: ${doc.id}`);
            console.log(`Status: ${data.status}`);
            console.log(`Channel: ${data.channelTitle} (${data.channelId})`);
            console.log(`Ad: ${data.adTitle}`);
            console.log(`Amount: ${data.amount}`);
            if (data.error) {
                console.log(`ERROR: ${data.error}`);
            }
            if (data.message_id) {
                console.log(`Message ID: ${data.message_id}`);
            }
            // Check negotiation history length
            if (data.negotiationHistory) {
                console.log(`Negotiation History: ${data.negotiationHistory.length} items`);
            }
        });

    } catch (e) {
        console.error("Error fetching deals:", e);
    }
}

checkDeals();
