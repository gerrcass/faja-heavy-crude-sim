import { existsSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error("No Chrome or Chromium found. Set CHROME_PATH.");
  process.exit(1);
}

const favicon = readFileSync("public/favicon.svg", "utf8");
const og = readFileSync("public/og.svg", "utf8");
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const render = async (svg, width, height, path, transparent = false) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:${transparent ? "transparent" : "#f2ece1"}}svg{display:block;width:100%;height:100%}</style>${svg}`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path, omitBackground: transparent });
  await page.close();
  console.log(`wrote ${path}`);
};

await render(favicon, 32, 32, "public/favicon-32.png", true);
await render(favicon, 180, 180, "public/apple-touch-icon.png", true);
await render(og, 1200, 630, "public/og.png", false);

await browser.close();
