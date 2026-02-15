const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkDeal(dealId) {
    console.log(`Checking Deal: ${dealId}`);
    const doc = await db.collection('offers').doc(dealId).get();
    if (!doc.exists) {
        console.log("Deal not found");
        return;
    }
    const data = doc.data();
    console.log("Data:", JSON.stringify(data, null, 2));

    console.log(`\n--- Roles ---`);
    console.log(`Requester (Advertiser): ${data.requesterId}`);
    console.log(`Ad Owner (Channel Owner): ${data.adOwnerId}`);

    console.log(`\n--- Status ---`);
    console.log(`Current Status: ${data.status}`);
    console.log(`Message ID: ${data.message_id}`);
}

checkDeal('5k9OJDItVcwcob6mVfFB'); // ID from logs
