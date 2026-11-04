const p = app.plugins.plugins["emotion-tracker"];
const d = window.moment("2030-01-01");
const s = p.store;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await s.addEntry(d, "07:10", "Calm", "walk | around");
await s.addEntry(d, "14:00", "Stressed", "work");
await s.addEntry(d, "22:30", "Stressed", "");
await s.addEntry(d, "23:00", "Calm", "");
await wait(500);
const a = await s.day(d);
await s.setMood(d, "Grateful");
await wait(500);
const b = await s.day(d);
await s.removeEntry(d, a.entries[0].raw);
await s.setMood(d, null);
await wait(500);
const c = await s.day(d);
const file = await s.fileFor(d);
const text = await app.vault.read(file);
return { path: file.path, autoMood: a.mood, slots: a.entries.map((e) => [e.time, e.emotion, e.note, s.slotOf(e.time)]),
  manual: [b.manualMood, b.mood], afterRemove: [c.entries.length, c.mood, c.manualMood], text,
  slot0300: s.slotOf("03:00"), color: s.colorOf("Despair") };
