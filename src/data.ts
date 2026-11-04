import { App, TFile, moment, normalizePath } from "obsidian";
import { familiesOf } from "./chart";

export interface Settings {
  slots: { name: string; start: string }[];
}

export const DEFAULT_SETTINGS: Settings = {
  slots: [
    { name: "Early morning", start: "04:00" },
    { name: "Morning", start: "08:00" },
    { name: "Afternoon", start: "12:00" },
    { name: "Evening", start: "17:00" },
    { name: "Before bed", start: "21:00" },
  ],
};

export interface Entry {
  time: string;
  emotion: string;
  note: string;
  raw: string;
}

export interface Day {
  date: moment.Moment;
  file: TFile | null;
  entries: Entry[];
  manualMood: string | null;
  mood: string | null;
}

const ENTRY_RE = /^(\d{1,2}:\d{2})\s+([^|]+?)\s*(?:\|\s*(.*))?$/;

export const parseEntry = (raw: string): Entry | null => {
  const m = ENTRY_RE.exec(raw.trim());
  return m ? { time: m[1].padStart(5, "0"), emotion: m[2], note: m[3] ?? "", raw } : null;
};

export const formatEntry = (time: string, emotion: string, note: string) =>
  note.trim() ? `${time} ${emotion.trim()} | ${note.trim()}` : `${time} ${emotion.trim()}`;

export const deriveMood = (entries: Entry[]): string | null => {
  const counts = new Map<string, number>();
  let best: string | null = null;
  for (const e of [...entries].sort((a, b) => a.time.localeCompare(b.time))) {
    const n = (counts.get(e.emotion) ?? 0) + 1;
    counts.set(e.emotion, n);
    if (best === null || n >= (counts.get(best) ?? 0)) best = e.emotion;
  }
  return best;
};

interface DailyConfig {
  folder: string;
  format: string;
  template: string;
}

export class Store {
  constructor(private app: App, private settings: () => Settings) {}

  async dailyConfig(): Promise<DailyConfig> {
    const path = normalizePath(`${this.app.vault.configDir}/daily-notes.json`);
    const raw = (await this.app.vault.adapter.exists(path))
      ? JSON.parse(await this.app.vault.adapter.read(path))
      : {};
    return { folder: raw.folder ?? "", format: raw.format || "YYYY-MM-DD", template: raw.template ?? "" };
  }

  private pathFor(cfg: DailyConfig, date: moment.Moment) {
    return normalizePath(`${cfg.folder}/${date.format(cfg.format)}.md`);
  }

  async fileFor(date: moment.Moment): Promise<TFile | null> {
    return this.app.vault.getFileByPath(this.pathFor(await this.dailyConfig(), date));
  }

  async ensureFile(date: moment.Moment): Promise<TFile> {
    const cfg = await this.dailyConfig();
    const path = this.pathFor(cfg, date);
    const existing = this.app.vault.getFileByPath(path);
    if (existing) return existing;
    const tpl = cfg.template ? this.app.vault.getFileByPath(normalizePath(cfg.template.replace(/(\.md)?$/, ".md"))) : null;
    const body = tpl
      ? (await this.app.vault.read(tpl))
          .replace(/{{\s*date\s*}}/g, date.format(cfg.format))
          .replace(/{{\s*title\s*}}/g, date.format(cfg.format))
      : "";
    if (cfg.folder && !this.app.vault.getFolderByPath(normalizePath(cfg.folder))) {
      await this.app.vault.createFolder(cfg.folder);
    }
    return this.app.vault.create(path, body);
  }

  async days(start: moment.Moment, count: number): Promise<Day[]> {
    const cfg = await this.dailyConfig();
    return Array.from({ length: count }, (_, i) => {
      const date = start.clone().add(i, "day");
      const file = this.app.vault.getFileByPath(this.pathFor(cfg, date));
      const fm = file ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
      const rawEntries: unknown[] = Array.isArray(fm?.emotions) ? fm.emotions : [];
      const entries = rawEntries
        .map((r) => parseEntry(String(r)))
        .filter((e): e is Entry => e !== null)
        .sort((a, b) => a.time.localeCompare(b.time));
      const manualMood = fm?.mood ? String(fm.mood) : null;
      return { date, file, entries, manualMood, mood: manualMood ?? deriveMood(entries) };
    });
  }

  async day(date: moment.Moment): Promise<Day> {
    return (await this.days(date.clone().startOf("day"), 1))[0];
  }

  async addEntry(date: moment.Moment, time: string, emotion: string, note: string) {
    const file = await this.ensureFile(date);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.emotions = [...(Array.isArray(fm.emotions) ? fm.emotions : []), formatEntry(time, emotion, note)];
    });
  }

  async removeEntry(date: moment.Moment, raw: string) {
    const file = await this.fileFor(date);
    if (!file) return;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const list: unknown[] = Array.isArray(fm.emotions) ? fm.emotions : [];
      const i = list.findIndex((r) => String(r) === raw);
      if (i >= 0) list.splice(i, 1);
      if (list.length) fm.emotions = list;
      else delete fm.emotions;
    });
  }

  async setMood(date: moment.Moment, mood: string | null) {
    const file = mood ? await this.ensureFile(date) : await this.fileFor(date);
    if (!file) return;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (mood) fm.mood = mood;
      else delete fm.mood;
    });
  }

  colorOf(emotion: string): string {
    return familiesOf(emotion)[0]?.color ?? "#888888";
  }

  slotOf(time: string): number {
    const slots = this.settings().slots;
    const idx = slots.reduce((acc, s, i) => (time >= s.start ? i : acc), -1);
    return idx === -1 ? slots.length - 1 : idx;
  }
}
