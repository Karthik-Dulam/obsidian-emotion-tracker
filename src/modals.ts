import { App, Modal, Setting, moment } from "obsidian";
import { CHART, Family, familiesOf } from "./chart";
import type EmotionTrackerPlugin from "./main";

const hint = (el: HTMLElement, emotion: string) => {
  el.empty();
  const families = familiesOf(emotion);
  if (!families.length) el.createDiv({ cls: "et-hint-row" }).createSpan({ cls: "et-hint-emotion", text: emotion });
  for (const f of families) {
    const row = el.createDiv({ cls: "et-hint-row" });
    row.createSpan({ cls: "et-hint-emotion", text: emotion });
    row.createSpan({ cls: "et-hint-family", text: f.name }).style.backgroundColor = f.color;
    row.createSpan({ cls: "et-hint-action", text: f.action });
  }
};

// Base emotion families that expand into the full chart, plus a search across it.
const renderPicker = (
  plugin: EmotionTrackerPlugin,
  container: HTMLElement,
  onPick: (emotion: string) => void,
) => {
  let selected: string | null = null;
  const highlight = () =>
    container.querySelectorAll<HTMLElement>(".et-chip").forEach((c) => c.toggleClass("is-selected", c.dataset.name === selected));

  const chip = (parent: HTMLElement, name: string, color = plugin.store.colorOf(name)) => {
    const el = parent.createEl("button", { cls: "et-chip", text: name });
    el.style.setProperty("--et-color", color);
    el.dataset.name = name;
    el.onclick = () => {
      selected = name;
      highlight();
      onPick(name);
    };
    return el;
  };

  const group = (parent: HTMLElement, f: Family, emotions: string[]) => {
    const g = parent.createDiv({ cls: "et-group" });
    const head = g.createDiv({ cls: "et-group-head" });
    head.createSpan({ cls: "et-hint-family", text: f.name }).style.backgroundColor = f.color;
    head.createSpan({ cls: "et-hint-action", text: f.action });
    const row = g.createDiv({ cls: "et-chips" });
    [...new Set(emotions)].forEach((e) => chip(row, e, f.color));
  };

  const families = container.createDiv({ cls: "et-families" });
  const panel = container.createDiv({ cls: "et-results" });
  let open: string | null = null;
  const tabs = CHART.map((f) => {
    const tab = families.createEl("button", { cls: "et-family-tab", text: f.name });
    tab.style.setProperty("--et-color", f.color);
    tab.onclick = () => {
      open = open === f.name ? null : f.name;
      search.value = "";
      showFamily();
    };
    return tab;
  });
  const showFamily = () => {
    panel.empty();
    tabs.forEach((t) => t.toggleClass("is-open", t.textContent === open));
    const f = CHART.find((x) => x.name === open);
    if (f) group(panel, f, [f.name, ...f.emotions]);
    highlight();
  };

  const search = container.createEl("input", {
    cls: "et-search",
    attr: { type: "search", placeholder: "Search the emotion chart or type your own" },
  });

  search.oninput = () => {
    open = null;
    panel.empty();
    tabs.forEach((t) => t.removeClass("is-open"));
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    for (const f of CHART) {
      const hits = f.emotions.filter((e) => e.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
      if (hits.length) group(panel, f, hits);
    }
    const known = CHART.flatMap((f) => [f.name, ...f.emotions]);
    if (!known.some((e) => e.toLowerCase().includes(q))) {
      const custom = panel.createDiv({ cls: "et-chips" });
      const raw = search.value.trim().replace(/\|/g, "/");
      chip(custom, raw[0].toUpperCase() + raw.slice(1)).addClass("et-chip-custom");
    }
    highlight();
  };
  return search;
};

export class LogModal extends Modal {
  private emotion: string | null = null;
  private time: string;
  private note = "";

  constructor(app: App, private plugin: EmotionTrackerPlugin, private date: moment.Moment, time?: string) {
    super(app);
    this.time = time ?? moment().format("HH:mm");
  }

  async onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("et-modal");
    const setTitle = () => this.setTitle(`How are you feeling? · ${this.date.format("ddd D MMM")}`);
    setTitle();

    const timeRow = contentEl.createDiv({ cls: "et-time-row" });
    const dateInput = timeRow.createEl("input", { attr: { type: "date" }, value: this.date.format("YYYY-MM-DD") });
    dateInput.onchange = () => {
      const d = moment(dateInput.value, "YYYY-MM-DD", true);
      if (!d.isValid()) return;
      this.date = d;
      setTitle();
      this.renderExisting(existing);
    };
    const timeInput = timeRow.createEl("input", { attr: { type: "time" }, value: this.time });
    const slotLabel = timeRow.createSpan({ cls: "et-slot-label" });
    const updateSlot = () => (slotLabel.textContent = this.plugin.settings.slots[this.plugin.store.slotOf(this.time)].name);
    timeInput.onchange = () => {
      this.time = timeInput.value || this.time;
      updateSlot();
    };
    updateSlot();

    const hintEl = contentEl.createDiv({ cls: "et-hint" });
    renderPicker(this.plugin, contentEl, (e) => {
      this.emotion = e;
      hint(hintEl, e);
      save.setDisabled(false);
    });
    contentEl.appendChild(hintEl);

    const noteInput = contentEl.createEl("input", {
      cls: "et-note",
      attr: { type: "text", placeholder: "What are you doing? (optional)" },
    });
    noteInput.oninput = () => (this.note = noteInput.value);
    noteInput.onkeydown = (ev) => {
      if (ev.key === "Enter") this.save();
    };

    let save!: import("obsidian").ButtonComponent;
    new Setting(contentEl).addButton((b) => {
      save = b.setButtonText("Log").setCta().setDisabled(true).onClick(() => this.save());
    });

    const existing = contentEl.createDiv({ cls: "et-existing" });
    await this.renderExisting(existing);
  }

  private async renderExisting(el: HTMLElement) {
    el.empty();
    const day = await this.plugin.store.day(this.date);
    if (!day.entries.length) return;
    el.createDiv({ cls: "et-existing-head", text: "Logged this day" });
    for (const e of day.entries) {
      const row = el.createDiv({ cls: "et-entry" });
      row.createSpan({ cls: "et-dot" }).style.backgroundColor = this.plugin.store.colorOf(e.emotion);
      row.createSpan({ text: `${e.time} ${e.emotion}${e.note ? ` · ${e.note}` : ""}` });
      const del = row.createEl("button", { cls: "et-del", text: "✕", attr: { "aria-label": "Remove" } });
      del.onclick = async () => {
        await this.plugin.store.removeEntry(this.date, e.raw);
        setTimeout(() => this.renderExisting(el), 150);
      };
    }
  }

  private async save() {
    if (!this.emotion) return;
    await this.plugin.store.addEntry(this.date, this.time, this.emotion, this.note);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class MoodModal extends Modal {
  constructor(app: App, private plugin: EmotionTrackerPlugin, private date: moment.Moment) {
    super(app);
  }

  async onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass("et-modal");
    this.setTitle(`Mood for ${this.date.format("ddd D MMM YYYY")}`);
    const day = await this.plugin.store.day(this.date);

    const info = contentEl.createDiv({ cls: "et-mood-info" });
    info.setText(
      day.manualMood
        ? `Set manually: ${day.manualMood}`
        : day.mood
          ? `Auto from ${day.entries.length} entries: ${day.mood}`
          : "Nothing logged yet",
    );

    renderPicker(this.plugin, contentEl, async (e) => {
      await this.plugin.store.setMood(this.date, e);
      this.close();
    });

    const buttons = new Setting(contentEl);
    if (day.manualMood) {
      buttons.addButton((b) =>
        b.setButtonText("Use auto mood").onClick(async () => {
          await this.plugin.store.setMood(this.date, null);
          this.close();
        }),
      );
    }
    buttons.addButton((b) =>
      b.setButtonText("Log emotion").onClick(() => {
        this.close();
        new LogModal(this.app, this.plugin, this.date).open();
      }),
    );
    if (day.file) {
      const file = day.file;
      buttons.addButton((b) =>
        b.setButtonText("Open note").onClick(() => {
          this.close();
          this.app.workspace.getLeaf(false).openFile(file);
        }),
      );
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
