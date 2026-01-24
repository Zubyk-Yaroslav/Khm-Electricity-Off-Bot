const { pool } = require("../services/pool");
const subscribers = require("../services/subscribers").default;

// Видалити підписника
async function removeSubscriber(chatId) {
  try {
    await pool.query("DELETE FROM subscribers WHERE chat_id = $1", [chatId]);
    subscribers.delete(chatId);
    console.log(`➖ Відписався: ${chatId}`);
  } catch (err) {
    console.error("❌ Помилка видалення підписника:", err.message);
  }
}

module.exports = { removeSubscriber };
// End of file: utils/loadSubscribers.js
