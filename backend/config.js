require('dotenv').config();

let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
        try {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decoded);
            console.log("Service Account loaded from B64 Env Var.");
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_B64:", e);
        }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log("Service Account loaded from Env Var.");
        } catch (parseError) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", parseError);
        }
    } else {
        console.warn("Service Account Key not found (File or Env). Firebase functionality may be limited.");
    }
}

module.exports = {
    serviceAccount,
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    tonApiUrl: "https://toncenter.com/api/v2/jsonRPC",
    // tonApiKey: "...", // Public access
    port: process.env.PORT || 8080
};