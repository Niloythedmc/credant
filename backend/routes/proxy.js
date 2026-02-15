const express = require('express');
const router = express.Router();
const axios = require('axios');
const { botToken } = require('../config');

// Helper to get fresh sticker object
async function refreshStickerData(customEmojiId) {
    const url = `https://api.telegram.org/bot${botToken}/getCustomEmojiStickers`;
    try {
        const response = await axios.get(url, {
            params: { custom_emoji_ids: JSON.stringify([customEmojiId]) }
        });

        const data = response.data;
        if (data.ok && data.result && data.result.length > 0) {
            return data.result[0];
        }
    } catch (error) {
        console.error(`[TELEGRAM API ERROR] Request failed for emoji ${customEmojiId}:`, error.message);
    }
    return null;
}

// Helper to get file path
async function getFilePath(fileId) {
    const url = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
    try {
        const response = await axios.get(url);
        const data = response.data;
        if (data.ok && data.result && data.result.file_path) {
            return data.result.file_path;
        }
    } catch (error) {
        console.error(`[TELEGRAM ERROR] Failed to get file path for ${fileId}:`, error.message);
    }
    return null;
}

// Helper to stream file from Telegram
async function streamFileFromTelegram(filePath, res) {
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream'
        });

        // Set Headers
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

        // Pipe stream
        response.data.pipe(res);
    } catch (error) {
        console.error(`[PROXY STREAM ERROR] Failed to stream file from path ${filePath}:`, error.message);
        res.status(502).json({ error: "Failed to stream file from Telegram." });
    }
}

// GET /api/telegram-proxy/getFile?custom_emoji_id=...
router.get('/getFile', async (req, res) => {
    const { custom_emoji_id } = req.query;
    if (!custom_emoji_id) {
        return res.status(400).json({ error: "custom_emoji_id is required" });
    }

    const stickerData = await refreshStickerData(custom_emoji_id);
    if (!stickerData || !stickerData.file_id) {
        return res.status(502).json({ error: "Could not get sticker data from Telegram." });
    }

    const filePath = await getFilePath(stickerData.file_id);
    if (!filePath) {
        return res.status(502).json({ error: "Could not get file_path." });
    }

    await streamFileFromTelegram(filePath, res);
});

// GET /api/telegram-proxy/getThumbnail?custom_emoji_id=...
router.get('/getThumbnail', async (req, res) => {
    const { custom_emoji_id } = req.query;
    if (!custom_emoji_id) {
        return res.status(400).json({ error: "custom_emoji_id is required" });
    }

    const stickerData = await refreshStickerData(custom_emoji_id);
    if (!stickerData) {
        return res.status(404).json({ error: "Sticker data not found." });
    }

    const thumbFileId = stickerData.thumb?.file_id;
    if (!thumbFileId) {
        return res.status(404).json({ error: "Thumbnail not found." });
    }

    const filePath = await getFilePath(thumbFileId);
    if (!filePath) {
        return res.status(502).json({ error: "Could not get thumbnail file_path." });
    }

    await streamFileFromTelegram(filePath, res);
});

// GET /api/telegram-proxy/image?path=...
router.get('/image', async (req, res) => {
    const { path } = req.query;
    if (!path) {
        return res.status(400).json({ error: "path is required" });
    }

    // Security: basic check to ensure path doesn't try to go up directories (though telegram paths are usually safe)
    if (path.includes('..')) {
        return res.status(400).json({ error: "Invalid path" });
    }

    await streamFileFromTelegram(path, res);
});

module.exports = router;
