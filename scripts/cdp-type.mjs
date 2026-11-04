// Usage: node scripts/cdp-type.mjs "text"  — sends real key events to the focused element
const pages = await (await fetch("http://localhost:9222/json")).json();
const ws = new WebSocket(pages.find((p) => p.title.includes("Obsidian")).webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const send = (method, params) =>
  new Promise((r) => {
    const my = ++id;
    ws.addEventListener("message", function h(m) {
      if (JSON.parse(m.data).id === my) { ws.removeEventListener("message", h); r(); }
    });
    ws.send(JSON.stringify({ id: my, method, params }));
  });
for (const ch of process.argv[2]) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
}
ws.close();
