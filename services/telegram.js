const { Telegraf } = require("telegraf");
const { BOT_TOKEN, BOT_DEV_TOKEN, isDev } = require("../constants/constants");

const bot = new Telegraf(isDev ? BOT_DEV_TOKEN : BOT_TOKEN);

module.exports.bot = bot;
