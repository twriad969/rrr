const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleRonok, handleNotification, handleMessage, handleStartWithToken, handleCheckAPI, handleSubscription } = require('./command');
const { saveStatsToAPI, rotateAPI } = require('./worker');

// Your bot token
const token = process.env.BOT_TOKEN || '6953859072:AAHGh5LUMEeY7TO6hQGiXzDCkG0yiJMmT7M';

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

// Bot error handling
bot.on('polling_error', (error) => console.error('Polling error:', error));

console.log('Bot is running...');

// Periodically save stats to API and rotate API keys
setInterval(() => saveStatsToAPI(stats), 24 * 60 * 60 * 1000); // Save stats every 24 hours
setInterval(() => { currentAPI = rotateAPI(currentAPI); }, 24 * 60 * 60 * 1000); // Rotate API every 24 hours
