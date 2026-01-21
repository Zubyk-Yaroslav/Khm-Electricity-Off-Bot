const Tesseract = require("tesseract.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

async function parseImage(url) {
  const response = await axios({ url, responseType: "arraybuffer" });
  const filePath = path.join(__dirname, "temp.png");
  fs.writeFileSync(filePath, response.data);

  const {
    data: { text },
  } = await Tesseract.recognize(filePath, "ukr"); // українська
  fs.unlinkSync(filePath); // видаляємо тимчасову картинку
  return text;
}

async function parseScheduleText(imageUrl) {
  // Завантажуємо картинку
  const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });

  // Використовуємо Tesseract.js для розпізнавання тексту
  const result = await Tesseract.recognize(data, "ukr"); // мова українська
  return result.data.text;
}

async function getFirstImageFromPage(pageUrl) {
  const { data: html } = await axios.get(pageUrl);
  const $ = cheerio.load(html);

  // Перша картинка
  const imgSrc = $(".content-main .post img").first().attr("src");
  if (!imgSrc) throw new Error("Картинка не знайдена на сторінці");

  // Абсолютний URL картинки
  const absoluteUrl = imgSrc.startsWith("https")
    ? imgSrc
    : new URL(imgSrc, pageUrl).href;

  // ------------------- OCR для отримання тексту -------------------
  let captionDate = "не визначено";
  try {
    const textFromImage = await parseScheduleText(absoluteUrl);

    // Шукаємо рядок, який починається з "Графік погодинних відключень на"
    const match = textFromImage.match(
      /Графік погодинних відключень на\s*(.*)/i,
    );

    if (match && match[1]) {
      captionDate = match[1].trim(); // беремо все після "на"
    }
  } catch (err) {
    console.error("Помилка OCR:", err.message);
  }

  return {
    imageUrl: absoluteUrl,
    date: captionDate,
  };
}

module.exports = { parseImage, getFirstImageFromPage, parseScheduleText };
