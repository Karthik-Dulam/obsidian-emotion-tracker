// Usage: node scripts/cdp-eval.mjs <file.js|expr>  (Obsidian started with --remote-debugging-port=9222)
import { readFileSync, existsSync } from "node:fs";

const arg = process.argv[2];
const expr = existsSync(arg) ? readFileSync(arg, "utf8") : arg;
const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((p) => p.title.includes("Obsidian"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => {
  const { result } = JSON.parse(m.data);
  console.log(result.exceptionDetails ? `ERR ${JSON.stringify(result.exceptionDetails.exception?.description)}` : JSON.stringify(result.result.value, null, 1));
  ws.close();
};
ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true } }));
