const express = require('express');
const router = express.Router();
const { botInstance } = require('../services/botService');
const { botToken } = require('../config');

// POST /api/telegram-webhook
// Telegram sends updates here
router.post(`/${botToken}`, (req, res) => {
    try {
        botInstance.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error("Telegram Webhook Error:", error);
        res.sendStatus(500);
    }
});

// For easier setup, we might want a generic path too, but usually it includes the token for security.
// Let's also support a generic path if they set the webhook to just /api/telegram-webhook
router.post('/', (req, res) => {
    try {
        botInstance.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error("Telegram Webhook Error:", error);
        res.sendStatus(500);
    }
});

module.exports = router;
