# Strong Family Press — Website

The website for *Seven Steps to a Strong Family* by Christopher L. Bazemore I.

Plain HTML, CSS, and JavaScript. No frameworks, no build step, no
dependencies. If you can edit a text file, you can edit this site.

---

## File structure

```
/
├── index.html          All page content
├── css/style.css       All styling
├── js/script.js        Mobile menu + placeholder handling
├── Assets/             Images go here
├── README.md           This file
└── .gitignore          Keeps the manuscript out of the repo
```

**Important:** GitHub Pages runs on Linux, which treats `Assets/` and
`assets/` as two different folders. Windows does not. Always match the
capital `A` in `Assets/` exactly, or images will work on your computer and
break once published.

---

## ⚠️ The manuscript must never enter this repository

`.gitignore` blocks the manuscript by folder and by filename. Keep working
copies in a `Manuscript/` folder and they can't be committed by accident.

Before every push, run `git status` and confirm no manuscript file is listed.

Note that `*.pdf` is **not** blocked, because a sample chapter, media kit,
or the assessment may need to be published later from `Assets/downloads/`.
This means the protection depends on filenames and folders — check your
`git status`.

---

## Placeholders still in the site

Every one of these appears on the page in a visible amber tag. None of them
should still be there at launch.

| Placeholder | What's needed | Blocks |
|---|---|---|
| `[BOOK PRICE NEEDED]` | Price shown on Gumroad | Book section |
| `[PRINT AVAILABILITY NEEDS CONFIRMATION]` | Is there a paperback? | Book section |
| `[BOOK COVER IMAGE NEEDED]` | Cover artwork | Book section |
| `[AUTHOR PHOTO NEEDED]` | Verified photograph | Author section |
| `[EMAIL PLATFORM NEEDED]` | Email service | Lead capture |
| `[LEAD MAGNET FILE NEEDED]` | The assessment itself | Lead capture |
| `[EMAIL CONSENT WORDING NEEDED]` | Consent text | Legal |
| `[SPEAKING FORM SERVICE NEEDED]` | Form service | **All speaking leads** |
| `[SPEAKING AVAILABILITY NEEDS CONFIRMATION]` | Virtual? Travel? | Speaking section |
| `[BUDGET BRACKETS NEEDED]` | Budget ranges | Speaking form |
| `[BUSINESS EMAIL CONFIRMATION NEEDED]` | Correct address | Contact |
| `[PRIVACY POLICY NEEDED]` | Policy page | Legal, required once forms collect data |
| `[TERMS OF USE NEEDED]` | Terms page | Legal |
| `[SOCIAL SHARE IMAGE NEEDED]` | 1200×630 image | Link previews |
| `[FAVICON NEEDED]` | Site icon | Browser tab |

---

## How to make things work

### The book purchase buttons are live

Both "Get the eBook" buttons point to Gumroad:
`https://bazeocrisy.gumroad.com/l/mmdkju`
They carry `data-track="book_purchase_click"` so analytics can pick them up
without further edits.

### Connect the speaking form

Add `action` and `method` to the `<form data-guard="speaking">` tag, remove
the `data-guard` attribute, remove `aria-disabled` from its submit button,
and delete the `.form-status` banner above it.

### Connect the email sign-up

Replace the `<form data-guard="assessment">` with the embed code from the
chosen email platform.

### Add analytics

None is installed. **Nothing on this site is being measured today.** Once a
provider is chosen, paste its snippet before `</head>` and track:
book purchase clicks, speaking inquiry submissions, email sign-ups,
assessment completions, and speaking-section views.

---

## Testing locally (PowerShell)

From `C:\7 Steps to a Strong Family`:

```powershell
# If Python is installed — visit http://localhost:8000
python -m http.server 8000

# Or simply open the file directly
start index.html
```

Check the site at browser widths of 320, 375, 768, and 1024 pixels.
Press Tab through the whole page and confirm every link, button, and field
shows a visible outline.

## Publishing (PowerShell)

```powershell
cd "C:\7 Steps to a Strong Family"

git status                    # confirm no manuscript file is listed
git add .
git commit -m "Rebuild homepage: full site structure and content"
git push origin main
```

Then in GitHub: **Settings → Pages → Source: Deploy from a branch →
`main` / `root` → Save.** The site appears within a few minutes.

**Note on the live site.** `strongfamilypress.net` currently serves a
Durable-built site. Publishing this repo to GitHub Pages does not replace it
automatically — the domain has to be repointed. Do that only when you're
ready to switch, and keep a copy of the Durable content first.

**Note on the repository name.** The repo is named
`Strongfamilypress.com`, so GitHub Pages will serve the site from a
subfolder path until a custom domain is connected. Every path in this site
is relative (`css/style.css`, not `/css/style.css`), so it will work
either way — but don't add leading slashes to any path.

---

## Design notes

- **Colours** — deep harbor navy `#16232E`, warm paper `#F5F3EF`, brass
  accent `#8A5F14`. These were chosen before the book cover was available
  and should be reviewed against it.
- **Type** — Georgia for headings, system sans for body, monospace for
  labels and step numbers. No external font service is used, which keeps
  the site fast and avoids third-party tracking.
- **The step numbering is deliberate.** The seven steps are joined by a
  vertical rule because the order genuinely matters in this framework.
- **Accessibility** — semantic landmarks, skip link, keyboard-operable
  menu, visible focus, 48px minimum touch targets, reduced-motion support,
  no meaning conveyed by colour alone.
