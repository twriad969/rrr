const TelegramBot = require('node-telegram-bot-api');
const Jimp = require('jimp');

// Telegram bot token
const token = '6663409312:AAHcW5A_mnhWHwSdZrFm9eJx1RxqzWKrS0c';

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const startMessage = `Welcome to the Image Watermarker Bot! Send me any photo and I'll watermark it with "@ronok" for you.`;
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
  Jimp.read(photoUrl, (err, image) => {
    if (err) {
      console.error(err);
      return bot.sendMessage(chatId, 'Sorry, something went wrong.');
    }
    Jimp.loadFont(Jimp.FONT_SANS_16_BLACK).then((font) => {
      image.print(font, 10, 10, '@ronok')
           .quality(100) // Set image quality to 100%
           .getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
              if (err) {
                console.error(err);
                return bot.sendMessage(chatId, 'Sorry, something went wrong.');
              }
              // Send the watermarked image
              bot.sendPhoto(chatId, buffer, { caption: 'Here is your watermarked image.' });
           });
    });
  });
});
