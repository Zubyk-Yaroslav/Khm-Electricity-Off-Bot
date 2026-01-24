const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_DEV_TOKEN = process.env.BOT_DEV_TOKEN;
const PAGE_URL = "https://hoe.com.ua/page/pogodinni-vidkljuchennja";
// const PAGE_URL = "https://dev.riker.com.ua/test-page/";
const CHECK_INTERVAL = 5_000;
const isDev = process.env.NODE_ENV !== "production";

module.exports = { BOT_TOKEN, BOT_DEV_TOKEN, PAGE_URL, CHECK_INTERVAL, isDev };
// End of file: constants/constants.js
