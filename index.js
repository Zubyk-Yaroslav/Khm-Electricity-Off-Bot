require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");
const { getFirstImageFromPage } = require("./services/ocrService");

const isDev = process.env.NODE_ENV !== "production";

function safeReply(ctx, msg) {
  if (isDev) {
    console.log("DEV REPLY:", msg);
  } else {
    ctx.reply(msg);
  }
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// ------------------- Слідкування за новою картинкою -------------------
let lastImageUrl = null;

// Функція для формування підпису з датою
function formatCaption(dateString) {
  return `Графік відключень на ${dateString}`;
}

// Відправка картинки
async function sendImage(ctx, imageUrl, caption) {
  try {
    if (isDev) {
      console.log("Відправляю картинку:", imageUrl, "Підпис:", caption);
    } else {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { source: Buffer.from(response.data, "binary") },
        { caption: caption },
      );
    }
  } catch (err) {
    console.error("Помилка при відправці картинки:", err.message);
  }
}

// Перевірка та відправка нової картинки
async function checkForNewImage(ctx) {
  const pageUrl = "https://hoe.com.ua/page/pogodinni-vidkljuchennja";
  try {
    const { imageUrl, date } = await getFirstImageFromPage(pageUrl);
    // Тут припускаємо, що getFirstImageFromPage повертає об'єкт { imageUrl, date }

    console.log(imageUrl, date);

    if (!imageUrl) return;

    // Якщо нова картинка або ще нічого не надсилали
    if (imageUrl !== lastImageUrl) {
      lastImageUrl = imageUrl;
      const caption = formatCaption(date);
      await sendImage(ctx, imageUrl, caption);
    }
  } catch (err) {
    console.error("Помилка при перевірці графіка:", err.message);
  }
}

// ------------------- Запуск слідкування -------------------
async function startWatching(ctx) {
  await checkForNewImage(ctx); // Відправляємо останню картинку одразу
  setInterval(() => checkForNewImage(ctx), 60000); // Перевірка оновлень кожну хвилину
}

// ------------------- Бот -------------------
bot.start((ctx) => {
  safeReply(
    ctx,
    "Привіт! Я бот для графіків відключень світла в Хмельницькій області.",
  );
  startWatching(ctx); // Автоматично запускаємо watch при старті
});

// ------------------- Запуск -------------------
bot.launch();
console.log("Бот запущено. Dev mode:", isDev);
