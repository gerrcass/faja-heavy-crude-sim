import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromePort } from "./anatomy/chrome-port.mjs";

const PORT = 4174;
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

function chromePath() {
  return CHROME_CANDIDATES.find((path) => existsSync(path));
}

async function main() {
  const cwd = resolve(process.cwd());
  const server = spawn(process.execPath, [join(cwd, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd,
    stdio: "ignore",
  });

  const chromeBinary = chromePath();
  if (!chromeBinary) throw new Error("No Chrome binary found. Set CHROME_PATH.");
  const profile = mkdtempSync(join(tmpdir(), "faja-qa-"));
  const chrome = spawn(chromeBinary, [
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

  const failures = [];
  const passes = [];
  const consoleErrors = [];
  const check = (condition, message) => {
    if (condition) passes.push(message);
    else failures.push(message);
  };

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
        consoleErrors.push(data.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ").slice(0, 400));
      } else if (data.method === "Runtime.exceptionThrown") {
        consoleErrors.push((data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text).slice(0, 500));
      }
    };
    await new Promise((done) => (socket.onopen = done));

    const send = (method, params = {}) =>
      new Promise((done, fail) => {
        const call = ++id;
        const timer = setTimeout(() => {
          pending.delete(call);
          fail(new Error(`Chrome did not answer ${method} within 60 s`));
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

    const setViewport = async (width, height) => {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    };

    const load = async () => {
      const loaded = new Promise((done) => {
        const original = socket.onmessage;
        socket.onmessage = (message) => {
          const data = JSON.parse(message.data);
          if (data.method === "Page.loadEventFired") done();
          original(message);
        };
        setTimeout(done, 10000);
      });
      const navigation = await send("Page.navigate", { url: `${URL}?qa=${Date.now()}` });
      if (navigation.error) throw new Error(navigation.error.message);
      await loaded;
      await sleep(700);
    };

    for (const viewport of [
      { width: 1440, height: 1000, label: "desktop 1440" },
      { width: 390, height: 844, label: "mobile 390" },
    ]) {
      await setViewport(viewport.width, viewport.height);
      await load();
      const state = await evaluate(`(() => {
        const buttons = [...document.querySelectorAll('[data-station-button]')];
        const svg = document.querySelector('.train-figure');
        const glossary = document.querySelectorAll('.glossary__list > div').length;
        const sources = document.querySelectorAll('.source-list li').length;
        const chart = document.querySelector('[data-chart] svg');
        return {
          title: document.title,
          buttons: buttons.length,
          labels: buttons.map((button) => button.textContent.trim().replace(/\\s+/g, ' ')),
          role: svg && svg.getAttribute('role'),
          label: svg && svg.getAttribute('aria-label'),
          glossary,
          sources,
          chart: Boolean(chart),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth,
          theme: document.documentElement.dataset.theme,
        };
      })()`);

      check(state.title.includes("Faja 8°"), `${viewport.label}: title is present`);
      check(state.buttons === 6, `${viewport.label}: six station buttons`);
      check(state.role === "img" && typeof state.label === "string" && state.label.length > 60, `${viewport.label}: SVG has role=img and a meaningful label`);
      check(state.glossary >= 30, `${viewport.label}: glossary renders at least 30 terms (${state.glossary})`);
      check(state.sources >= 15, `${viewport.label}: sources section renders at least 15 entries (${state.sources})`);
      check(state.chart, `${viewport.label}: blend-viscosity chart is present`);
      check(state.scrollWidth <= state.innerWidth + 1, `${viewport.label}: no horizontal scroll (${state.scrollWidth} ≤ ${state.innerWidth})`);

      const simulated = await evaluate(`(async () => {
        const read = () => document.querySelector('[data-output="oilRate"]').textContent.trim();
        const slider = document.querySelector('[data-input="steamRate"]');
        const before = read();
        slider.value = '400';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        const after = read();
        const sor = document.querySelector('[data-output="sor"]').textContent.trim();
        const chartSvg = document.querySelector('[data-chart] svg');
        const marker = Boolean(document.querySelector('.chart-marker'));
        const diluent = document.querySelector('[data-input="diluent"]');
        diluent.value = '10';
        diluent.dispatchEvent(new Event('input', { bubbles: true }));
        const banner = document.querySelector('[data-constraint]');
        const warned = banner.getAttribute('data-state');
        const warningText = banner.textContent.trim();
        const cold = document.querySelector('[data-preset="cold"]');
        cold.click();
        const coldSor = document.querySelector('[data-output="sor"]').textContent.trim();
        const steamDisabled = document.querySelector('[data-input="steamRate"]').disabled;
        const pressed = [...document.querySelectorAll('[data-preset]')].find((button) => button.getAttribute('aria-pressed') === 'true');
        return { before, after, sor, marker, chartSvg: Boolean(chartSvg), warned, warningText, coldSor, steamDisabled, preset: pressed && pressed.dataset.preset };
      })()`);
      check(simulated.before !== simulated.after, `${viewport.label}: steam lever updates the oil rate (${simulated.before} → ${simulated.after})`);
      check(simulated.marker && simulated.chartSvg, `${viewport.label}: chart marks the current point`);
      check(simulated.warned === "warn" && /off spec/i.test(simulated.warningText), `${viewport.label}: constraint banner warns at low diluent`);
      check(simulated.coldSor === "0.00" && simulated.steamDisabled && simulated.preset === "cold", `${viewport.label}: cold preset restores outputs and disables steam`);

      const station = await evaluate(`(async () => {
        const button = document.querySelector('[data-station-button="steam"]');
        button.click();
        await new Promise((done) => setTimeout(done, 60));
        const detail = document.querySelector('[data-station-detail]');
        return {
          pressed: button.getAttribute('aria-pressed'),
          readout: document.querySelector('[data-readout]').textContent.trim(),
          active: document.querySelectorAll('.station.is-active').length,
          dim: document.querySelectorAll('.station.is-dim').length,
          href: detail.querySelector('a') && detail.querySelector('a').getAttribute('href'),
          copy: detail.textContent.trim().length,
          theme: document.documentElement.dataset.theme,
        };
      })()`);
      check(station.pressed === "true" && station.active === 1 && station.dim === 5, `${viewport.label}: station selection lights one and dims five`);
      check(/Steam/.test(station.readout) && station.href === "#heat" && station.copy > 80, `${viewport.label}: station readout and section link update`);

      await evaluate(`document.querySelector('[data-theme-toggle]').click()`);
      const toggled = await evaluate(`document.documentElement.dataset.theme`);
      await evaluate(`document.querySelector('[data-theme-toggle]').click()`);
      const restored = await evaluate(`document.documentElement.dataset.theme`);
      check(toggled === "dark" && restored === "light", `${viewport.label}: theme toggle switches to ink and back`);

      check(consoleErrors.length === 0, `${viewport.label}: no console errors${consoleErrors.length ? ` (${consoleErrors.join("; ")})` : ""}`);
    }

    // The Anatomy line check runs on the same built page, while the preview server is up.
    try {
      execFileSync(process.execPath, [join(cwd, "tools/anatomy/lines.mjs"), URL, "--out", join(cwd, "shots/lines.png"), "--wait", "800"], {
        stdio: "inherit",
        env: { ...process.env, CHROME_PATH: chromeBinary },
      });
      check(true, "Anatomy line ends: 0");
    } catch {
      check(false, "Anatomy line ends: 0");
    }
  } finally {
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }

  for (const message of passes) console.log(`PASS  ${message}`);
  for (const message of failures) console.log(`FAIL  ${message}`);
  console.log(`\n${passes.length} passed · ${failures.length} failed`);
  if (consoleErrors.length) console.log(`console errors:\n${consoleErrors.join("\n")}`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
