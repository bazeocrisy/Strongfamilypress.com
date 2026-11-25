# The Mountain: A Study of Moses

*Less Noise. More Wisdom. Time with God.*

A private, nine-section guided devotional. It lives in this folder only and
doesn't change or link from the main Strong Family Press site. It is marked
`noindex`.

Live: https://bazeocrisy.github.io/Strongfamilypress.com/the-mountain/

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell. Strict Content-Security-Policy with `connect-src 'none'`, so no data can leave the page |
| `study.js` | All study content: context, explanation, application, questions, prayers, action plan |
| `scripture.js` | Scripture text, World English Bible (WEB), generated and verified (see below) |
| `mountain.js` | Navigation, progress, journal, bookmarks, export, settings |
| `mountain.css` | Design: forest green, warm gold and cream, light and dark |
| `theme-init.js` | Applies the saved theme before first paint |
| `manifest.webmanifest`, `icon*` | Add to Home Screen support |

## Privacy

Progress, journal entries, the action plan and bookmarks are stored only in
the browser's `localStorage` (key `theMountain.v1`) on the reader's device.
Nothing is sent to a server, analytics or a third party, and nothing personal
is ever committed to this repository. Export uses a local file download, the
clipboard, or the device share sheet, and only when the reader chooses it.

## Scripture

The World English Bible is in the Public Domain. "World English Bible" is a
trademark of eBible.org, so the text must stay unaltered. Passages were taken
from the eBible.org WEB source (via the `world-english-bible` package) and
checked verse by verse against the eBible.org HTML edition. That check also
restored the three "Selah." markers in Psalm 46. Every quotation in
`study.js` was checked against the same text.

## Content layers

Each section keeps **Scripture**, **Biblical Context**, **Explanation** and
**Personal Application** visibly separate. The application box states that
its contents are personal reflection, not direct biblical teaching.
