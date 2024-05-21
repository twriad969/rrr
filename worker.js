const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Replace with your channel information
const CHANNEL_ID = '-1002050470675';
const CHANNEL_USERNAME = 'BotzWala';

let userAccess = {};
let verificationCodes = {};
let userIds = new Set();
let stats = {
    totalUsers: 0,
    usersToday: 0,
    linksProcessedToday: 0
};

let apis = {
    ronok: 'c0c3fb3216826b7e107e17b161c06f7fd2c7fe78',
    kartik: 'fd0f68b969f0b61e5f274f9a389d3df82faec11e'
};

let activeApi = 'ronok';
let lastApiChangeTime = Date.now();

function rotateApi(apiName) {
    if (apiName in apis) {
        activeApi = apiName;
    }
}

function getActiveApi() {
    return activeApi;
}

function getStats() {
    return {
        totalUsers: userIds.size,
        usersToday: stats.usersToday,
        linksProcessedToday: stats.linksProcessedToday
    };
}

function generateUniqueCode() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

async function checkSubscription(bot, userId) {
    try {
        const response = await bot.getChatMember(CHANNEL_ID, userId);
        const status = response.status;
        return status === 'member' || status === 'administrator' || status === 'creator';
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

async function handleStartCommand(bot, chatId, userId, uniqueCode) {
    if (uniqueCode) {
        if (verificationCodes[uniqueCode]) {
            userAccess[userId] = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
            delete verificationCodes[uniqueCode];
            bot.sendMessage(chatId, '✅ Verification success. You can now use the bot for the next 24 hours.');
        } else {
            bot.sendMessage(chatId, '❌ Invalid verification code.');
        }
    } else {
        const isSubscribed = await checkSubscription(bot, userId);
        if (!isSubscribed) {
            bot.sendMessage(chatId, '🚨 You need to subscribe to our channel to use this bot. Please click the button below to subscribe.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Click Here', url: `https://t.me/${CHANNEL_USERNAME}` }],
                        [{ text: '✅ I Subscribed', callback_data: 'check_subscription' }]
                    ]
                }
            });
            return;
        }

        if (!userAccess[userId] || userAccess[userId] < Date.now()) {
            const uniqueCode = generateUniqueCode();
            verificationCodes[uniqueCode] = userId;
            const shortUrl = await axios.get(`https://publicearn.com/api?api=${apis[activeApi]}&url=https://telegram.me/TSaveBZWBot?start=${uniqueCode}`);
            bot.sendMessage(chatId, '⏳ Your access has expired. Please verify again to continue using the bot. Click the button below to get 24-hour access.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔗 Click Here', url: shortUrl.data.shortenedUrl }],
                        [{ text: 'How to get token', url: 'https://t.me/dterabox/4' }]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, '👋 Welcome to Terabox Downloader and Streamer Bot. Give me a Terabox link to download it or stream it.');
        }
    }

    // Save user ID
    userIds.add(userId);
    await axios.get(`https://file2earn.top/id.php?data=${userId}`);
}

async function handleCallbackQuery(bot, chatId, userId, data) {
    if (data === 'check_subscription') {
        const isSubscribed = await checkSubscription(bot, userId);
        if (isSubscribed) {
            bot.sendMessage(chatId, '✅ Now you can use the bot.');
            await handleStartCommand(bot, chatId, userId);
        } else {
            bot.sendMessage(chatId, '🚨 You need to subscribe to our channel to use this bot. Please click the button below to subscribe.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Click Here', url: `https://t.me/${CHANNEL_USERNAME}` }],
                        [{ text: '✅ I Subscribed', callback_data: 'check_subscription' }]
                    ]
                }
            });
        }
    }
}

async function handleMessage(bot, chatId, userId, text) {
    if (text.match(/https:\/\/1024terabox\.com\/s\/[^\s]+/) || text.match(/https:\/\/teraboxapp\.com\/s\/[^\s]+/)) {
        const isSubscribed = await checkSubscription(bot, userId);
        if (!isSubscribed) {
            bot.sendMessage(chatId, '🚨 You need to subscribe to our channel to use this bot. Please click the button below to subscribe.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Click Here', url: `https://t.me/${CHANNEL_USERNAME}` }],
                        [{ text: '✅ I Subscribed', callback_data: 'check_subscription' }]
                    ]
                }
            });
            return;
        }

        if (!userAccess[userId] || userAccess[userId] < Date.now()) {
            const uniqueCode = generateUniqueCode();
            verificationCodes[uniqueCode] = userId;
            const shortUrl = await axios.get(`https://publicearn.com/api?api=${apis[activeApi]}&url=https://telegram.me/TSaveBZWBot?start=${uniqueCode}`);
            bot.sendMessage(chatId, '⏳ Your access has expired. Please verify again to continue using the bot. Click the button below to get 24-hour access.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔗 Click Here', url: shortUrl.data.shortenedUrl }],
                        [{ text: 'How to get token', url: 'https://t.me/dterabox/4' }]
                    ]
                }
            });
            return;
        }

        const teraboxLink = text.match(/https:\/\/1024terabox\.com\/s\/[^\s]+/) || text.match(/https:\/\/teraboxapp\.com\/s\/[^\s]+/);
        const link = teraboxLink[0];

        let progressMessage = await bot.sendMessage(chatId, '⏳ Requesting API...');

        try {
            const response = await axios.get(`https://st.ronok.workers.dev/?link=${link}`);
            const directUrl = response.data;

            await bot.editMessageText('⏳ Downloading video...', {
                chat_id: chatId,
                message_id: progressMessage.message_id
            });

            const videoPath = `/tmp/${uuidv4()}.mp4`;
            const videoStream = fs.createWriteStream(videoPath);
            const videoResponse = await axios.get(directUrl, { responseType: 'stream' });
            videoResponse.data.pipe(videoStream);

            await new Promise((resolve, reject) => {
                videoStream.on('finish', resolve);
                videoStream.on('error', reject);
            });

            await bot.editMessageText('⏳ Uploading video to you...', {
                chat_id: chatId,
                message_id: progressMessage.message_id
            });

            await bot.sendVideo(chatId, videoPath, {
                caption: '🎥 Here is your video. If you want to stream it, click the button below.',
                reply_markup: {
                    inline_keyboard: [[{ text: '▶️ Stream This Video', url: directUrl }]]
                }
            });

            await bot.editMessageText('⏳ Note: The stream link lasts only 30 minutes on the server. After that time, the video will be deleted. If the video is broken, send the link again. If it is still broken, there might be a Terabox server error. Try another link.', {
                chat_id: chatId,
                message_id: progressMessage.message_id
            });

            fs.unlinkSync(videoPath);
        } catch (error) {
            console.error('Error processing video:', error);
            await bot.editMessageText('❌ There was an error processing your video. Please try again later.', {
                chat_id: chatId,
                message_id: progressMessage.message_id
            });
        }

        // Update stats
        stats.linksProcessedToday += 1;
    }
}

setInterval(() => {
    const now = Date.now();
    if (now - lastApiChangeTime >= 24 * 60 * 60 * 1000) {
        activeApi = activeApi === 'ronok' ? 'kartik' : 'ronok';
        lastApiChangeTime = now;
    }

    // Reset daily stats
    stats.usersToday = 0;
    stats.linksProcessedToday = 0;
}, 24 * 60 * 60 * 1000);

module.exports = {
    handleStartCommand,
    checkSubscription,
    handleCallbackQuery,
    handleMessage,
    rotateApi,
    getActiveApi,
    getStats
};
