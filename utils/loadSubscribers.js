const { pool } = require("../services/pool");
const subscribers = require("../services/subscribers").default;

// Завантажити підписників з БД
async function loadSubscribers() {
  try {
    const result = await pool.query(
      "SELECT chat_id, lastimageurl FROM subscribers",
    );

    const subs = new Map(
      result.rows.map((row) => {
        return [row.chat_id, { lastImageUrl: row.lastimageurl }];
      }),
    );

    subscribers.replaceAll(subs);

    console.log(`📊 Завантажено підписників з БД: ${subs.size}`);
    return subs;
  } catch (err) {
    console.error("❌ Помилка завантаження підписників:", err.message);
    return new Map();
  }
}

module.exports = { loadSubscribers };
// End of file: utils/loadSubscribers.js
