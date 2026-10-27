# Wen-Yi Kenneth Lee — Academic Website

Static personal academic website for GitHub Pages.

## Contents

- Current appointment and academic profile
- Research areas
- Verified journal publication record, 2011–2025
- Academic experience and education
- Teaching areas and contact links
- INFORMS 2026 daily session itinerary, room order, and same-time alternatives

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

## Conference itinerary

`informs-2026.html` adds a Chinese-language itinerary with four day selectors, route and table views, a technical-session priority filter, same-time alternatives, and printing. It lists 16 technical slots, 15 technical alternatives, and 13 keynote/plenary talks. A talk enters the route and table only after selection; talks in the same time window are mutually exclusive choices. Existing technical selections are preserved. Choices are stored in the visitor's browser; no server or external service receives them. A complete 29-row list of technical slots and talks remains available when JavaScript is disabled.

Maintain `assets/data/informs2026-sessions.json` and `tools/informs-2026.template.html`, then regenerate the page with `node tools/build-informs-route.mjs`. The behavior and styles are maintained in `js/informs-2026.js` and `css/informs-2026.css`. The generation command needs only Node.js built-ins and does not change the homepage.

All times are San Francisco local time. Overall technical-session time blocks and keynote/plenary titles and times were checked against the official program on October 27, 2026. Technical-session titles and rooms, and 12 special-talk rooms, still follow the October 14 program book and remain provisional. Yinyu Ye's room is unknown and is not copied from the old Peter Belcak entry. The itinerary gives room order without inventing walking times or individual paper schedules.

Conflicts require actual time overlap on the same date; touching endpoints are not conflicts. The current 13 talks do not overlap the 16 technical slots or their 15 alternatives. The evening talks form three concurrent groups, one each on November 1, 2, and 3 at 17:45–18:35. Both the available concurrent options and any overlap among the visitor's selected events are labeled explicitly.
