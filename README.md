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
- *what* you’re consuming
- *where* you are in it
- *without depending on a single website*

If a site goes away, your waypoint doesn’t.

---

## What Waypoint does

- Save your place by **episode, chapter, timestamp, or percentage**
- Track progress across **novels, manga, web comics, and anime**
- Store everything **locally on your device by default**
- Optionally back up your data to **Google Drive**
- Resume from your last waypoint in one click
- Export your data at any time (JSON / CSV)

Waypoint works offline and requires no account.

---

## What Waypoint does *not* do

- It does not host content
- It does not recommend or discover media
- It does not scrape your browsing history
- It does not track you
- It does not magically relocate missing content

Waypoint remembers your place — nothing more, nothing less.

---

## Design principles

Waypoint is built around a few core ideas:

- **Content-first, not site-first**  
  Progress belongs to the story, not the URL.

- **Local-first, user-owned data**  
  Your data stays on your device unless you choose otherwise.

- **Explicit over implicit**  
  Nothing happens without your consent.

- **Calm, durable UI**  
  Designed for long-term use, not novelty.

You can read more in:
- [`VISION.md`](VISION.md)
- [`UI.md`](UI.md)
- [`UX.md`](UX.md)

---

## Installation

### Option 1: Chrome Web Store (recommended for most users)

The Chrome Web Store version is identical to the open-source build, but easier to install and update.

- One-click install
- Automatic updates
- Costs $0.50 (to support maintenance)

> The code is fully open-source.  
> You’re paying for convenience, not locked features.

*(Store link coming soon)*

---

### Option 2: Install from GitHub (free)

1. Clone or download this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project directory

---

## Data & privacy

- All progress is stored **locally** using browser storage
- No accounts required
- No analytics or telemetry
- Optional Google Drive backup is **opt-in**
- Data can be exported or deleted at any time

Your data is yours.

---

## Project status

Waypoint is under active development.

The current focus is:
- rock-solid progress storage
- reliable resume behavior
- simple, predictable UI

Features will be added deliberately to avoid complexity and data risk.

---

## Contributing

Contributions are welcome.

Before opening a PR, please read:
- `VISION.md`
- `UI.md`
- `UX.md`

These documents define the project’s boundaries and values.

Good contributions:
- improve reliability
- improve clarity
- reduce friction
- respect user control

Feature requests that add complexity without clear value may be declined.

---

## Roadmap (high-level)

- Core progress tracking (v1)
- Importers (CSV, AniList, MyAnimeList)
- Optional sync improvements
- Advanced history views
- Community adapters

A detailed roadmap will live in the issue tracker.

---

## License

MIT License.

This project is open-source and free to use.

---

## Final note

Waypoint exists because the maintainer needed it.

If it becomes useful to others, that’s the best possible outcome.

If it becomes the default way people remember where they left off, even better.
