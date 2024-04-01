const TelegramBot = require('node-telegram-bot-api');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');

// Telegram bot token
const token = '6663409312:AAHcW5A_mnhWHwSdZrFm9eJx1RxqzWKrS0c';

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const startMessage = `Welcome to the Media Watermarker Bot! Send me any photo or video and I'll watermark it with "@ronok" for you.`;
  bot.sendMessage(chatId, startMessage);
});

// Handle photo messages
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[0].file_id;

  // Get the photo file
  const file = await bot.getFile(photo);
  const photoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  // Watermark the image
  // Here we can use gm or another image processing library
  // For simplicity, we'll use the canvas library for text overlay
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  const image = await loadImage(photoUrl);
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  ctx.font = '36px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText('@ronok', 20, 50);

  // Convert the canvas to a buffer
  const buffer = canvas.toBuffer('image/jpeg');

  // Send the watermarked image
  bot.sendPhoto(chatId, buffer, { caption: 'Here is your watermarked image.' });
});

// Handle video messages
bot.on('video', async (msg) => {
  const chatId = msg.chat.id;
  const video = msg.video.file_id;

  // Get the video file
  const file = await bot.getFile(video);
  const videoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  // Send a message indicating that video watermarking is not supported
  bot.sendMessage(chatId, 'Sorry, watermarking videos is not supported by this bot yet.');
});
