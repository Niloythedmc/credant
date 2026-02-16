require('dotenv').config();
const { botInstance } = require('../services/botService');

const WEBHOOK_URL = "https://credant-production.up.railway.app/api/telegram-webhook";

async function setWebhook() {
    try {
        console.log(`Setting webhook to: ${WEBHOOK_URL}`);
        const result = await botInstance.setWebHook(WEBHOOK_URL);
        console.log("Set Webhook Result:", result);

        const info = await botInstance.getWebHookInfo();
        console.log("New Webhook Info:", JSON.stringify(info, null, 2));
    } catch (error) {
        console.error("Error setting webhook:", error);
    }
}

setWebhook();
