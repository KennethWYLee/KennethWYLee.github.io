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

`informs-2026.html` adds a Chinese-language itinerary with four day selectors, route and table views, a technical-session priority filter, same-time alternatives, and printing. It lists 17 technical slots (including optional periods), 18 technical alternatives, and 13 keynote/plenary talks. The October 31 revision prioritizes MA47 → MC48 → ME48 on November 2 and TA47 → TC35 → TD47 on November 3, following the user’s confirmed scenario-generation, portfolio, risk, and uncertainty interests. A talk enters the route and table only after selection; talks in the same time window are mutually exclusive choices. Existing explicit technical selections are preserved through the previous slot codes; renamed defaults do not silently discard a saved alternative. The “套用本版建議” button applies the current defaults. Choices are stored in the visitor's browser; no server or external service receives them. A complete 30-row list of technical slots and talks remains available when JavaScript is disabled.

Maintain `assets/data/informs2026-sessions.json` and `tools/informs-2026.template.html`, then regenerate the page with `node tools/build-informs-route.mjs`. The behavior and styles are maintained in `js/informs-2026.js` and `css/informs-2026.css`. The generation command needs only Node.js built-ins and does not change the homepage.

All times are San Francisco local time. Overall technical-session time blocks were rechecked against the official agenda on October 31, 2026. The itinerary retains its October 27 special-talk metadata; the reading guides separately record their October 31 special-talk check. Technical-session titles and rooms, and 12 special-talk rooms, still follow the October 14 program book and remain provisional. Yinyu Ye's room is unknown and is not copied from the old Peter Belcak entry. The itinerary gives room order without inventing walking times or individual paper schedules.

Conflicts require actual time overlap on the same date; touching endpoints are not conflicts. The current 13 talks do not overlap the 17 technical slots or their 18 alternatives. The evening talks form three concurrent groups, one each on November 1, 2, and 3 at 17:45–18:35. Both the available concurrent options and any overlap among the visitor's selected events are labeled explicitly.

All 13 keynote/plenary talks have a native expandable abstract in their option cards, selected route/table entries, and the no-JavaScript table. Opening an abstract is independent of selecting a talk. The text is a Chinese summary, with its source and version stated beside it; Microsoft and Sokol entries summarize official project descriptions. Maintain each talk's `abstract` object in the data file, including `summary_zh`, `summary_label`, `source_url`, and `abstract_version_note`. Source-book summaries use the October 14 program; current official additions are identified explicitly.

The 17 technical selections and 18 alternatives also have expandable Chinese summaries in the route and table views. Alternative summaries can be opened before changing the selection. These summaries combine the reports in each session and identify the report count and source pages. MD18 uses Mo Liu's tutorial manuscript because the October 14 book contains an abstract that does not match its title. The no-JavaScript table retains summaries for all 35 technical sessions, with the alternatives nested under their original slot.

Each technical session also lists its individual paper titles and author names. Selecting a paper title opens its Chinese summary and source pages, independently of choosing a session. The 35 sessions contain 168 reports, including the MD18 tutorial. Maintain these records in each session's `papers` array; source affiliations and author order are checked during extraction, and author lists are not presented as a list of speakers. Original English abstract text and internal extraction notes are not published. The same paper lists are available in the route, table, alternatives, and no-JavaScript views.

Selected papers show a `重點` badge and a visible recommendation reason, maintained in `paper.recommendation.reason_zh`. Recommendations use the user's stated uncertainty, robust optimization, and stochastic interests, with the existing public portfolio and risk research as secondary context. Reasons describe relevance and questions worth comparing from the available abstracts. Paper order, session priority, and saved itinerary choices are preserved. The same recommendations appear in all paper-list views, including the static fallback.

## Daily reading

`assets/data/informs2026-reading.json` maintains four daily reading guides, `#day1-reading` through `#day4-reading`. They cover 13 technical sessions and all 13 special talks in chronological order, with 34 lessons for 21 selected technical papers and 13 special talks. Every lesson includes a main hypothetical example, an expandable answer, an additional example, and a question to listen for. Each day states three learning checks and an end-of-day completion criterion; these do not mark the visitor as having completed learning.

The October 31 revision replaces the second and third days’ technical reading with the user-confirmed route. Day 2 covers adapted sequential generation and nonstationary hedging (MA47), financial backtest leakage (MC48), and option-implied asset dependence (ME48). Day 3 covers event-conditioned generation and online intervals (TA47), assumptions needed for unseen environments (TC35), and transaction costs and reallocation triggers (TD47). Earlier technical choices remain as alternatives or optional slots with their original abstract and paper lists. The first and fourth days’ reading is unchanged. All plenary/keynote material remains available as extension reading; concurrent evening talks are alternatives, not a requirement to attend every talk.

Maintain each dated guide's ordered `events`, which reference session codes or special-talk keys, and its `step_ids`, which reference lessons containing paper numbers or special-talk keys. `extra_examples` provide optional further reading; `goals` and `completion_note` define what the reader should be able to explain. `terms` provides a compact expandable vocabulary list. Each guide records `special_verified_on` separately from the program-book version. `tools/render-informs-reading.mjs` validates all four days, all priority technical sessions and special talks, chronological order, unique identifiers, complete lesson references, and corresponding papers/talks, then generates static content through the existing build command. The hero links and reading index both reach all four guides. The original first-day model/risk/mixture anchor links remain valid. Reading content does not require JavaScript, change saved itinerary choices, or enter the itinerary printout. Its styles are scoped in `css/informs-reading.css`.

New examples also distinguish sequential information availability from hindsight, backtest data availability from observation dates, option-implied distributions from real-world probability forecasts, conditioning from causal intervention, and re-solving from executing a trade. They state that the TD47 live test used a paper account. Examples distinguish residuals from prediction errors, mixture component weights from asset allocations, conditional probability updates from time-consistency claims, and illustrative privacy questions from a proved privacy mechanism. They also distinguish predictive errors from decision costs, observed sales from censored demand, and automatic case-handling coverage from predictive coverage. They do not reproduce the authors' models or establish investment performance. Source versions and the pending room check appear beside each guide. MD18 uses the author's tutorial instead of the mismatched book text; the Ye entry retains its unknown room and does not adopt the old Belcak room. Special-talk descriptions and times were checked against the official page on October 31, 2026; individual technical-session titles and all rooms still require current app/on-site confirmation.
