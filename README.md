# Wen-Yi Kenneth Lee — Academic Website

Static personal academic website for GitHub Pages.

## Contents

- Current appointment and academic profile
- Research areas
- Verified journal publication record, 2011–2025
- Academic experience and education
- Teaching areas and contact links

## Local preview

Serve the repository root with any static HTTP server, then open `index.html` through that server. No build step, npm installation, or browser JavaScript is required.

Use an HTTP preview rather than opening the HTML directly from disk so the browser can load the local SVG symbol sprite.

## Design and assets

The desktop layout keeps the academic profile and navigation in a narrow side column. Smaller screens place the profile above the content with visible, wrapping navigation. Recent articles remain visible; earlier publications use the browser's native disclosure control.

Three open-source packages supply static, locally served assets:

- [Inter 4.1](https://github.com/rsms/inter/releases/tag/v4.1) — variable font, with system-font fallbacks for Chinese and offline loading failures.
- [Tabler Icons 3.49.0](https://github.com/tabler/tabler-icons/releases/tag/v3.49.0) — six SVG icons, served in a single sprite.
- [modern-normalize 3.0.1](https://github.com/sindresorhus/modern-normalize/releases/tag/v3.0.1) — consistent browser defaults.

Assets are pinned to immutable upstream commits, retain their licenses, and do not make third-party requests from visitors' browsers. Versions, source URLs, and SHA-256 hashes are recorded in `assets/vendor/manifest.json`. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licenses and the optional Node.js commands to reproduce or verify the assets.

## Structure

- `index.html` — page content and metadata
- `css/site.css` — responsive, information-first visual styles
- `images/og.png` — social sharing preview
- `assets/vendor/` — pinned font, stylesheet, SVG sprite, licenses, and integrity manifest
- `tools/vendor.mjs` — optional asset download and offline integrity check; not loaded by the webpage

The current site is an original rewrite and does not load the legacy Bootstrap template or its third-party assets.
