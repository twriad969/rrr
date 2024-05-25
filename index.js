const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleRonok, handleNotification, handleMessage, handleStartWithToken, handleCheckAPI, handleSubscription } = require('./command');
const { saveStatsToAPI, rotateAPI } = require('./worker');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simple web server to keep the bot alive on Heroku
app.get('/', (req, res) => {
    res.send('Bot is running');
});
app.listen(port, () => {
    console.log(`Web server is running on port ${port}`);
});

// Your bot token
const token = process.env.BOT_TOKEN;

// Ensure bot token is available
if (!token) {
    console.error('Error: BOT_TOKEN is not defined. Set it in Heroku config vars.');
    process.exit(1);
}

// Bot initialization
const bot = new TelegramBot(token, { polling: true });

// Initialize user access, verification codes, and stats
let userAccess = {};
let verificationCodes = {};
let stats = {
    users: new Set(),
    linksProcessed: 0
};

// Initialize current API
let currentAPI = { key: 'c0c3fb3216826b7e107e17b161c06f7fd2c7fe78', name: 'ronok' };

// Bot command listeners
bot.onText(/\/start/, (msg) => handleStart(bot, msg, userAccess, verificationCodes, stats));
bot.onText(/\/ronok/, (msg) => handleRonok(bot, msg, stats));
bot.onText(/\/n (.+)/, (msg, match) => handleNotification(bot, msg, match));
bot.onText(/\/start (.+)/, (msg, match) => handleStartWithToken(bot, msg, match, userAccess, verificationCodes));
bot.onText(/\/check-api/, (msg) => handleCheckAPI(bot, msg, currentAPI));
bot.on('message', (msg) => handleMessage(bot, msg, userAccess, stats, currentAPI, verificationCodes));

// Handle subscription check callback
bot.on('callback_query', async (callbackQuery) => {
    if (callbackQuery.data === 'check_subscription') {
        handleSubscription(bot, callbackQuery, userAccess, verificationCodes, stats);
    }
});

// Bot error handling
bot.on('polling_error', (error) => console.error('Polling error:', error));

console.log('Bot is running...');

// Periodically save stats to API and rotate API keys
setInterval(() => saveStatsToAPI(stats), 24 * 60 * 60 * 1000); // Save stats every 24 hours
setInterval(() => { currentAPI = rotateAPI(currentAPI); }, 24 * 60 * 60 * 1000); // Rotate API every 24 hours
