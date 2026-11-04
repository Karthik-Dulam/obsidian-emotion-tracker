import { ItemView, MarkdownRenderChild, WorkspaceLeaf, debounce, moment, setIcon } from "obsidian";
import type EmotionTrackerPlugin from "./main";
import { LogModal, MoodModal } from "./modals";

export const VIEW_TYPE = "emotion-tracker-view";

type Mode = "week" | "year";

// Renders a week or year tracker into an element and re-renders on vault changes.
export class Tracker {
  private offset = 0;
  private generation = 0;

  constructor(private plugin: EmotionTrackerPlugin, private el: HTMLElement, public mode: Mode) {}

  async render() {
    const gen = ++this.generation;
    const el = createDiv();
    const nav = el.createDiv({ cls: "et-nav" });
    const prev = nav.createEl("button", { cls: "et-icon-btn" });
    setIcon(prev, "chevron-left");
    const title = nav.createDiv({ cls: "et-nav-title" });
    const next = nav.createEl("button", { cls: "et-icon-btn" });
    setIcon(next, "chevron-right");
    prev.onclick = () => this.shift(-1);
    next.onclick = () => this.shift(1);
    title.onclick = () => this.shift(-this.offset);

    if (this.mode === "week") await this.renderWeek(el, title);
    else await this.renderYear(el, title);
    if (gen !== this.generation) return;
    this.el.addClass("et-tracker");
    this.el.replaceChildren(...Array.from(el.childNodes));
  }

  private shift(d: number) {
    this.offset += d;
    this.render();
  }

  private async renderWeek(el: HTMLElement, title: HTMLElement) {
    const { store, settings } = this.plugin;
    const start = moment().startOf("week").add(this.offset, "week");
    title.setText(`${start.format("D MMM")} – ${start.clone().add(6, "day").format("D MMM YYYY")}`);
    const days = await store.days(start, 7);
    const today = moment().format("YYYY-MM-DD");

    const grid = el.createDiv({ cls: "et-week" });
    grid.createDiv({ cls: "et-corner" });
    for (const d of days) {
      const head = grid.createDiv({ cls: "et-day-head" });
      head.toggleClass("is-today", d.date.format("YYYY-MM-DD") === today);
      head.createDiv({ text: d.date.format("dd")[0] });
      head.createDiv({ cls: "et-day-num", text: d.date.format("D") });
      const mood = head.createDiv({ cls: "et-day-mood" });
      if (d.mood) mood.style.backgroundColor = store.colorOf(d.mood);
      head.onclick = () => new MoodModal(this.plugin.app, this.plugin, d.date).open();
    }
    settings.slots.forEach((slot, si) => {
      grid.createDiv({ cls: "et-slot-name", text: slot.name });
      for (const d of days) {
        const cell = grid.createDiv({ cls: "et-cell" });
        const entries = d.entries.filter((e) => store.slotOf(e.time) === si);
        for (const e of entries) {
          const stripe = cell.createDiv({ cls: "et-stripe", text: e.emotion });
          stripe.style.setProperty("--et-color", store.colorOf(e.emotion));
          stripe.title = `${e.time} ${e.emotion}${e.note ? ` · ${e.note}` : ""}`;
        }
        cell.onclick = () => {
          const now = moment();
          const time = d.date.isSame(now, "day") && store.slotOf(now.format("HH:mm")) === si
            ? now.format("HH:mm")
            : slot.start;
          new LogModal(this.plugin.app, this.plugin, d.date, time).open();
        };
      }
    });
    this.renderLegend(el, days.flatMap((d) => d.entries.map((e) => e.emotion)));
  }

  private async renderYear(el: HTMLElement, title: HTMLElement) {
    const { store } = this.plugin;
    const year = moment().year() + this.offset;
    title.setText(String(year));
    const start = moment({ year, month: 0, day: 1 });
    const days = await store.days(start, start.isLeapYear() ? 366 : 365);
    const byKey = new Map(days.map((d) => [d.date.format("MM-DD"), d]));
    const today = moment().format("YYYY-MM-DD");

    const grid = el.createDiv({ cls: "et-year" });
    grid.createDiv({ cls: "et-corner" });
    moment.monthsShort().forEach((m) => grid.createDiv({ cls: "et-month-head", text: m[0] }));
    for (let day = 1; day <= 31; day++) {
      grid.createDiv({ cls: "et-year-num", text: String(day) });
      for (let month = 0; month < 12; month++) {
        const d = byKey.get(`${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
        const cell = grid.createDiv({ cls: "et-year-cell" });
        if (!d) {
          cell.addClass("is-void");
          continue;
        }
        cell.toggleClass("is-today", d.date.format("YYYY-MM-DD") === today);
        if (d.mood) {
          cell.style.backgroundColor = store.colorOf(d.mood);
          cell.title = `${d.date.format("D MMM")}: ${d.mood}${d.manualMood ? " (set)" : " (auto)"}`;
        }
        cell.toggleClass("is-manual", !!d.manualMood);
        cell.onclick = () => new MoodModal(this.plugin.app, this.plugin, d.date).open();
      }
    }
    this.renderLegend(el, days.map((d) => d.mood).filter((m): m is string => !!m));
  }

  private renderLegend(el: HTMLElement, emotions: string[]) {
    const counts = new Map<string, number>();
    emotions.forEach((e) => counts.set(e, (counts.get(e) ?? 0) + 1));
    if (!counts.size) return;
    const legend = el.createDiv({ cls: "et-legend" });
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, n]) => {
        const item = legend.createDiv({ cls: "et-legend-item" });
        item.createSpan({ cls: "et-dot" }).style.backgroundColor = this.plugin.store.colorOf(name);
        item.createSpan({ text: `${name} ${n}` });
      });
  }
}

const watch = (plugin: EmotionTrackerPlugin, tracker: Tracker, register: (cb: () => void) => void) => {
  const rerender = debounce(() => tracker.render(), 300, true);
  const ref = plugin.app.metadataCache.on("changed", rerender);
  register(() => plugin.app.metadataCache.offref(ref));
  plugin.onSettingsChange.add(rerender);
  register(() => plugin.onSettingsChange.delete(rerender));
};

export class TrackerView extends ItemView {
  private tracker!: Tracker;

  constructor(leaf: WorkspaceLeaf, private plugin: EmotionTrackerPlugin) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Emotion tracker";
  }

  getIcon() {
    return "heart-pulse";
  }

  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("et-view");
    const tabs = root.createDiv({ cls: "et-tabs" });
    const body = root.createDiv();
    this.tracker = new Tracker(this.plugin, body, "week");
    const tab = (mode: Mode, label: string) => {
      const b = tabs.createEl("button", { text: label, cls: "et-tab" });
      b.toggleClass("is-active", mode === this.tracker.mode);
      b.onclick = () => {
        this.tracker.mode = mode;
        tabs.querySelectorAll(".et-tab").forEach((t) => t.removeClass("is-active"));
        b.addClass("is-active");
        this.tracker.render();
      };
    };
    tab("week", "Week");
    tab("year", "Year");
    const log = tabs.createEl("button", { cls: "mod-cta et-log-btn", text: "Log" });
    log.onclick = () => new LogModal(this.app, this.plugin, moment()).open();
    watch(this.plugin, this.tracker, (cb) => this.register(cb));
    await this.tracker.render();
  }
}

export class TrackerBlock extends MarkdownRenderChild {
  constructor(private plugin: EmotionTrackerPlugin, el: HTMLElement, private mode: Mode) {
    super(el);
  }

  onload() {
    const tracker = new Tracker(this.plugin, this.containerEl, this.mode);
    watch(this.plugin, tracker, (cb) => this.register(cb));
    tracker.render();
  }
}
