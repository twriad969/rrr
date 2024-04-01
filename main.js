const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual bot token obtained from BotFather
const token = '6663409312:AAHcW5A_mnhWHwSdZrFm9eJx1RxqzWKrS0c';
const bot = new TelegramBot(token, { polling: true });

let watermarkUrl = ''; // Stores the URL of the watermark image
let watermarkOpacity = 0.6; // Default opacity for watermark

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to Watermark Bot! Send me an image and I will add a watermark to it. Use /water to set a custom watermark.');
});

bot.onText(/\/water (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    axios({
        method: 'get',
        url: url,
        responseType: 'stream'
    }).then(response => {
        response.data.pipe(fs.createWriteStream('watermark.png'));
        watermarkUrl = 'watermark.png';
        bot.sendMessage(chatId, 'Watermark image updated successfully!');
    }).catch(error => {
        console.log(error);
        bot.sendMessage(chatId, 'Failed to update watermark image.');
    });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.photo && msg.photo.length > 0) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;

        const photoFilePath = await bot.downloadFile(photoId, './');

        const watermarkedPhotoFilePath = await watermarkImage(photoFilePath);

        bot.sendPhoto(chatId, watermarkedPhotoFilePath);

        fs.unlinkSync(photoFilePath);
        fs.unlinkSync(watermarkedPhotoFilePath);
    } else {
        bot.sendMessage(chatId, 'Please send a photo.');
    }
});

async function watermarkImage(inputFilePath) {
    const canvas = createCanvas(1000, 1000); 
    const ctx = canvas.getContext('2d');

    const image = await loadImage(inputFilePath);

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let watermark;
    if (watermarkUrl) {
        watermark = await loadImage(watermarkUrl);
    } else {
        ctx.font = '48px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('@demo', canvas.width / 2, canvas.height / 2);
    }

    if (watermark) {
        const x = (canvas.width - watermark.width) / 2;
        const y = (canvas.height - watermark.height) / 2;

        ctx.globalAlpha = watermarkOpacity;
        ctx.drawImage(watermark, x, y);

        ctx.globalAlpha = 1;
    }

    const outputFilePath = inputFilePath.replace(/\.[^/.]+$/, '_watermarked.jpg');
    const outputStream = fs.createWriteStream(outputFilePath);
    const stream = canvas.createJPEGStream({ quality: 0.95 });

    await new Promise((resolve, reject) => {
        stream.pipe(outputStream);
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
    });

    return outputFilePath;
}

bot.on('polling_error', (error) => {
    console.error(error);
});

// Start the bot
console.log('Bot is running...');
