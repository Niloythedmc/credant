const TelegramBot = require('node-telegram-bot-api');
const { botToken } = require('../config');

const bot = new TelegramBot(botToken, { polling: false });

/**
 * Sends a text message to a chat/channel
 * @param {string|number} chatId 
 * @param {string} text 
 * @returns {Promise<number>} message_id
 */
const sendMessage = async (chatId, text, options = {}) => {
    try {
        const msg = await bot.sendMessage(chatId, text, options);
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

/**
 * Gets chat info (title, description, photo, etc.)
 * @param {string|number} chatId 
 */
const getChat = async (chatId) => {
    try {
        return await bot.getChat(chatId);
    } catch (error) {
        console.error("Bot GetChat Error:", error.message);
        throw error;
    }
}

/**
 * Gets member count
 * @param {string|number} chatId 
 */
const getChatMemberCount = async (chatId) => {
    try {
        return await bot.getChatMemberCount(chatId);
    } catch (error) {
        console.error("Bot GetChatMemberCount Error:", error.message);
        return 0;
    }
}

/**
 * Gets file link (for photos)
 * @param {string} fileId 
 */
const getFileLink = async (fileId) => {
    try {
        return await bot.getFileLink(fileId);
    } catch (error) {
        console.error("Bot GetFileLink Error:", error.message);
        return null; // Return null if fails
    }
}

/**
 * Gets the bot's own ID from token
 */
const getBotId = () => {
    return parseInt(botToken.split(':')[0]);
}

module.exports = { sendMessage, getChatMember, getChat, getChatMemberCount, getFileLink, getBotId, botInstance: bot };
