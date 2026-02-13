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

// Listen for Drafts
bot.on('message', async (msg) => {
    // Basic Draft Storage for User
    // We store the draft keyed by Telegram User ID
    // Frontend will poll based on linked Telegram ID

    // Ignore commands like /start
    if (msg.text && msg.text.startsWith('/')) return;

    try {
        const userId = msg.from.id.toString();
        const admin = require('firebase-admin');
        const db = admin.firestore();

        console.log(`[Bot] Received draft from ${userId}`);

        let text = msg.text || msg.caption || '';
        let photo = null;
        if (msg.photo) {
            // Get largest photo
            photo = msg.photo[msg.photo.length - 1].file_id;
        }

        // Check for Reply Markup (Inline Buttons)
        let buttons = null;
        if (msg.reply_markup && msg.reply_markup.inline_keyboard) {
            // We just store the structure to replicate it or ask frontend to edit it
            // For now, let's just flag it or store raw
            buttons = msg.reply_markup.inline_keyboard;
        }

        const draftData = {
            telegramUserId: userId,
            text: text,
            photoFileId: photo, // We need to resolve this to URL later or send File ID
            buttons: buttons,
            entities: msg.entities || msg.caption_entities || [],
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        // Upsert draft
        await db.collection('drafts').doc(userId).set(draftData);
        console.log(`[Bot] Saved draft for ${userId}`);

        // Acknowledge
        await bot.sendMessage(userId, "Draft saved! Check the Credant App to finalize.");

    } catch (error) {
        console.error("[Bot] Draft Error:", error);
    }
});

/**
 * Sends a photo to a chat
 * @param {string|number} chatId
 * @param {string|Buffer} photo - file_id, url or buffer
 * @param {object} options
 */
const sendPhoto = async (chatId, photo, options = {}) => {
    try {
        const msg = await bot.sendPhoto(chatId, photo, options);
        return msg.message_id;
    } catch (error) {
        console.error("Bot SendPhoto Error:", error.message);
        throw error;
    }
}

/**
 * Forwards a message
 * @param {string|number} chatId - Destination
 * @param {string|number} fromChatId - Source
 * @param {number} messageId - Message ID
 */
const forwardMessage = async (chatId, fromChatId, messageId) => {
    try {
        const msg = await bot.forwardMessage(chatId, fromChatId, messageId);
        return msg.message_id;
    } catch (error) {
        console.error("Bot ForwardMessage Error:", error.message);
        throw error;
    }
}

module.exports = { sendMessage, sendPhoto, forwardMessage, getChatMember, getChat, getChatMemberCount, getFileLink, getBotId, botInstance: bot };
