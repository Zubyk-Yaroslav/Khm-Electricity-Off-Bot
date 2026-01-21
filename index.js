require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");
const { getFirstImageFromPage } = require("./services/ocrService");

const isDev = process.env.NODE_ENV !== "production";

const bot = new Telegraf(process.env.BOT_TOKEN);

// ------------------- Слідкування за новою картинкою -------------------

// Зберігаємо останню картинку для кожного чату
const lastImageByChat = new Map();

// Формуємо підпис з датою
function formatCaption(dateString) {
  return `Графік відключень на ${dateString}`;
}

// Безпечна відправка картинки
async function sendImage(ctx, imageUrl, caption) {
  try {
    if (isDev) {
      console.log(
        "Відправляю картинку:",
        imageUrl,
        "Підпис:",
        caption,
        "в чат:",
        ctx.chat.id,
      );
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
    console.error("Помилка при відправці картинки:", err.message);
  }
}

// Перевірка та відправка нової картинки для конкретного чату
async function checkForNewImage(ctx) {
  const pageUrl = "https://hoe.com.ua/page/pogodinni-vidkljuchennja";
  try {
    const { imageUrl, date } = await getFirstImageFromPage(pageUrl);
    if (!imageUrl) return;

    const lastImage = lastImageByChat.get(ctx.chat.id);
    console.log("Остання картинка для чату", ctx.chat.id, ":", lastImage);

    // Відправляємо лише якщо картинка нова для цього чату
    if (imageUrl !== lastImage) {
      lastImageByChat.set(ctx.chat.id, imageUrl);
      const caption = formatCaption(date);
      await sendImage(ctx, imageUrl, caption);
    }
  } catch (err) {
    console.error("Помилка при перевірці графіка:", err.message);
  }
}

// ------------------- Запуск слідкування -------------------

// Використовуємо для кожного чату окремий інтервал
function startWatching(ctx) {
  checkForNewImage(ctx); // Відправляємо останню картинку одразу

  // Перевірка оновлень кожну хвилину для цього чату
  setInterval(() => checkForNewImage(ctx), 60000);
}

// ------------------- Бот -------------------

bot.start((ctx) => {
  if (isDev) {
    console.log("DEV REPLY: Привіт!");
  } else {
    ctx.reply(
      "Привіт! Я бот для графіків відключень світла в Хмельницькій області.",
    );
  }

  startWatching(ctx); // Автоматично запускаємо слідкування для цього чату
});

// ------------------- Запуск -------------------
bot.launch().then(() => {
  console.log("Бот запущено. Dev mode:", isDev);
});
