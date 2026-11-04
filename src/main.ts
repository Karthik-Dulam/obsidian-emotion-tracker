import { App, Platform, Plugin, PluginSettingTab, Setting, moment } from "obsidian";
import { DEFAULT_SETTINGS, Settings, Store } from "./data";
import { familiesOf } from "./chart";
import { LogModal, MoodModal } from "./modals";
import { TrackerBlock, TrackerView, VIEW_TYPE } from "./views";

export default class EmotionTrackerPlugin extends Plugin {
  settings!: Settings;
  store!: Store;
  onSettingsChange = new Set<() => void>();

  async onload() {
    this.settings = Object.assign(structuredClone(DEFAULT_SETTINGS), await this.loadData());
    this.store = new Store(this.app, () => this.settings);

    this.registerView(VIEW_TYPE, (leaf) => new TrackerView(leaf, this));
    this.registerMarkdownCodeBlockProcessor("emotion-week", (_src, el, ctx) =>
      ctx.addChild(new TrackerBlock(this, el, "week")),
    );
    this.registerMarkdownCodeBlockProcessor("emotion-year", (_src, el, ctx) =>
      ctx.addChild(new TrackerBlock(this, el, "year")),
    );

    this.addRibbonIcon("heart-pulse", "Log emotion", () => this.log());
    this.addRibbonIcon("calendar-heart", "Open emotion tracker", () => this.openView());

    this.addCommand({ id: "log-emotion", name: "Log emotion", icon: "heart-pulse", callback: () => this.log() });
    this.addCommand({
      id: "set-mood",
      name: "Set today's mood",
      icon: "smile",
      callback: () => new MoodModal(this.app, this, moment()).open(),
    });
    this.addCommand({
      id: "open-tracker",
      name: "Open emotion tracker",
      icon: "calendar-heart",
      callback: () => this.openView(),
    });

    this.addSettingTab(new SettingsTab(this.app, this));
  }

  log() {
    new LogModal(this.app, this, moment()).open();
  }

  async openView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    const leaf = existing ?? (Platform.isMobile ? this.app.workspace.getLeaf(true) : this.app.workspace.getRightLeaf(false));
    if (!leaf) return;
    if (!existing) await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.onSettingsChange.forEach((cb) => cb());
  }
}

class SettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: EmotionTrackerPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();

    new Setting(containerEl).setName("Tracked emotions").setHeading()
      .setDesc("Shown as quick buttons when logging. Emotions picked from the chart use their family colour.");
    s.tracked.forEach((t, i) => {
      const fam = familiesOf(t.name).map((f) => f.name).join(", ");
      new Setting(containerEl)
        .setDesc(fam)
        .addText((txt) =>
          txt.setValue(t.name).onChange(async (v) => {
            t.name = v.trim();
            await this.plugin.saveSettings();
          }),
        )
        .addColorPicker((c) =>
          c.setValue(t.color).onChange(async (v) => {
            t.color = v;
            await this.plugin.saveSettings();
          }),
        )
        .addExtraButton((b) =>
          b.setIcon("arrow-up").setTooltip("Move up").setDisabled(i === 0).onClick(async () => {
            [s.tracked[i - 1], s.tracked[i]] = [s.tracked[i], s.tracked[i - 1]];
            await this.plugin.saveSettings();
            this.display();
          }),
        )
        .addExtraButton((b) =>
          b.setIcon("trash").setTooltip("Remove").onClick(async () => {
            s.tracked.splice(i, 1);
            await this.plugin.saveSettings();
            this.display();
          }),
        );
    });
    new Setting(containerEl).addButton((b) =>
      b.setButtonText("Add emotion").onClick(async () => {
        s.tracked.push({ name: "New", color: "#888888" });
        await this.plugin.saveSettings();
        this.display();
      }),
    );

    new Setting(containerEl).setName("Time slots").setHeading()
      .setDesc("Start time of each slot in the week view. Times before the first slot count as the last slot.");
    s.slots.forEach((slot) => {
      new Setting(containerEl).setName(slot.name).addText((txt) => {
        txt.inputEl.type = "time";
        txt.setValue(slot.start).onChange(async (v) => {
          if (!/^\d{2}:\d{2}$/.test(v)) return;
          slot.start = v;
          await this.plugin.saveSettings();
        });
      });
    });
  }
}
