# Design system

Source of truth: the new **interactive Company Profile** (`C:\xampp\htdocs\Company_profile\index.html`, CSS custom properties in its `:root`; the file notes that navy `#104674` is "taken from the printed profile"). No PDF or other design asset was supplied, so every value below is read from that file - nothing is guessed. If a PDF/brand guide arrives later and differs, update the tokens at the top of `assets/css/style.css`.

## Tokens (`:root` in `assets/css/style.css`)

| Token | Value | Origin in Company Profile |
|---|---|---|
| `--color-primary` | `#104674` | `--navy` |
| `--color-primary-deep` | `#0a3055` | `--navy-deep` |
| `--color-primary-ink` | `#071c30` | `--navy-ink` |
| `--color-secondary` | `#e7f0f7` | `--soft` |
| `--color-accent` | `#f59a1b` | `--amber` (also the logo's orange) |
| `--color-accent-bright` | `#fdb813` | `--sun` |
| `--color-accent-ink` | `#a45300` | `--accent-ink` (text-safe amber, about 5.5:1 on white) |
| `--color-background` | `#f3f7fb` | `--bg` |
| `--color-surface` | `#ffffff` | `--surface` |
| `--color-text` | `#0b2135` | `--ink` |
| `--color-muted` | `#4a6176` | `--muted` |
| `--color-line` | `#d3e0eb` | `--line` |
| `--font-heading` | Bricolage Grotesque 500-800 | `--f-display` |
| `--font-body` | Figtree 400/500/600/700 | `--f-body` |
| `--radius-card` | 22px (pills 999px, fields 12px) | cards/buttons in the profile |
| `--shadow-card` | `0 18px 40px -22px rgba(10,48,85,.38)` | `--shadow` |
| `--container-width` | 1200px | `.wrap` |
| `--hex` | hexagon `clip-path` | logo hexagon, reused as bullets, icon frames, step icons |

Fonts are the self-hosted `woff2` files of the profile (`assets/fonts/`, `font-display: swap`, latin files preloaded). Only the weights the profile already uses are shipped.

The profile also has a dark mode; the website currently ships **light only** (the live site is light and the brief did not ask for a theme switch).

## Patterns

- **Header**: navy-deep, 72px, sticky, blur backdrop, scroll-progress bar in amber. Active item = pill + amber underline. *Company Profile* is outlined in amber with a hex marker so it stands out. Mobile (< 1040px): hamburger (`aria-expanded`, `aria-controls`), full-width drawer, Esc closes it.
- **Sections**: alternate light background / `--color-secondary` / navy bands (`.band`, `.band-deep`) exactly like the profile's rhythm. Vertical rhythm `clamp(64px, 9vw, 112px)`.
- **Eyebrow**: small caps label with a hexagon marker before each section title.
- **Buttons**: pill shaped. `btn-amber` (primary), `btn-ghost` (on dark), `btn-outline` (on light). Min touch height 44-46px.
- **Cards**: white surface, 1px line border, 22px radius, `--shadow-card`, 4px lift on hover.
- **Photo frames**: 26px radius, soft shadow.
- **Hex list / steps**: numbers and icons sit in hexagon frames (profile's "avatar" hexes).
- **FAQ**: native `<details name="faq">` accordion (no JS, keyboard accessible, exclusive open).
- **Forms**: 48px fields, 12px radius, visible labels, `*` for required, inline error text (`role`-less, linked with `aria-describedby`), loading spinner on the button, `role="status"` result area.
- **Motion**: fade/slide-in on scroll (`.reveal`), carousel cross-fade, hover lifts. Everything is disabled under `prefers-reduced-motion`.
- **Focus**: 3px amber outline on `:focus-visible`.

## Logo

The website's existing orange hexagon "HME" logo is used (converted to WebP: `assets/images/wp/cropped-...-picsart_22-09-30_11-01-38-827-1.webp`). It matches the logo in the profile. The wordmark next to it ("Hexa Multi Energi / PLTS Surabaya") is live text because the logo file contains only the hexagon.

## Photography / icons

Original project photos and the original PNG icons of the live site (converted to WebP, with 480/800/1200 px variants for `srcset`). No stock imagery or icon library was added; the four product benefit icons on `/products/` are inline SVG.

## Revision 3: section library and motion system

- **Sheets**: sections stack like paper (`.sheet` + `.sheet--light|white|soft|navy|ink`), each with a rounded top edge that overlaps the previous section (`--r-sheet`). Dark-to-light changes always happen on a curve.
- **Layout vocabulary** (`assets/css/sections.css`): ticker + counters, layered editorial (about), segmented selector, sticky-visual storytelling, interactive diagram, master/detail project explorer with bars, full-width service rows, bento grid, logo marquees, visual CTA, alternating category rows, scheme comparison, quick-action cards, featured post + search, lightbox.
- **Motion tokens** (`assets/css/animations.css`): easing `--ease-out` (entrances) / `--ease-in-out` (wipes); durations fast .18 s, micro .26 s, reveal .68 s, slow .95 s; stagger 85 ms. Only `transform`, `opacity` and `clip-path` animate; layout never moves.
- **Helpers** (`assets/js/motion.js`, `scroll-reveal.js`): `[data-split]`, `[data-count]`, `[data-parallax]`, `[data-magnetic]`, `.reveal-*`, `.marquee`. Interactive modules live in `assets/js/solar-ui.js` and start only when their root exists.
- **Rules**: hover effects never carry information that touch users cannot reach (explorer uses tap/click; hover only previews); everything has a visible `:focus-visible`; `prefers-reduced-motion` shows the final state with no movement.
