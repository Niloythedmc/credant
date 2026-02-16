const token = "8010131469:AAEoKm82KDUMB1PutaoQyGv5O9Ajwvxlca4";
const url = "https://credant-production.up.railway.app/api/telegram-webhook";
const apiUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${url}`;

console.log(`Setting webhook via: ${apiUrl}`);

fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
        console.log("Response:", data);
    })
    .catch(err => {
        console.error("Error:", err);
    });
