const { Telegraf } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Telegram Bot token
const botToken = 'YOUR_TELEGRAM_BOT_TOKEN'; // Replace with your Telegram Bot token
const bot = new Telegraf(botToken);

// BeDrive access token
const beDriveAccessToken = 'YOUR_BEDRIVE_ACCESS_TOKEN'; // Replace with your BeDrive access token

// BeDrive API endpoints
const uploadEndpoint = 'https://bedrive.vebto.com/api/v1/uploads';
const shareableLinkEndpoint = 'https://bedrive.vebto.com/api/v1/file-entries';

// Enable cancellation of promises
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Function to upload file to BeDrive
async function uploadFileToBeDrive(filePath, fileType) {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        const config = {
            headers: {
                'Authorization': `Bearer ${beDriveAccessToken}`,
                ...formData.getHeaders()
            }
        };

        const response = await axios.post(uploadEndpoint, formData, config);
        console.log('Upload response:', response.data);
        return response.data.fileEntry;
    } catch (error) {
        console.error(`Error uploading ${fileType} to BeDrive:`, error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to generate shareable link for a file entry in BeDrive
async function generateShareableLink(entryId) {
    try {
        const shareLinkResponse = await axios.post(`${shareableLinkEndpoint}/${entryId}/shareable-link`, {
            password: 'new password', // Replace with your desired password
            expires_at: null, // Replace with expiry date if needed
            allow_edit: false,
            allow_download: true // Modify based on your requirements
        }, {
            headers: {
                'Authorization': `Bearer ${beDriveAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Shareable link response:', shareLinkResponse.data);
        return `https://bedrive.vebto.com/drive/s/${shareLinkResponse.data.link.hash}`;
    } catch (error) {
        console.error('Error generating shareable link:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Handle video uploads
bot.on('video', async (ctx) => {
    try {
        const fileId = ctx.message.video.file_id;
        const filePath = `./${fileId}_${Date.now()}.mp4`;
        await ctx.telegram.getFileLink(fileId).then((fileLink) => axios({
            method: 'get',
            url: fileLink
        }).then((response) => {
            fs.writeFileSync(filePath, response.data);
        }).catch((error) => {
            console.error('Error downloading file:', error);
        }));

        const uploadedFileEntry = await uploadFileToBeDrive(filePath, 'video');
        if (!uploadedFileEntry) throw new Error('Error uploading video to BeDrive.');

        const shareableLink = await generateShareableLink(uploadedFileEntry.id);
        if (!shareableLink) throw new Error('Error generating shareable link.');

        ctx.reply(`Your video is uploaded!\nHere's the shareable link: ${shareableLink}`);
    } catch (error) {
        console.error('Error:', error.message);
        ctx.reply('Sorry, an error occurred while processing your request.');
    }
});

// Handle photo uploads
bot.on('photo', async (ctx) => {
    try {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        const filePath = `./${fileId}_${Date.now()}.jpg`;
        await ctx.telegram.getFileLink(fileId).then((fileLink) => axios({
            method: 'get',
            url: fileLink
        }).then((response) => {
            fs.writeFileSync(filePath, response.data);
        }).catch((error) => {
            console.error('Error downloading file:', error);
        }));

        const uploadedFileEntry = await uploadFileToBeDrive(filePath, 'photo');
        if (!uploadedFileEntry) throw new Error('Error uploading photo to BeDrive.');

        const shareableLink = await generateShareableLink(uploadedFileEntry.id);
        if (!shareableLink) throw new Error('Error generating shareable link.');

        ctx.reply(`Your photo is uploaded!\nHere's the shareable link: ${shareableLink}`);
    } catch (error) {
        console.error('Error:', error.message);
        ctx.reply('Sorry, an error occurred while processing your request.');
    }
});

// Start the bot
bot.launch();
