import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { chromePort } from "./anatomy/chrome-port.mjs";

const PORT = 4175;
const URL = `http://127.0.0.1:${PORT}/faja-heavy-crude-sim/`;
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const chromePath = () => CHROME_CANDIDATES.find((path) => existsSync(path));

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(URL);
      if (response.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Preview server did not answer at ${URL}`);
}

async function main() {
  mkdirSync("shots", { recursive: true });
  mkdirSync("assets", { recursive: true });
  const cwd = resolve(process.cwd());
  const server = spawn(process.execPath, [join(cwd, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd,
    stdio: "ignore",
  });
  const profile = mkdtempSync(join(tmpdir(), "faja-shots-"));
  const chrome = spawn(chromePath(), [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ]);
  const problems = [];
  try {
    await waitForServer();
    const port = await chromePort(chrome, profile);
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      } else if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
        problems.push(data.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
      } else if (data.method === "Runtime.exceptionThrown") {
        problems.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
      }
    };
    await new Promise((done) => (socket.onopen = done));
    const send = (method, params = {}) =>
      new Promise((done, fail) => {
        const call = ++id;
        const timer = setTimeout(() => {
          pending.delete(call);
          fail(new Error(`Chrome did not answer ${method}`));
        }, 60000);
        pending.set(call, (data) => {
          clearTimeout(timer);
          done(data);
        });
        socket.send(JSON.stringify({ id: call, method, params }));
      });
    const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "try { localStorage.removeItem('faja-theme'); } catch {}" });

    const viewport = async (width, height) => {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    };
    const load = async (theme = "light", reduced = true) => {
      await send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-color-scheme", value: theme },
          ...(reduced ? [{ name: "prefers-reduced-motion", value: "reduce" }] : []),
        ],
      });
      const loaded = new Promise((done) => {
        const original = socket.onmessage;
        socket.onmessage = (message) => {
          const data = JSON.parse(message.data);
          if (data.method === "Page.loadEventFired") done();
          original(message);
        };
        setTimeout(done, 10000);
      });
      const navigation = await send("Page.navigate", { url: `${URL}?shot=${Date.now()}` });
      if (navigation.error) throw new Error(navigation.error.message);
      await loaded;
      await sleep(900);
      await evaluate(`(() => {
        document.querySelectorAll('[data-reveal]').forEach((el) => { el.removeAttribute('data-reveal'); el.classList.add('is-visible'); });
        const skip = document.querySelector('.skip-link'); if (skip) skip.style.display = 'none';
        return true;
      })()`);
      await sleep(150);
      await setTheme(theme);
    };
    const setTheme = async (theme) => {
      const current = await evaluate(`document.documentElement.dataset.theme`);
      if (current !== theme) {
        await evaluate(`document.querySelector('[data-theme-toggle]').click()`);
        await sleep(250);
      }
    };
    const hideChrome = async () => {
      await evaluate(`(() => { const m = document.querySelector('.masthead'); if (m) m.style.display = 'none'; const s = document.querySelector('.skip-link'); if (s) s.style.display = 'none'; return true; })()`);
    };
    const shot = async (path, selector, scale = 1) => {
      const box = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
      })()`);
      if (!box) throw new Error(`Selector not found: ${selector}`);
      await sleep(600);
      const result = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale },
      });
      const output = resolve(path);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, Buffer.from(result.result.data, "base64"));
      console.log(`saved ${path} (${Math.round(box.w)}×${Math.round(box.h)})`);
    };
    const full = async (path, width, height) => {
      const result = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      });
      writeFileSync(resolve(path), Buffer.from(result.result.data, "base64"));
      console.log(`saved ${path} (${width}×${height})`);
    };

    await viewport(1440, 1000);
    await load("light");
    await full("shots/desktop-light.png", 1440, 1900);
    await setTheme("dark");
    await full("shots/desktop-dark.png", 1440, 1900);

    await viewport(390, 844);
    await load("light");
    await full("shots/mobile-light.png", 390, 1900);
    await setTheme("dark");
    await full("shots/mobile-dark.png", 390, 1900);

    await viewport(1440, 1050);
    await load("light");
    await hideChrome();
    await shot("assets/faja-field-guide.png", ".iso-plate", 1.2);
    await shot("shots/figure-light.png", ".iso-plate");
    await evaluate(`document.querySelector('[data-station-button="separation"]').click()`);
    await sleep(300);
    await shot("shots/figure-separation-light.png", ".iso-plate");
    await load("dark");
    await hideChrome();
    await shot("shots/figure-dark.png", ".iso-plate");

    await viewport(390, 900);
    await load("light");
    await hideChrome();
    await shot("shots/figure-mobile-light.png", ".iso-plate");
    await setTheme("dark");
    await shot("shots/figure-mobile-dark.png", ".iso-plate");

    await viewport(1440, 1100);
    await load("light");
    await hideChrome();
    await shot("shots/desk-light.png", ".desk");
    await setTheme("dark");
    await shot("shots/desk-dark.png", ".desk");

    const sideways = await evaluate(`document.documentElement.scrollWidth > innerWidth + 1`);
    const title = await evaluate(`document.title`);
    console.log(`title "${title}" · scrolls sideways: ${sideways ? "YES" : "no"}`);
    console.log(problems.length ? `console: ${problems.join("\n")}` : "console: clean");
    socket.close();
  } finally {
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
