const { PAGE_URL } = require("../constants/constants");
const { getFirstImageFromPage } = require("../services/ocrService");
const { pool } = require("../services/pool");
const subscribers = require("../services/subscribers").default;

// Додати підписника
async function addSubscriber(chatId, username, firstName) {
  try {
    const { imageUrl } = await getFirstImageFromPage(PAGE_URL);

    await pool.query(
      `INSERT INTO subscribers (chat_id, username, first_name, lastimageurl)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (chat_id) DO NOTHING`,
      [chatId, username, firstName, imageUrl],
    );

    subscribers.set(chatId, {
      lastImageUrl: imageUrl,
    });

    console.log(`➕ Новий підписник: ${chatId} (${firstName})`);
  } catch (err) {
    console.error("❌ Помилка додавання підписника:", err.message);
  }
}
module.exports = { addSubscriber };
// End of file: utils/addSubscriber.js
