// Usage: node scripts/cdp-shot.mjs out.png
import { writeFileSync } from "node:fs";

const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((p) => p.title.includes("Obsidian"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => {
  writeFileSync(process.argv[2], Buffer.from(JSON.parse(m.data).result.data, "base64"));
  ws.close();
};
ws.send(JSON.stringify({ id: 1, method: "Page.captureScreenshot", params: { format: "png" } }));
