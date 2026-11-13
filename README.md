# Wen-Yi Kenneth Lee — Academic Website

Static personal academic website for GitHub Pages.

## 學生課程資料

- [資料庫課程講義與課綱](https://kennethwylee.github.io/Database/)
- [資料庫 SQL 查詢練習](https://database-query-practice.wy-lee9591.chatgpt.site/)

從[個人網站](https://kennethwylee.github.io/)展開 **＋ Teaching**，也可以找到這兩個入口。課程講義網站公開，學生不需要取得私人課程 repo 的存取權。

## Contents

- Current appointment and academic profile
- Research areas
- 12 journal articles, 2011–2025
- Academic experience and education
- Five selected courses, an expandable Teaching menu, course resources, and contact links
- INFORMS 2026 daily itinerary and reading, full-text source status, and a separate Tutorial index

## Local preview

Serve the repository root with any static HTTP server, then open `index.html` through that server. The checked-in pages require no build step or npm installation to serve. The homepage, Tutorial index, and conference reading content remain available without browser JavaScript; conference date filtering, attendance choices, saved selections, and the print button use `js/informs-2026.js`.

Use an HTTP preview rather than opening the HTML directly from disk so the browser can load the local SVG symbol sprite.

## Design and assets

The desktop layout keeps the academic profile and navigation in a narrow side column. Smaller screens place the profile above the content with visible, wrapping navigation. Recent articles remain visible; earlier publications use the browser's native disclosure control. The Teaching menu also uses native disclosure, opens with a pointer or keyboard, and contains the teaching overview, public database handouts, and SQL practice links.

Three open-source packages supply static, locally served assets:

- [Inter 4.1](https://github.com/rsms/inter/releases/tag/v4.1) — variable font, with system-font fallbacks for Chinese and offline loading failures.
- [Tabler Icons 3.49.0](https://github.com/tabler/tabler-icons/releases/tag/v3.49.0) — six SVG icons, served in a single sprite.
- [modern-normalize 3.0.1](https://github.com/sindresorhus/modern-normalize/releases/tag/v3.0.1) — consistent browser defaults.

Assets are pinned to immutable upstream commits, retain their licenses, and do not make third-party requests from visitors' browsers. Versions, source URLs, and SHA-256 hashes are recorded in `assets/vendor/manifest.json`. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licenses and the optional Node.js commands to reproduce or verify the assets.

## Structure

- `index.html` — academic profile, publications, experience, teaching, and metadata
- `informs-2026.html` — generated daily itinerary and integrated reading
- `informs-2026-tutorial.html` — generated Tutorial titles, presenters, and full-text status
- `informs-2026-teacher.html` — compatibility redirect to the integrated reading page
- `assets/data/informs2026-*.json` — conference content and source records
- `tools/informs-2026*.template.html` — daily-page and Tutorial-page templates
- `tools/build-informs-route.mjs` — generates the three conference HTML files
- `tools/render-informs-daily.mjs`, `tools/render-informs-extra.mjs`, and `tools/render-informs-tutorial.mjs` — renderers used by the current build
- `js/informs-2026.js` — daily-page interaction and browser-local saved choices
- `css/site.css` — shared responsive styles
- `css/informs-daily.css`, `css/informs-modelling.css` — styles loaded by the current conference pages
- `images/og.png` — social sharing preview
- `assets/vendor/` — pinned font, stylesheet, SVG sprite, licenses, and integrity manifest
- `tools/vendor.mjs` — optional asset download and offline integrity check; not loaded by the webpage

The current site is an original rewrite and does not load the legacy Bootstrap template or its third-party assets.

## Conference itinerary and reading

`informs-2026.html` presents November 1–4, 2026 as four dated sections within one document. Each day combines a chronological itinerary, classroom order, expandable session cards, and reading material. It uses the current integrated card layout.

The controls provide:

- Four date links, `#day1-reading` through `#day4-reading`.
- “只看主要安排” to hide optional technical slots.
- Same-time session choices where alternatives are offered; concurrent talks can be changed or skipped. MC41 and WA33 are marked “必去” and have no attendance alternatives. Other material can remain available as reading without entering the itinerary; WB34 is reading-only.
- “套用本版建議” to restore the current default choices while keeping the selected date.
- “列印這一天” to print the selected day's displayed session and talk content, including detailed reading. Selected content expands for printing, then returns to its previous disclosure state. Same-time alternatives, the reading-only area, and the modelling library are excluded.

The current defaults include all four plenary talks and one keynote on each of the first three evenings: Cynthia Dwork, Dolores Romero Morales, and Elena Fernández. Concurrent evening talks are alternatives, not additional events to attend in full.

Date, filter, technical-session choices, and talk choices are stored in the visitor's browser with `localStorage`; the page does not send these choices to a server. Valid saved choices are retained, including explicit talk skips and supported previous session codes. If storage fails, the page reports the limitation and remains usable without saving. Without JavaScript, all four days and their expandable reading remain available with the generated default classroom order; date links act as fragment links, while interactive filtering and attendance changes are unavailable. Printing collapsed content without JavaScript depends on the browser's disclosure support.

Opening a session card shows its Takeaway, a three- or four-step hypothetical example, what to listen for, scope notes, and the listed papers or talk summary. Listed papers retain English titles, author order, available Chinese summaries, source notes, and full-text status. Additional papers appear under “本場其他文章與全文狀態”. Selected papers have expandable “深入帶讀” material; three source records also retain their original English abstracts. Opening reading material does not change attendance choices. With JavaScript enabled, supported fragment links select the relevant day and open their enclosing disclosure sections.

### Current coverage

Counts below were checked against the repository data on **2026-11-13**. They describe the prepared content, not actual attendance, completed reading, or the entire conference program.

| Content | Count | Basis |
| --- | ---: | --- |
| Days | 4 | `sessions.days` and `reading.guides` |
| Primary technical time slots, including optional slots | 17 | `sessions.sessions`: 8 main and 9 optional slots |
| Additional technical sessions | 31 | `sessions.alternatives`: 24 selectable alternatives and 7 reading-only sessions |
| Technical sessions represented in total | 48 | 17 + 31 |
| Plenary/keynote talks | 13 | `sessions.special_talks` |
| Papers in session `papers` arrays | 186 | Sum across primary and additional sessions |
| Additional paper records | 47 | `fulltext.supplemental` |
| Technical paper records in total | 233 | 186 + 47 |
| Paper/talk full-text status records | 246 | 233 papers + 13 talks in `fulltext.items` |
| Session/talk Takeaways with worked examples | 61 | `primers.items`: 48 sessions + 13 talks |
| Detailed reading lessons | 58 | 45 technical-paper lessons + 13 talk lessons; daily totals 16 / 21 / 16 / 5 |
| Additional portfolio modelling cases | 11 | `modelling.cases` |
| Tutorial entries in the separate index | 13 | `tutorials.sessions`; maintained separately and not added to the 246 above |

The full-text index currently contains 74 `full`, 37 `related`, 107 `not_found`, and 28 `unavailable` records; none are `not_searched`. These mean a linked full-text source, a related source whose identity remains unconfirmed, no public full text found in the recorded search, or a source found but not downloaded in that search. “Not found” does not establish that full text does not exist. A linked preprint does not establish formal publication or an exact match to the delivered talk. MC41-2 is recorded as a preprint of the same paper, with the differing title and unresolved exact talk version retained in its note.

### Tutorial index and saved links

`informs-2026-tutorial.html` groups 13 Tutorial entries by date, with English titles, presenters, source notes, and public-source links. Its separately maintained status counts are 7 `full`, 5 `not_found`, and 1 `unavailable`, checked on 2026-11-02. The October 14 program book lists these entries on November 1–3; the page explicitly notes that it lists no formally labelled Tutorial session on November 4. This page needs no JavaScript.

The former separate reading page, `informs-2026-teacher.html`, redirects to the integrated page. Its `teacher-001`, `teacher-002`, and `teacher-003` links, including their `-title` variants, map to MC41, TB29, and WA33 respectively. Other fragments fall back to `#daily-reading`; without JavaScript, a refresh and visible link lead to the integrated page.

### Source dates and limits

All times use San Francisco local time (`America/Los_Angeles`). The retained program book was printed on October 14, 2026; overall technical time blocks were checked on October 31. The session data records its special-talk schedule check on November 1, while individual reading guides retain their October 31 special-talk check. These dates record earlier checks, not a new official-program review on the README update date.

Individual technical-session titles and rooms have not been fully verified against the live program. Yinyu Ye's room remains unknown. WB34 paper 4's 10:15–10:30 time was supplied by the user and has not been independently verified; it overlaps WB35. MD18 uses Mo Liu's tutorial manuscript because the retained program-book abstract does not match its title. The main full-text search date remains November 2, with later item-specific corrections such as MC41-2 preserved in its note and Git history.

The meeting has ended. The pages preserve preparation and reading material; they do not establish attendance, the final delivered program, or research conclusions. Worked examples are hypothetical teaching examples with their scope stated beside them, not reproductions of the authors' experiments.

## Maintaining conference content

Edit the source data and templates, then regenerate the checked-in conference pages with Node.js:

```sh
node tools/build-informs-route.mjs
```

The command uses only Node.js built-ins and validates required records, references, source URLs, matching paper numbers, and complete rendering before writing the three conference HTML files. It does not change the homepage.

| Source file under `assets/data/` | Maintained content |
| --- | --- |
| `informs2026-sessions.json` | Dates, technical slots, other sessions, talks, defaults, titles, authors, summaries, and source metadata |
| `informs2026-reading.json` | Four daily guides, retained event references, 58 detailed lessons, review questions, and vocabulary |
| `informs2026-primers.json` | One Takeaway and worked example per technical session or talk |
| `informs2026-fulltext.json` | Paper/talk source status, links, qualifying notes, and supplemental paper records |
| `informs2026-teacher.json` | Three retained source abstracts used inside the integrated reading |
| `informs2026-modelling.json` | The 11 additional portfolio modelling cases |
| `informs2026-tutorials.json` | The separate Tutorial index and its own source/status dates |

Update page structure and shared source notes in `tools/informs-2026.template.html` or `tools/informs-2026-tutorial.template.html`. The active build renders through `render-informs-daily.mjs`, `render-informs-extra.mjs`, and `render-informs-tutorial.mjs`; the older `render-informs-reading.mjs` and standalone reading styles are retained in the repository but are not the current daily-page rendering path. Change interaction in `js/informs-2026.js` and current conference styles in `css/informs-daily.css` and `css/informs-modelling.css`.

After content changes, regenerate the pages, compare the resulting diff, check local links and fragment targets, and update the coverage counts above if their source data changed. The optional asset integrity check is:

```sh
node tools/vendor.mjs --check
```
