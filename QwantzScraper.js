import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

function cacheGet(name) {
  if (fs.existsSync(`./cache/${name}.html`)) {
    return fs.readFileSync(`./cache/${name}.html`);
  }
  return false;
}

function cacheSet(name, value) {
  if (!fs.existsSync("./cache")) {
    fs.mkdirSync("./cache");
  }
  fs.writeFileSync(`./cache/${name}.html`, value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url, filepath) {
  if (fs.existsSync(filepath)) return;
  const writer = fs.createWriteStream(filepath);
  const response = await axios({ url, method: "GET", responseType: "stream" });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function scrapeQwantz() {
  let url = "https://www.qwantz.com/index.php";

  if (!fs.existsSync("./images")) {
    fs.mkdirSync("./images");
  }

  for (let i = 0; i < 10; i++) {
    const cacheName = url.replace(/[:\/?=&]/g, "_");
    let html = cacheGet(cacheName);

    if (!html) {
      await sleep(1000);
      const res = await axios.get(url);
      html = res.data;
      cacheSet(cacheName, html);
    }

    const $ = cheerio.load(html);
    const imgElem = $("img.comic");
    const imgSrc = imgElem.attr("src");

    if (
      imgSrc &&
      imgSrc.startsWith("comics/comic2-") &&
      imgSrc.endsWith(".png")
    ) {
      const imgUrl = new URL(imgSrc, url).href;
      const filename = path.basename(imgUrl);
      const filepath = path.join("images", filename);

      await downloadImage(imgUrl, filepath);
    }

    const prevHref = $("a[rel='prev']").attr("href");
    if (!prevHref) break;
    url = new URL(prevHref, url).href;
  }
}

scrapeQwantz().catch(console.error);
