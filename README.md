# Troll Runner Stickers

Static site behind <https://stickers.trollrunner.net/>. No build step, no npm,
no framework — one `index.html` (inline CSS + vanilla JS) plus a few small
modules in `assets/js/`. External libraries load from CDN; hosted on GitHub
Pages via `CNAME`.

## Features

### 1. Free printable sticker gallery

A data-driven gallery of pre-made troll stickers anyone can preview, download,
and print for free.

- **Manifest:** [`assets/data/stickers.json`](assets/data/stickers.json) —
  metadata for each template (`id`, `title`, `blurb`, `tags`, `image`, `bg`,
  `hasQR`).
- **Masters:** [`assets/stickers/`](assets/stickers/) — one high-res PNG per
  template (also used as the card preview). See that folder's README for the
  expected filenames and resolution rules.
- **Code:** [`assets/js/printable-gallery.js`](assets/js/printable-gallery.js)
  renders the cards and produces downloads.

**Downloads** (per sticker, via the "Download for print" button):

- High-res PNG (the original master).
- Print-ready PDF at **2″, 3″, or 4″** (the inch value is the long edge; the
  short edge scales to preserve the artwork's shape). Each single PDF includes
  corner crop marks.
- **Full sheet** PDF — US Letter tiled with 2″ copies and faint cut guides.

PDFs are generated in-browser with [jsPDF](https://github.com/parallax/jsPDF),
loaded lazily from CDN only when a PDF is first requested.

**Add a new template:** drop a PNG in `assets/stickers/` and append an entry to
`assets/data/stickers.json`. No code changes needed.

### 2. Paid AI custom-sticker generator (planned)

A paid generator that creates custom troll stickers on demand.

- **Provider:** xAI Grok image API (`grok-imagine-image`) via the
  OpenAI-compatible endpoint `https://api.x.ai/v1`.
- **Key handling:** the project holds **one** `XAI_API_KEY`; users never bring
  their own. All generation must be **proxied through the site's own backend**
  so the key is never exposed client-side. The provider stays behind a
  swappable service module so it can be replaced later.
- **Style anchoring:** consider Grok's image-edit endpoint with one of the
  existing troll references as a style anchor for consistent output.
- **Backend:** to be implemented (Supabase Edge Function is the likely fit,
  since the site already uses Supabase). Payments are a separate phase.

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in real values. `.env`
is git-ignored and must never be committed.

| Variable      | Used by              | Notes                                                          |
| ------------- | -------------------- | -------------------------------------------------------------- |
| `XAI_API_KEY` | AI generator backend | xAI Grok key. Server-side only — never shipped to the browser. |

> Feature 1 (the printable gallery) needs **no** environment variables; it is
> fully static. The variables above are for Feature 2's backend proxy.

## Local preview

The gallery fetches `assets/data/stickers.json`, so serve the folder over HTTP
rather than opening `index.html` from `file://` (browsers block `fetch` on
`file://`). For example:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

## Notes

- Don't touch `CNAME`.
- Keep it framework-free and mobile-first.
