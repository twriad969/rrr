const TelegramBot = require('node-telegram-bot-api');
const { 
    handleStartCommand, 
    handleMessage, 
    handleCallbackQuery, 
    checkSubscription 
} = require('./worker');
const { 
    handleCheckApiCommand, 
    handleRotateApiCommand, 
    handleStatsCommand 
} = require('./command');

const token = '7198843527:AAFA0eakqv37t_hlYrfyZuWnf2i6pRwrNPI';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (text.startsWith('/check-api')) {
        await handleCheckApiCommand(bot, chatId);
    } else if (text.startsWith('/check-api=')) {
        const apiName = text.split('=')[1];
        await handleRotateApiCommand(bot, chatId, apiName);
    } else if (text.startsWith('/stats')) {
        await handleStatsCommand(bot, chatId);
    } else {
        await handleMessage(bot, chatId, userId, text);
    }
});

bot.onText(/\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    await handleStartCommand(bot, chatId, userId);
});

bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const uniqueCode = match[1];
    await handleStartCommand(bot, chatId, userId, uniqueCode);
});

bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;

    await handleCallbackQuery(bot, chatId, userId, callbackQuery.data);
});

console.log('Bot is running...');
