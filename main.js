const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual bot token obtained from BotFather
const bot = new TelegramBot('6663409312:AAHcW5A_mnhWHwSdZrFm9eJx1RxqzWKrS0c', { polling: true });

let watermarkUrl = ''; // Stores the URL of the watermark image
let watermarkOpacity = 0.6; // Default opacity for watermark

// Start message handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to Watermark Bot! Send me an image and I will add a watermark to it. Use /water to set a custom watermark.');
});

bot.onText(/\/water (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    // Download the PNG image from the provided URL
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

    // Check if the message contains a photo
    if (msg.photo && msg.photo.length > 0) {
        const photoId = msg.photo[msg.photo.length - 1].file_id;

        // Download the photo
        const photoFilePath = await bot.downloadFile(photoId, './');

        // Watermark the photo
        const watermarkedPhotoFilePath = await watermarkImage(photoFilePath);

        // Send the watermarked photo back to the user
        bot.sendPhoto(chatId, watermarkedPhotoFilePath);

        // Remove the temporary files
        fs.unlinkSync(photoFilePath);
        fs.unlinkSync(watermarkedPhotoFilePath);
    } else {
        bot.sendMessage(chatId, 'Please send a photo.');
    }
});

async function watermarkImage(inputFilePath) {
    const canvas = createCanvas(1000, 1000); // Adjust canvas size as needed
    const ctx = canvas.getContext('2d');

    // Load image
    const image = await loadImage(inputFilePath);

    // Draw image on canvas
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Load watermark image or use default demo watermark
    let watermark;
    if (watermarkUrl) {
        watermark = await loadImage(watermarkUrl);
    } else {
        // Use default demo watermark
        ctx.font = '48px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('@demo', canvas.width / 2, canvas.height / 2);
    }

    if (watermark) {
        // Calculate position for watermark
        const x = (canvas.width - watermark.width) / 2;
        const y = (canvas.height - watermark.height) / 2;

        // Draw watermark image with opacity
        ctx.globalAlpha = watermarkOpacity;
        ctx.drawImage(watermark, x, y);

        // Reset opacity
        ctx.globalAlpha = 1;
    }

    // Save canvas to a new image file
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
