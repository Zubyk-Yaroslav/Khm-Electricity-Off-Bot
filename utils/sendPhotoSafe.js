const axios = require("axios");
const { removeSubscriber } = require("./removeSubscriber");
const { pool } = require("../services/pool");
const { bot } = require("../services/telegram");
const subscribers = require("../services/subscribers").default;

async function sendPhotoSafe(chatId, imageUrl, captionText) {
  try {
    const res = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    await bot.telegram.sendPhoto(
      chatId,
      { source: Buffer.from(res.data, "binary") },
      { caption: captionText },
    );

    await pool.query(
      `UPDATE subscribers
       SET lastimageurl = $1
       WHERE chat_id = $2`,
      [imageUrl, chatId],
    );

    subscribers.replace(chatId, {
      lastImageUrl: imageUrl,
    });

    console.log(`✅ Надіслано ${chatId}`);
  } catch (e) {
    if (e.response?.error_code === 403) {
      console.log(`❌ Користувач заблокував бота: ${chatId}`);
      await removeSubscriber(chatId);
    } else if (e.response?.error_code === 400) {
      console.error(`⚠️ Невалідне фото для ${chatId}:`, e.message);
    } else {
      console.error(`❌ Помилка відправки ${chatId}:`, e.message);
    }
  }
}

module.exports = { sendPhotoSafe };
// // End of file: utils/sendPhotoSafe.js
