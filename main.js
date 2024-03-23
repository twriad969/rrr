const Telegraf = require('telegraf');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ProgressBar = require('progress');

const bot = new Telegraf('6701652400:AAFvnBkqFP8WZrPs-hAq73Yd01bIwKjWhcI');
const usersProgress = {};

let watermarkText = 'Default Watermark';
let watermarkOpacity = 0.5;

bot.start((ctx) => ctx.reply('Welcome! Use /help to see available commands.'));

bot.help((ctx) => {
    ctx.reply(
        'Commands:\n' +
        '/settext [text] - Set watermark text\n' +
        '/setopacity [opacity] - Set watermark opacity (0 to 1)\n' +
        '/status - Check watermark settings\n' +
        'Send an image or video to add watermark\n'
    );
});

bot.command('settext', (ctx) => {
    const text = ctx.message.text.replace('/settext ', '');
    watermarkText = text;
    ctx.reply(`Watermark text set to: ${watermarkText}`);
});

bot.command('setopacity', (ctx) => {
    const opacity = parseFloat(ctx.message.text.replace('/setopacity ', ''));
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
        ctx.reply('Please provide a valid opacity value between 0 and 1.');
    } else {
        watermarkOpacity = opacity;
        ctx.reply(`Watermark opacity set to: ${watermarkOpacity}`);
    }
});

bot.command('status', (ctx) => {
    ctx.reply(`Current settings:\nWatermark Text: ${watermarkText}\nWatermark Opacity: ${watermarkOpacity}`);
});

async function addWatermarkToImage(imagePath, outputFilePath, watermarkText) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    ctx.fillStyle = `rgba(255, 255, 255, ${watermarkOpacity})`;
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(watermarkText, 10, canvas.height - 10);

    const stream = canvas.createJPEGStream({ quality: 0.7 });
    const out = fs.createWriteStream(outputFilePath);
    stream.pipe(out);
    return new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
    });
}

async function addWatermarkToVideo(videoPath, outputFilePath, watermarkText, ctx) {
    const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
        });
    });

    const width = videoInfo.streams[0].width;
    const height = videoInfo.streams[0].height;

    const watermarkSize = Math.min(width, height) / 20; // Adjust the watermark size dynamically

    const command = ffmpeg(videoPath)
        .videoCodec('libx264')
        .inputOptions('-c:v libx264')
        .outputOptions('-c:v libx264')
        .on('progress', (progress) => {
            usersProgress[ctx.chat.id] = progress.percent;
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error:', err);
            console.error('ffmpeg stderr:', stderr);
        })
        .on('end', () => {
            ctx.reply('Video processing complete.');
            delete usersProgress[ctx.chat.id];
        });

    command.complexFilter([
        `drawtext=text='${watermarkText}':fontsize=${watermarkSize}:fontcolor=white@${watermarkOpacity * 255}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=5`
    ]);

    command.save(outputFilePath);
}

bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id;
    const filePath = await ctx.telegram.getFileLink(fileId);
    const imagePath = filePath.href;

    const outputFilePath = `watermarked_${fileId}.jpg`;
    await addWatermarkToImage(imagePath, outputFilePath, watermarkText);

    ctx.replyWithPhoto({ source: outputFilePath });
});

bot.on('video', async (ctx) => {
    const fileId = ctx.message.video.file_id;
    const filePath = await ctx.telegram.getFileLink(fileId);
    const videoPath = filePath.href;

    const outputFilePath = `watermarked_${fileId}.mp4`;
    await addWatermarkToVideo(videoPath, outputFilePath, watermarkText, ctx);

    const progressMessage = await ctx.reply('Processing video...');
    const progressInterval = setInterval(() => {
        if (usersProgress[ctx.chat.id]) {
            ctx.telegram.editMessageText(ctx.chat.id, progressMessage.message_id, null, `Video processing: ${usersProgress[ctx.chat.id].toFixed(2)}%`);
        }
    }, 500);

    bot.on('text', (ctx) => {
        clearInterval(progressInterval);
    });

    ctx.replyWithVideo({ source: outputFilePath });
});

bot.launch();
