const admin = require('firebase-admin');
// const { SecretManagerServiceClient } = require('@google-cloud/secret-manager'); 
// (Secret Manager disabled to avoid billing/configuration friction)

const saveSecret = async (secretId, payload) => {
    try {
        // Store in a dedicated collection 'secrets'
        // WARNING: In production, ensure Firestore rules deny read access to this collection 
        // from client SDKs. Only Admin SDK (backend) should access it.
        await admin.firestore().collection('secrets').doc(secretId).set({
            value: payload,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return secretId;
    } catch (error) {
        console.error("Firestore Secret Save Error:", error);
        throw error;
    }
};

const getSecret = async (secretId) => {
    try {
        const doc = await admin.firestore().collection('secrets').doc(secretId).get();
        if (!doc.exists) {
            throw new Error(`Secret ${secretId} not found`);
        }
        return doc.data().value;
    } catch (error) {
        console.error("Firestore Secret Get Error:", error);
        throw error;
    }
}

module.exports = { saveSecret, getSecret };
