import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const DIST = resolve("dist");
const BASE = "/faja-heavy-crude-sim/";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const send = (res, status, body = "", type = "text/plain; charset=utf-8") => {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
};

export async function startServer(port = 4176) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);

      if (pathname === "/") {
        res.writeHead(302, { location: BASE });
        res.end();
        return;
      }
      if (pathname === BASE.slice(0, -1)) {
        res.writeHead(302, { location: BASE });
        res.end();
        return;
      }
      if (!pathname.startsWith(BASE)) {
        send(res, 404, "Not found");
        return;
      }

      let relative = pathname.slice(BASE.length);
      if (!relative || relative.endsWith("/")) relative += "index.html";
      const file = resolve(DIST, relative);
      if (file !== DIST && !file.startsWith(`${DIST}${sep}`)) {
        send(res, 403, "Forbidden");
        return;
      }

      const info = await stat(file);
      if (!info.isFile()) {
        send(res, 404, "Not found");
        return;
      }
      const body = await readFile(file);
      send(res, 200, body, TYPES[extname(file)] ?? "application/octet-stream");
    } catch {
      send(res, 404, "Not found");
    }
  });

  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", done);
  });

  return {
    server,
    origin: `http://127.0.0.1:${port}`,
    url: `http://127.0.0.1:${port}${BASE}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
