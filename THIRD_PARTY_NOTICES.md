ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


---

## Opening assets

`assets/distant-stroke.otf` (Distant Stroke Regular) was supplied by the
repository owner for the opening screen and retains its original rights.
The application does not relicense this font under Lucide's license above.

`assets/splash-fog.svg` is independently authored procedural mist and droplets.
`splash-fog.webp` is a rasterization of that SVG, used to avoid recalculating
procedural filters on every startup.
The user-provided reference photograph is not included in this repository.

---

## Cormorant Garamond

`assets/fonts/cormorant-garamond-latin-*.woff2` are unmodified Latin subsets
from `@fontsource/cormorant-garamond` version 5.3.0.

Copyright 2015 The Cormorant Project Authors
(https://github.com/CatharsisFonts/Cormorant).

Licensed under the SIL Open Font License 1.1. The complete copyright and
license are included in `assets/fonts/Cormorant-Garamond-OFL.txt`.

Upstream: https://github.com/CatharsisFonts/Cormorant
Distribution: https://www.npmjs.com/package/@fontsource/cormorant-garamond

Tidal Echo's `web/index.html` at commit
`860e5de364de292093dba5571ee6427cdbda060e` identifies Cormorant Garamond
as its English font and weight 500 for the anniversary digits. We use that
font independently; no Tidal Echo source code or personal assets were copied.

---

## Noto Serif SC (思源宋体)

`assets/fonts/noto-serif-sc/*.woff2` are unmodified Unicode subsets from
`@fontsource-variable/noto-serif-sc` version 5.3.1.

Copyright: Google Inc. Licensed under the SIL Open Font License 1.1.
The complete distribution notice and license are included in
`assets/fonts/noto-serif-sc/OFL.txt`.

These variable fonts cover weights 200–900. The original Unicode ranges
are preserved so browsers fetch only subsets used on a page.

Upstream: https://github.com/notofonts/noto-cjk
Distribution: https://www.npmjs.com/package/@fontsource-variable/noto-serif-sc


---

## Internal app icons — React Icons / Lucide

`src/apps/icons.js` contains SVG node data extracted from the Lucide (`lu`)
set distributed in `react-icons` version 5.7.0. Selected exports:
`LuBookHeart`, `LuMusic2`, `LuImages`, `LuSlidersHorizontal`, `LuBookOpen`,
`LuContactRound`, and `LuPalette`. The paths are unchanged; the application
sets a shared 1.65px stroke width. SVGs are rendered by the existing native
JavaScript frontend; React Icons' React runtime is not bundled.

Directory: https://react-icons.github.io/react-icons/icons/lu/
Distribution: https://www.npmjs.com/package/react-icons/v/5.7.0
Lucide upstream: https://lucide.dev/

The Lucide ISC license and Feather MIT notice above apply to the selected
icon artwork (`LuMusic2` / music is derived from Feather).
React Icons' distribution notice is retained here as well:

Copyright 2018 kamijin_fanta <kamijin@live.jp>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


---

## Launcher icons — Nucleo Glass

`src/launcher-icons.js` embeds eleven SVGs from the official free Nucleo Glass
collection: feather, headphones, image, slider, book-open, box-archive,
color-palette, msgs, hearts, gear and star-sparkle. They are used for the seven
desktop App entrances and four desktop Dock entrances. Internal UI controls retain
their existing Lucide icons.

Copyright © Nucleo. These icons remain subject to Nucleo's license and are not
relicensed under the application or Lucide licenses. Their use is restricted to
the product they are bundled with; standalone redistribution is prohibited.
The copyright notice, sources and local adaptations are recorded in
`assets/licenses/nucleo-glass.txt`.

Official collection: https://nucleoapp.com/svg-glass-icons
Free icons: https://nucleoapp.com/free-icons
License: https://nucleoapp.com/license
Open-source usage: https://nucleoapp.com/qa/include-icons-in-open-source-projects
Official package: https://www.npmjs.com/package/nucleo-glass/v/1.4.1

Geometry is unchanged. SVG IDs are namespaced per rendered instance; gradient
colors use CSS custom properties to keep the glass artwork legible in dark mode.
No Nucleo runtime, account credentials or paid icon library is bundled.


## fflate 0.8.2

`src/vendor/fflate.js` vendors the browser ES module from fflate 0.8.2 (MIT),
used to create and read portable ZIP backups without a CDN dependency.
Copyright (c) 2023 Arjun Barrett. The full license is in
`src/vendor/fflate.LICENSE`.

Source: https://github.com/101arrowz/fflate/tree/v0.8.2
Package: https://www.npmjs.com/package/fflate/v/0.8.2
The npm tarball was verified against its published SHA-512 integrity value.
