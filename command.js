const { rotateApi, getActiveApi, getStats } = require('./worker');

async function handleCheckApiCommand(bot, chatId) {
    const activeApi = getActiveApi();
    let message = 'Currently active API: ' + activeApi.toUpperCase();
    await bot.sendMessage(chatId, message);
}

async function handleRotateApiCommand(bot, chatId, apiName) {
    const validApis = ['ronok', 'kartik'];
    if (validApis.includes(apiName)) {
        rotateApi(apiName);
        let message = 'API switched to: ' + apiName.toUpperCase();
        await bot.sendMessage(chatId, message);
    } else {
        await bot.sendMessage(chatId, '❌ Invalid API name. Please use "ronok" or "kartik".');
    }
}

async function handleStatsCommand(bot, chatId) {
    const stats = getStats();
    const message = `
📊 Bot Stats:
- Total Users: ${stats.totalUsers}
- Users Today: ${stats.usersToday}
- Links Processed Today: ${stats.linksProcessedToday}
    `;
    await bot.sendMessage(chatId, message);
}

module.exports = {
    handleCheckApiCommand,
    handleRotateApiCommand,
    handleStatsCommand
};
