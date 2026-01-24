const { Pool } = require("pg");
const { isDev } = require("../constants/constants");

const DB_URL = isDev ? process.env.DATABASE_URL_DEV : process.env.DATABASE_URL;

// ---------- PostgreSQL (для Railway) ----------
const pool = new Pool({
  connectionString: DB_URL,
  ssl: DB_URL ? { rejectUnauthorized: false } : false,
});

module.exports = { pool };
// End of file: services/pool.js
