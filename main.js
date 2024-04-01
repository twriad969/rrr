const TelegramBot = require('node-telegram-bot-api');
const gm = require('gm').subClass({ imageMagick: true });
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
  gm(photoUrl)
    .fontSize(36)
    .drawText(20, 20, '@ronok')
    .toBuffer('JPG', function(err, buffer) {
      if (err) {
        console.error(err);
        return bot.sendMessage(chatId, 'Sorry, something went wrong.');
      }
      // Send the watermarked image
      bot.sendPhoto(chatId, buffer, { caption: 'Here is your watermarked image.' });
    });
});

// Handle video messages
bot.on('video', async (msg) => {
  const chatId = msg.chat.id;
  const video = msg.video.file_id;

  // Get the video file
  const file = await bot.getFile(video);
  const videoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  // Watermark the video
  const outputFilePath = 'watermarked_video.mp4';
  const watermarkCommand = ffmpeg(videoUrl)
    .videoFilters('drawtext=text=@ronok:fontsize=24:x=10:y=10:shadowcolor=black:shadowx=2:shadowy=2')
    .on('progress', (progress) => {
      const percentage = Math.round(progress.percent);
      bot.sendMessage(chatId, `Processing: ${percentage}%`);
    })
    .save(outputFilePath);

  watermarkCommand.on('end', () => {
    // Send the watermarked video
    bot.sendVideo(chatId, outputFilePath, { caption: 'Here is your watermarked video.' });
  });

  watermarkCommand.on('error', (err) => {
    console.error(err);
    bot.sendMessage(chatId, 'Sorry, something went wrong.');
  });
});
