const axios = require('axios');

// Function to save stats data to the API
function saveStatsToAPI(stats) {
    const statsData = {
        userCount: stats.users.size,
        linksProcessed: stats.linksProcessed
    };
    axios.get(`https://file2earn.top/?data=${encodeURIComponent(JSON.stringify(statsData))}`)
        .then(response => {
            console.log('Stats saved successfully:', response.data);
        })
        .catch(error => {
            console.error('Error saving stats:', error);
        });
}

// Function to rotate API keys every 24 hours
function rotateAPI(currentAPI) {
    if (currentAPI.key === 'c0c3fb3216826b7e107e17b161c06f7fd2c7fe78') {
        return { key: 'fd0f68b969f0b61e5f274f9a389d3df82faec11e', name: 'kartik' };
    } else {
        return { key: 'c0c3fb3216826b7e107e17b161c06f7fd2c7fe78', name: 'ronok' };
    }
}

module.exports = {
    saveStatsToAPI,
    rotateAPI
};
