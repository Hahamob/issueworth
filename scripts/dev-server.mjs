import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = normalize(new URL("../frontend/", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    let path = normalize(join(root, pathname === "/" ? "index.html" : pathname));
    if (!path.startsWith(root)) throw new Error("Invalid path");
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    response.writeHead(200, { "content-type": `${types[extname(path)] || "application/octet-stream"}; charset=utf-8` });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`IssueWorth preview: http://127.0.0.1:${port}`));
