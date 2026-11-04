# Emotion Tracker for Obsidian

Notice and name your emotions through the day, then see the patterns as weekly and annual trackers.
Based on the [Therapy in a Nutshell emotion tracker](https://therapyinanutshell.com) and its emotion chart.

## Features

- **Log emotion** (ribbon, command, mobile toolbar): tap one of the 10 base emotion families to expand it,
  pick the family itself or a more specific emotion, or search the chart. Each family shows its suggested action.
  Colours come from the chart's families.
- **Week view**: 7 days by 5 time slots (early morning, morning, afternoon, evening, before bed). Tap a cell to log into it.
- **Year view**: one coloured square per day showing that day's mood. Tap a day to set the mood or open the note.
- **Embeds**: put `emotion-week` or `emotion-year` code blocks in any note.

## Data

Everything lives in your daily notes' frontmatter (folder, format and template come from the core Daily notes plugin):

```yaml
emotions:
  - "08:15 Calm | walk around the block"
  - "14:30 Stressed | work"
mood: Calm
```

`mood` is optional. Without it, the day's mood is the most frequent emotion logged that day (later entries win ties).

## Install

Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/emotion-tracker/` and enable it,
or use [BRAT](https://github.com/TfTHacker/obsidian42-brat) with this repo.

## Development

```sh
npm install
npm run build
```
