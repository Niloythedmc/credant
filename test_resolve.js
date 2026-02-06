const axios = require('axios');

async function testResolve() {
    try {
        console.log("Testing resolve-link with Telegram News...");
        const res = await axios.post('http://localhost:5000/api/ads/resolve-link', {
            link: 'https://t.me/telegram'
        });
        console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

testResolve();
