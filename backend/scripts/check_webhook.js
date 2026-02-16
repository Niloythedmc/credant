require('dotenv').config();
const { botInstance } = require('../services/botService');

async function checkWebhook() {
    try {
        // botInstance is the bot object
        const info = await botInstance.getWebHookInfo(); // Note: getWebHookInfo or getWebhookInfo? Library uses getWebHookInfo per some versions, but standard is getWebhookInfo. let's try standard first but log botInstance keys to be sure.
        console.log("Current Webhook Info:", JSON.stringify(info, null, 2));
    } catch (error) {
        console.error("Error getting webhook info:", error);
        // Fallback or debug
        if (botInstance) {
            console.log("Bot methods:", Object.keys(Object.getPrototypeOf(botInstance)));
        }
    }
}

checkWebhook();
