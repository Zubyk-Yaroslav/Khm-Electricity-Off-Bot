require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");
const { getFirstImageFromPage } = require("./services/ocrService");

const isDev = process.env.NODE_ENV !== "production";

const bot = new Telegraf(process.env.BOT_TOKEN);

// ------------------- Функції -------------------

// Безпечне відправлення тексту
async function safeReply(ctx, msg) {
  try {
    if (isDev) {
      console.log("DEV REPLY:", msg);
    } else {
      await ctx.reply(msg);
    }
  } catch (err) {
    console.error(
      "Не вдалося відправити текст:",
      err.description || err.message,
    );
  }
}

// Формування підпису з датою
function formatCaption(dateString) {
  return `Графік відключень на ${dateString}`;
}

// Безпечна відправка картинки
async function sendImageSafe(ctx, imageUrl, caption) {
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
        { caption },
      );
    }
  } catch (err) {
    if (err.response && err.response.error_code === 403) {
      console.warn(
        `Бот не може писати в чат ${ctx.chat.id}, ігнорую повідомлення.`,
      );
    } else {
      console.error("Помилка при відправці картинки:", err.message);
    }
  }
}

// ------------------- Слідкування за картинкою -------------------

let lastImageUrl = null;

async function checkForNewImage(ctx) {
  const pageUrl = "https://hoe.com.ua/page/pogodinni-vidkljuchennja";
  try {
    const { imageUrl, date } = await getFirstImageFromPage(pageUrl);

    if (!imageUrl) return;

    // Відправляємо лише якщо картинка нова
    if (imageUrl !== lastImageUrl) {
      lastImageUrl = imageUrl;
      const caption = formatCaption(date);
      await sendImageSafe(ctx, imageUrl, caption);
    }
  } catch (err) {
    console.error("Помилка при перевірці графіка:", err.message);
  }
}

// Запуск слідкування
async function startWatching(ctx) {
  await checkForNewImage(ctx); // Відправляємо останню картинку одразу
  setInterval(() => checkForNewImage(ctx), 60000); // Перевірка кожну хвилину
}

// ------------------- Бот -------------------

bot.start(async (ctx) => {
  await safeReply(
    ctx,
    "Привіт! Я бот для графіків відключень світла в Хмельницькій області.",
  );
  startWatching(ctx); // автоматично запускаємо слідкування
});

// Додатково: безпечний обробник /schedule для ручної перевірки
bot.command("schedule", async (ctx) => {
  await checkForNewImage(ctx);
});

// ------------------- Запуск -------------------
bot.launch().then(() => {
  console.log("Бот запущено. Dev mode:", isDev);
});
