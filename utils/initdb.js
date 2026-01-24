const { pool } = require("../services/pool");

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        chat_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        lastimageurl TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ База даних ініціалізована");
  } catch (err) {
    console.error("❌ Помилка ініціалізації БД:", err.message);
  }
}
module.exports = { initDB };
// End of file: utils/initdb.js
