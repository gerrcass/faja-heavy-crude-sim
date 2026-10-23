import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "public");
const TMP = join(tmpdir(), "faja-icons");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const chrome = process.env.CHROME_PATH || ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"].find((path) => {
  try {
    execFileSync(path, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});

if (!chrome) {
  console.error("No Chrome found. Set CHROME_PATH to generate the PNG icons.");
  process.exit(1);
}

const icon = (size) => `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#f2ece1}
  svg{display:block;width:${size}px;height:${size}px}
</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#f2ece1"/>
  <path d="M10 25 32 13l22 12-22 12Z" fill="#b85c12"/>
  <path d="M10 33.5 32 45.5l22-12" fill="none" stroke="#201d18" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M10 42 32 54l22-12" fill="none" stroke="#201d18" stroke-width="3.4" stroke-linejoin="round"/>
  <circle cx="50" cy="16" r="3.4" fill="#201d18"/>
</svg>`;

const og = `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f2ece1;color:#201d18}
  body{padding:56px 64px;font-family:Georgia,"Times New Roman",serif;display:flex;flex-direction:column;justify-content:space-between}
  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .kick{font:11px/1.4 "Courier New",monospace;letter-spacing:.18em;text-transform:uppercase;color:#6e6558}
  .mark{font-size:34px;font-weight:700;letter-spacing:-.03em}
  h1{font-size:100px;line-height:.94;letter-spacing:-.045em;margin:54px 0 0;font-weight:400}
  h1 em{font-style:italic;color:#b85c12}
  .bottom{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #b8a994;padding-top:16px}
  .bottom p{margin:0;font:13px/1.5 "Courier New",monospace;color:#6e6558;max-width:620px}
  .stamp{text-align:right;font:12px/1.6 "Courier New",monospace;color:#6e6558}
  .stamp strong{display:block;font:700 48px/1 Georgia,serif;color:#201d18;letter-spacing:-.03em}
  svg{width:86px;height:86px}
</style>
<div class="top">
  <div class="kick">Orinoco Belt · Venezuela · Field guide 01</div>
  <div class="mark">Faja 8°</div>
</div>
<div>
  <h1>The oil is there.<br><em>The problem is moving it.</em></h1>
</div>
<div class="bottom">
  <div>
    <p>A field guide to extra-heavy crude: reservoir, cold production, steam, lift, separation, blend and upgrade.</p>
    <p style="margin-top:10px">gerrcass.github.io/faja-heavy-crude-sim</p>
  </div>
  <div class="stamp">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M8 26 32 13l24 13-24 13Z" fill="#b85c12"/>
      <path d="M8 35.5 32 48.5l24-13" fill="none" stroke="#201d18" stroke-width="3" stroke-linejoin="round"/>
      <path d="M8 44 32 57l24-13" fill="none" stroke="#201d18" stroke-width="3" stroke-linejoin="round"/>
    </svg>
    <strong>8° API</strong>
    illustrative model · real sources
  </div>
</div>`;

function shot(html, name, width, height) {
  const page = join(TMP, `${name}.html`);
  writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--screenshot=${join(OUT, name)}`,
      `file://${page}`,
    ],
    { stdio: "ignore" },
  );
  console.log(`wrote public/${name}`);
}

shot(icon(32), "favicon-32.png", 32, 32);
shot(icon(180), "apple-touch-icon.png", 180, 180);
shot(og, "og.png", 1200, 630);
