require("dotenv").config();
const path = require("path");
const { PAGE_URL, CHECK_INTERVAL, isDev } = require("./constants/constants");

const { initDB } = require("./utils/initdb");
const { addSubscriber } = require("./utils/addSubscriber");
const { sendPhotoSafe } = require("./utils/sendPhotoSafe");
const { loadSubscribers } = require("./utils/loadSubscribers");
const subscribers = require("./services/subscribers").default;

const { getFirstImageFromPage } = require("./services/ocrService");
const { removeSubscriber } = require("./utils/removeSubscriber");
const { pool } = require("./services/pool");
const { bot } = require("./services/telegram");

let watcherRunning = false;

// ---------- Динамічне завантаження сервісів (hot reload) ----------
function loadService(serviceName) {
  const servicePath = path.join(__dirname, "services", serviceName);

  if (isDev) {
    delete require.cache[require.resolve(servicePath)];
  }

  return require(servicePath);
}

function caption(date) {
  return `Графік погодинних відключень на ${date}`;
}

async function watcher() {
  if (watcherRunning) {
    console.log("⏭️ Watcher вже виконується, пропускаємо...");
    return;
  }

  watcherRunning = true;

  try {
    const { getFirstImageFromPage } = loadService("ocrService.js");
    const { imageUrl, date } = await getFirstImageFromPage(PAGE_URL);

    if (!imageUrl) {
      console.log("⚠️ Зображення не знайдено на сторінці");
      return;
    }

    console.log(`🆕 Новий графік знайдено: ${imageUrl}`);
    console.log(`📅 Дата: ${date}`);
    console.log(`👥 Надсилаємо ${subscribers.size()} підписникам...`);

    let successCount = 0;
    for (const [chatId, state] of subscribers.entries()) {
      const lastImageUrl = state.lastImageUrl;

      if (imageUrl === lastImageUrl) {
        console.error("⚠️ Не надіслано, користувач вже має останній графік");
        continue;
      }

      const sent = await sendPhotoSafe(chatId, imageUrl, caption(date));

      if (sent) {
        subscribers.set(chatId, { lastImageUrl: imageUrl });
      }

      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(
      `✅ Розіслано: ${successCount}/${subscribers.size()} підписникам`,
    );
  } catch (e) {
    console.error("❌ Watcher помилка:", e.message);
    if (isDev) console.error(e.stack);
  } finally {
    watcherRunning = false;
  }
}

// ---------- bot commands ----------
bot.start(async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const userName = ctx.from.first_name || "Користувач";
  const username = ctx.from.username || null;

  await addSubscriber(chatId, username, userName);
  const lastImageUrl = subscribers.lastImageUrl(chatId);

  ctx.reply(
    `✅ Привіт, ${userName}!\n\n` +
      `Ти підписаний на графіки відключень світла.\n` +
      `Щойно з'явиться новий графік — я тобі надішлю! 🔔`,
  );

  await new Promise((resolve) => setTimeout(resolve, 500)); // delay to prevent bot from sending message too fast

  if (lastImageUrl !== null) {
    await sendPhotoSafe(
      chatId,
      lastImageUrl,
      "🖼️ Знайшов для тебе останій актуальний графік світла",
    );
  }
});

bot.command("stop", async (ctx) => {
  const chatId = ctx.chat.id.toString();

  if (subscribers.has(chatId)) {
    await removeSubscriber(chatId);
    ctx.reply("😔 Ти відписався від розсилки. Щоб підписатися знову — /start");
  } else {
    ctx.reply("🤔 Ти й так не підписаний. Натисни /start щоб підписатися!");
  }
});

bot.command("status", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const isSubscribed = subscribers.has(chatId);
  const lastImageUrl = subscribers?.lastImageUrl(chatId);

  ctx.reply(
    `📊 Статус:\n\n` +
      `• Підписка: ${isSubscribed ? "✅ Активна" : "❌ Неактивна"}\n` +
      `• Всього підписників: ${subscribers.size()}\n` +
      `• Останній графік: ${lastImageUrl ? "✅ Знайдено" : "⏳ Очікується"}`,
  );
});

bot.command("lastImage", async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const isSubscribed = subscribers.has(chatId);
    const lastImageUrl = subscribers.lastImageUrl(chatId);
    const { imageUrl } = await getFirstImageFromPage(PAGE_URL);
    const sameImage = imageUrl === lastImageUrl;

    if (sameImage && isSubscribed) {
      await sendPhotoSafe(
        chatId,
        imageUrl,
        "🖼️ Останній графік доступний на сьогодні",
      );
    } else {
      ctx.reply("⏳ Останній графік ще не доступний.");
    }
  } catch (error) {
    console.error("❌ Помилка в команді /lastImage:", error);
    ctx.reply("❌ Виникла помилка при отриманні останнього графіка.");
  }
});

bot.catch((err, ctx) => {
  console.error(`❌ Помилка для ${ctx.updateType}:`, err.message);
  if (isDev) console.error(err.stack);
});

// ---------- Graceful shutdown ----------
const shutdown = async (signal) => {
  console.log(`\n📴 ${signal} отримано, зупиняємо бота...`);
  await pool.end();
  bot.stop(signal);
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

// ---------- start ----------
(async () => {
  try {
    await initDB();

    await loadSubscribers();

    bot.launch();

    console.log(`🤖 Режим: ${isDev ? "DEV" : "PRODUCTION"}`);
    console.log(`📊 Підписників: ${subscribers.size()}`);
    console.log(`🔄 Інтервал: ${CHECK_INTERVAL / 1000} сек`);
    console.log(`🌐 URL: ${PAGE_URL}`);

    console.log("🚀 Запускаємо бота...");

    console.log("✅ Бот запущено");

    console.log("🔍 Перша перевірка");
    watcher();
    setInterval(watcher, CHECK_INTERVAL);
  } catch (err) {
    console.error("❌ Помилка запуску бота:", err);
    process.exit(1);
  }
})();
