# Waypoint

**Remember where you left off.**

Waypoint is a local-first Chrome extension that saves your place in stories —
novels, web comics, manga, and anime — **independent of fragile websites**.

It tracks *progress*, not links.

---

## Why Waypoint exists

Bookmarks break.

Sites shut down. URLs change. Platforms disappear.
But your progress — the moment you stopped reading or watching — still matters.

Waypoint preserves:
- *what* you're consuming
- *where* you are in it
- *without depending on a single website*

If a site goes away, your waypoint doesn't.

---

## Features

- **Save your place** by episode, chapter, timestamp, page, or percentage
- **Track progress** across novels, manga, web comics, and anime
- **Smart detection** — auto-detects media type and progress from 200+ sites
- **Quick actions** — context menu and popup for one-click updates
- **Import/Export** — JSON, CSV, AniList, and MyAnimeList supported
- **Local-first** — all data stored on your device, works offline
- **Dark mode** — light, dark, or system theme

---

## What Waypoint does *not* do

- It does not host content
- It does not recommend or discover media
- It does not scrape your browsing history
- It does not track you

Waypoint remembers your place — nothing more, nothing less.

---

## Installation

### Chrome Web Store

*(Coming soon)*

### Install from source

1. Clone this repository
2. Run `npm install && npm run build`
3. Open Chrome → `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked**
6. Select the `dist` folder

---

## Usage

**Adding a work:**
- Click the Waypoint icon → "+" button
- Or right-click any page → "Add to Waypoint"

**Updating progress:**
- Click the Waypoint icon → select a work → "Update Waypoint"
- Or right-click → "Update waypoint for [Work]"

**Resuming:**
- Click the Waypoint icon → select a work → "Resume"

**Keyboard shortcuts:**
- `↑↓` Navigate works
- `Enter` Open selected work
- `Esc` Go back
- `/` Search
- `n` Add new work

---

## Data & privacy

- All data stored **locally** using Chrome storage
- No accounts required
- No analytics or telemetry
- Export or delete your data at any time

Your data is yours.

---

## Design principles

- **Content-first, not site-first** — Progress belongs to the story, not the URL
- **Local-first, user-owned data** — Your data stays on your device
- **Explicit over implicit** — Nothing happens without your consent
- **Boring reliability** — Dependable over flashy

See [`vision.md`](vision.md), [`ui.md`](ui.md), and [`ux.md`](ux.md) for details.

---

## Contributing

Contributions are welcome.

Before opening a PR, please read the design documents above. Good contributions improve reliability, clarity, and reduce friction while respecting user control.

---

## License

MIT License
