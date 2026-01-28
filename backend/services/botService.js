const TelegramBot = require('node-telegram-bot-api');
const { botToken } = require('../config');

const bot = new TelegramBot(botToken, { polling: false });

/**
 * Sends a text message to a chat/channel
 * @param {string|number} chatId 
 * @param {string} text 
 * @returns {Promise<number>} message_id
 */
const sendMessage = async (chatId, text) => {
    try {
        const msg = await bot.sendMessage(chatId, text);
        return msg.message_id;
    } catch (error) {
        console.error("Bot SendMessage Error:", error);
        throw error;
    }
};

/**
 * Checks if the bot is a member/admin of the chat to verify existence
 * @param {string|number} chatId 
 */
const getChatMember = async (chatId, userId) => {
    try {
        return await bot.getChatMember(chatId, userId);
    } catch (error) {
        throw error;
    }
}

module.exports = { sendMessage, getChatMember, botInstance: bot };
