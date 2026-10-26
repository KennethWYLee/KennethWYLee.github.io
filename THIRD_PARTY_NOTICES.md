# Third-party assets

The website serves the following open-source assets from its own origin. It does not load these assets from a CDN or execute upstream installation scripts.

| Project | Version | Use | License |
| --- | --- | --- | --- |
| [Inter](https://github.com/rsms/inter/releases/tag/v4.1) | 4.1 | Unmodified variable WOFF2 font | [SIL Open Font License 1.1](assets/vendor/inter/LICENSE.txt) |
| [modern-normalize](https://github.com/sindresorhus/modern-normalize/releases/tag/v3.0.1) | 3.0.1 | Unmodified browser normalization stylesheet | [MIT](assets/vendor/modern-normalize/LICENSE.txt) |
| [Tabler Icons](https://github.com/tabler/tabler-icons/releases/tag/v3.49.0) | 3.49.0 | Six SVG icons assembled into one local symbol sprite | [MIT](assets/vendor/tabler/LICENSE.txt) |

Inter copyright: Copyright (c) 2016 The Inter Project Authors.

modern-normalize copyright: Sindre Sorhus, Jonathan Neal, and Nicolas Gallagher.

Tabler Icons copyright: Copyright (c) 2020-2026 Paweł Kuna.

The complete upstream copyright notices and license terms are retained in the linked license files. The Tabler sprite preserves the selected icons' view boxes and artwork; it wraps them in named symbols for reuse. The included icons are `mail`, `building-bank`, `brand-github`, `arrow-up-right`, `chevron-down`, and `arrow-up`.

`assets/vendor/manifest.json` records the exact source commits, upstream URLs, source SHA-256 hashes, and generated asset sizes and SHA-256 hashes. The source commits are pinned in `tools/vendor.mjs`.

`assets/vendor/.gitattributes` disables line-ending conversion inside the vendor directory so the checked-in bytes and their recorded hashes remain stable on Windows and other systems.

To reproduce the assets with Node.js 20 or later:

```sh
node tools/vendor.mjs
```

To verify the checked-in local assets without accessing the network:

```sh
node tools/vendor.mjs --check
```

The script downloads only the specified assets from the pinned official GitHub source commits. It checks the font header and rejects executable or external references in the stylesheet and SVG artwork before writing the generated files.
