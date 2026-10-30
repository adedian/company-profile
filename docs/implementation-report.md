# Implementation report

Date: 2026-10-20 - local build at `http://localhost/websitehme/` (XAMPP, PHP 8.0, Apache with `mod_rewrite`).
Production was **not touched**.

## 1. What was built

PHP Native, no framework, no Composer packages, no JS libraries.

```
websitehme/
├── index.php                  front controller / router
├── config.php                 settings (no secrets; config.local.php overrides)
├── .htaccess                  rewrite, blocks internals, gzip/cache/security headers (only if modules exist)
├── includes/
│   ├── components/factory-sim.php the scroll-driven opening (canvas + photo fallback + captions)
│   ├── components/tour-hero.php   the optional photo/video tour opening
│   ├── bootstrap.php          errors off, session, timezone Asia/Jakarta
│   ├── functions.php          url()/asset()/img()/SEO + JSON-LD helpers
│   ├── forms.php              one schema -> markup + server validation + storage
│   ├── header.php navigation.php footer.php
│   └── data/                  site.php home.php posts.php pages.php images.php (all copy lives here)
├── pages/                     home products contact newsblog career company-profile 404
├── handlers/                  submit.php (forms), sitemap.php, robots.php
├── assets/css/style.css       design tokens + components
├── assets/css/animations.css  motion layer (reveal keyframes, micro-interactions, reduced-motion)
├── assets/css/factory-sim.css scroll-driven 3D opening + photo fallback (home)
├── assets/css/home.css        photo-tour hero (optional) + solutions / projects / CTA sections (home only)
├── assets/dist/               auto-generated minified CSS bundle (safe to delete; rebuilt on demand)
├── assets/hero/               drop-in folder for tour video files + README.txt
├── assets/js/scroll-reveal.js Intersection Observer reveal + stagger
├── assets/js/interactions.js  nav, sticky header, tabs, animated FAQ, forms, pop-up (vanilla)
├── assets/js/hme-world-core.js  own WebGL2 renderer + geometry builder
├── assets/js/hme-world.js       the 3D factory scene, camera path and animation
├── assets/js/factory-sim.js   scroll-driven opening controller (home only)
├── assets/js/solar-tour.js    photo-tour controller (optional opening, home only)
├── assets/fonts/              Bricolage Grotesque + Figtree (self-hosted woff2, from the profile)
├── assets/images/wp/          82 production images converted to WebP + 480/800/1200 px variants
├── assets/company-profile/    presentation/ (the interactive profile) + HME-Company-Profile.zip
├── storage/leads/             form submissions (.jsonl, web access denied)
├── docs/                      audit, design system, content preservation, this report
└── tools/                     make-variants.php (image variant generator; do NOT upload)

Backups live **outside** the web root: `C:\xampp\backups\hme-website\2026-10-20\` (production HTML snapshot, original Company_profile zip, code snapshot, checksums, README).
```

### Routes (URLs of the live site are kept)
`/`, `/products/`, `/contact/`, `/newsblog/`, `/career/`, new `/company-profile/`, plus `/home` -> 301 `/`, `/sitemap.xml`, `/robots.txt`, `POST /kirim/` (forms). Missing slash -> 301 to the slash version, unknown URL -> real HTTP 404 page.

### Design changes
Navy `#104674` / amber `#f59a1b` palette, Bricolage Grotesque + Figtree, and the hexagon motif - all read from the new Company Profile file (see `design-system.md`). Sticky navy header with *Company Profile* highlighted; full-bleed hero carousel (original 3 slides); about + tabbed mission/vision/goal band; benefit cards; "Why choose us" chips; 3-step stepper; native-`<details>` FAQ; quote band with form; pop-up; premium footer. Inner pages share a page-hero with breadcrumb.

### Company Profile menu
Top navigation item (desktop, tablet and the mobile drawer) -> `/company-profile/`. The page opens the company profile **directly and full screen**: the interactive presentation (copied to `assets/company-profile/presentation/`) fills the whole area under the sticky header, with no hero or footer around it, plus small floating buttons *Buka di Tab Baru* and *Unduh (ZIP)*. If there is no presentation but a `*.pdf` exists in `assets/company-profile/`, the PDF fills the area instead (with open/download buttons). If neither exists a tidy empty state is shown. No link is rendered for a missing file.

### Forms
Same fields, labels, placeholders, required rules and Indonesian required-message as production. New handler (`handlers/submit.php`): CSRF token, honeypot, 5-per-10-min rate limit, server-side validation + sanitising, JSON response for the JS version and a redirect-with-message fallback without JS. Success is reported **only after the lead has really been written** to `storage/leads/YYYY-MM.jsonl`; a write failure shows an error. Optional e-mail via `mail()` when `send_mail` is `true`.

### SEO
Unique `<title>` (production titles kept), meta description, canonical to `https://hexamultienergi.com/...`, Open Graph + Twitter Card, `noindex` + `Disallow: /` automatically on localhost, `sitemap.xml` with the 6 real pages, robots.txt, JSON-LD: `ProfessionalService` (name, address, phone, e-mail, founding year 2022, social profiles - facts from the live site only), `BreadcrumbList` on inner pages, `FAQPage` on home. Alt text on all images, one `<h1>` per page, semantic landmarks. No ratings/reviews/certifications invented.

### Animation & interaction layer (added 2026-10-20)

| Area | What it does |
|---|---|
| Reveal classes | `.reveal` / `.reveal-up` (fade-up), `.reveal-left`, `.reveal-right`, `.reveal-scale`, `.stagger-item` (+ `data-stagger` on the parent for 85 ms steps, capped at 8). One `IntersectionObserver`, each element animates once as it enters the viewport; no scroll listeners. Only `opacity` + `transform`, 650-700 ms. |
| Where used | Section heads fade up; two-column layouts slide in from opposite sides (About, Why choose us, FAQ, quote, contact); benefit/product cards scale in with stagger; Consultation > Installation > Monitoring steps stagger and their connector line draws in; blog and career cards stagger; chips stagger. |
| Hero | Eyebrow, headline, text and buttons rise in one after another each time a slide becomes active; the photo settles once (7 s, finite - not a loop). |
| Sticky navbar | Shadow + denser background after scrolling (toggled by an IntersectionObserver sentinel, no scroll listener). Scroll-progress bar uses CSS scroll-driven animation where supported (Chromium) and a rAF-throttled fallback elsewhere. |
| FAQ | Native `<details>` (keyboard/AT accessible) with an animated height open/close (Web Animations API, 280 ms). |
| Tabs | Panel fades in. |
| Micro-interactions | Button lift + glow + press, icon tilt/scale on card hover, card shadow lift, chip/list slide, image zoom in photo frames, input focus ring - 180-350 ms. |
| Safety | Content is visible by default: the hidden state is added by `scroll-reveal.js` only to elements still below the fold. No JS, no IntersectionObserver or `prefers-reduced-motion: reduce` => nothing is hidden or animated. A 2.5 s safety net reveals anything already on screen if an observer callback never arrives, and `beforeprint` reveals everything. The hero rotator and carousel pause while off screen. No global `will-change`, no parallax (deliberately skipped to stay light). |

### Scroll-driven opening: our own real-time 3D factory (2026-10-20)

The home page opens with a **3D factory built specifically for this website** (not the presentation's model): smooth, rounded, lit geometry with sun shadows - no blocky/"lego" look. It is drawn in real time with WebGL2 (no library) and played **by scrolling** (forwards and backwards).

| Chapter | What happens in the 3D scene | Caption |
|---|---|---|
| 1 | Aerial approach at sunrise; the sun climbs and the light changes from warm morning to daylight; modern hall with clerestory windows, canopy entrance, office wing, silos, transformer yard, trees, hills | original slide 1: CLEAN ENERGY FOR A BETTER FUTURE |
| 2 | Rails appear and the **solar modules drop onto the roof one by one** (about 276 instanced modules) | original "Installation" text |
| 3 | **Walkway** (aluminium anti-slip tray + cross walkway) grows, **cleaning pipe** with spraying nozzles, **lifeline** posts and rope | original slide 2: GO SOLAR, SAVE MORE |
| 4 | DC trunk down the wall to the **inverters**, cable to the **transformer** and utility pole; glowing energy beads flow along it; panels brighten | wording for "Kabel DC & inverter" |
| 5 | Camera glides to the entrance and **into the building**: steel frame and trusses, LED fixtures that switch on, green **walkway** lanes, conveyor with moving cartons, robot cells, pallet racking | "from roof to production line" |
| 6 | Electrical room: **inverter** and **LVMDP** with status LEDs and displays | original slide 3 + original Monitoring text |

**Engine** (`assets/js/hme-world-core.js` + `assets/js/hme-world.js`, about 60 KB, loaded after the page is quiet): WebGL2, sun shadow map with PCF, GGX-style materials (corrugated cladding, seam roof, concrete, glass, solar cells, epoxy floor, foliage), hemisphere sky light, analytic sky reflections, indoor light attenuation, point lights from the nearest ceiling fixtures, ACES tone mapping, instancing for modules and trees, procedural sky and clouds. `draw(p)` is a pure function of the scroll progress, so the scene is fully scrubbable.
**Smoothness:** scroll -> progress -> critically damped follower (time constant 0.24 s) -> draw; the loop runs only while the picture still has to move; adaptive resolution; scroll is never locked.
**Fallbacks** are unchanged: no WebGL2, Save-Data, 2G/3G, <= 2 GB RAM / <= 2 cores, lost GPU context -> real photographs per chapter; reduced motion / no JavaScript -> static layout.
The earlier engine derived from the presentation (`hme-3d.js`) and its build script were **removed**.

### Photo/video tour (previous opening, now optional)

| Item | Detail |
|---|---|
| Concept | Full-screen (100svh) cinematic opening made of **five real HME project photographs** (three are the original website hero photos, two come from the official Company Profile: Mitra Saruta and Pei Hai Phase 2). Each scene has its own slow camera move (push-in, pan left/right, rise) and cross-fades into the next one; a 5-segment progress bar and a caption (scene number, label, and the three original slide messages) show where the visitor is in the tour. Segments are clickable. |
| Opening sequence | A: scenes settle from a slight zoom, logo fades in, eyebrow, headline lines (masked slide-up), sub-headline and CTAs appear one after another (about 1.2 s in total). B: the tour runs by itself, about 7.5 s per scene. C: while scrolling, the photo drifts and scales, the copy fades up and out, and the bottom bar fades (CSS scroll-driven animation: no scroll listener; browsers without it just scroll normally). Scroll is never locked. |
| Copy | Eyebrow, headline, sub-headline, both CTAs and "SCROLL TO EXPLORE" as proposed in the brief (CTAs go to /products/ and /contact/). The About section gets the proposed title "Engineering a Cleaner Energy Future." with the original "About Our Company" kept as its label and the original text untouched. |
| Navbar | Transparent over the tour (white text), turns into a blurred navy bar with a shadow after the first scroll. |
| New sections | **Our Solar Solutions** (Residential / Commercial / Industrial, using the live site's category names, clip-reveal images, hover zoom). **Featured Solar Projects**: four real projects with the exact names and capacities of the official Company Profile (Mitra Saruta 3 MWp, Pei Hai Phase 2 2,26 MWp, Inkasa Jaya 1,9 MWp, Boncafe Sejahtera 15,2 kWp), source line, link to the profile. **CTA band** "Ready to Power Your Business with Solar?" with "Discuss Your Solar Project" (contact page) and WhatsApp. The existing sections (mission/vision/goal, benefits, why choose us, steps, FAQ, quote form) are kept. |
| Video | **No video footage is bundled** (none exists in the project and nothing was downloaded from stock sites). The tour is fully video-ready: drop `solar-pv-tour.mp4` (+ optional `solar-pv-tour-mobile.mp4`, `solar-pv-tour.webm`) into `assets/hero/`; it loads after first paint, fades in over the photos, and the photo tour remains the poster/fallback (autoplay blocked, load error, Save-Data, 2G/3G, reduced motion). The failure path was tested with a corrupt file: the video element was removed and the photo tour kept running. Instructions: `assets/hero/README.txt`. |
| Performance | First photo is eager + preloaded (`fetchpriority=high`); the other four are fetched one scene ahead (or on first interaction) instead of all at once; one bundled + minified stylesheet per page (`assets/dist`); loops pause when the hero is off screen, the tab is hidden, or the bar is hovered/focused. Mobile has its own composition (content anchored to the bottom, full-width stacked buttons, caption reduced to the scene label). |
| Reduced motion | Static first photo, no intro, no camera move, no auto-advance (segments still switch scenes instantly). |

### Performance
WebP everywhere (original images converted, max 1600 px) with `srcset`/`sizes`; hero slide 1 is eager with `fetchpriority="high"`, everything else lazy; width/height on every image (CLS 0); self-hosted fonts with latin preload and `font-display: swap`; ~30 KB of CSS and ~10 KB of JS, deferred; carousel/animations are CSS + a few lines of JS.

## 2. Tests actually performed (2026-10-20)

| Check | Result |
|---|---|
| PHP syntax lint of every PHP file | pass |
| HTTP status of all routes (`/`, `/home`, no-slash redirects, 6 pages, company-profile, robots, sitemap, 404, `index.php`) | as designed |
| `includes/`, `config.php`, `storage/`, `docs/` requested over HTTP | 403 |
| Horizontal overflow, 8 URLs x 7 widths (320, 375, 414, 768, 1024, 1366, 1600) measured in iframes | no overflow |
| Visual review in the built-in browser: home (all sections, desktop), products, insulation (top + comparison), contact, company profile (incl. inline presentation), news, career, pop-up, mobile menu | looked correct; the mobile menu opens and lists every item |
| Quote form in the browser: empty submit (5 inline errors), valid submit (success message, form reset, record stored) | pass |
| Pop-up form in the browser: valid submit stored | pass |
| Contact form via `curl`: missing CSRF -> 419, invalid data -> 422 with per-field errors, honeypot -> nothing stored, no-JS invalid -> 303 redirect and errors rendered | pass |
| Text comparison old vs new (6 pages) | all body content found; only WordPress chrome missing (see `content-preservation.md`) |
| Browser console on home | no errors |
| Apache/PHP error log after the tests | no errors from this project |
| Lighthouse 13.5, mobile, simulated throttling, localhost - **after the animation layer** (re-run 2026-10-20) | `/` Perf **90** / A11y **100** / BP **100**; `/products/` 98/100/100; `/contact/` 97/100/100; `/newsblog/` 91/100/100; `/career/` 97/100/100; `/company-profile/` **60**/100/100 (see note). SEO 66 on all - only `is-crawlable`, caused by the intentional localhost noindex. CLS 0 on all pages except `/company-profile/` (0.13) |
| Lighthouse after the Solar PV Tour (mobile, simulated throttling) | `/` Performance **91-93** (two runs) / Accessibility **100** / Best Practices **100**; desktop `/` **96** / 100 / 100 (LCP 1.4 s, CLS 0). `/products/` mobile 99 / 100 / 100; desktop 100 / 95 / 100 (the 95 is axe measuring text mid-reveal-animation; mobile is 100). Note: Chrome's *observed* LCP on the home page is about 0.24 s; the simulated figure (3.2 s) is Lighthouse's throttled estimate. |
| Scroll reveal on the home page, scrolled top to bottom in the browser | 22 of 22 reveal elements switched from pending to visible, 0 left hidden; header got `is-scrolled` |
| `prefers-reduced-motion: reduce` (headless Chrome, `--force-prefers-reduced-motion`) | 0 elements hidden/pending (normal motion: 22 pending below the fold at load) |
| Own 3D world (built-in browser, headless Chrome with software WebGL2): scrubbed through all 6 chapters at 1100 px and 1280 px, and on a 390 px phone | sunrise aerial, module installation, walkway/pipe/lifeline, cables + inverters + transformer, entering the hall, interior line, electrical room all render with shadows and smooth shading; phone framing and captions fit |
| Frame rate of the new engine | **not measured**: the built-in browser pane was hidden (its animation frames are suspended), and software WebGL in headless Chrome says nothing about real GPUs. The previous engine measured 6.9 ms/frame on this PC; the new one draws a shadow pass + more geometry, so it should be measured on a real device. Adaptive resolution is in place. |
| Fallback: GPU context lost (simulated event) | opening returns to the photo chapters, caption source line switches |
| Lighthouse with the own 3D engine (starts 3.5 s after load) | mobile Performance **91** / Accessibility **100** / Best Practices **100** (LCP 2.9 s simulated, TBT 140 ms); desktop **100** / **100** / **100** (LCP 0.7 s). SEO 66 only because of the intentional localhost noindex. |
| Reduced motion (headless Chrome `--force-prefers-reduced-motion`) | section switched to `is-static` (first photo + listed captions), 3D not started |
| 7 widths x 6 pages overflow check, failed-resource check, console | no overflow, no 404s, no console errors |
| Solar PV Tour (browser): opening sequence, scene change by progress click, auto-advance (scene 2 loaded at ~5 s, switched at ~7.5 s), scroll exit (copy faded to 21 % at 420 px, navbar became solid), desktop 1440 and phone 390 layouts | worked as designed |
| Console review | found and fixed an invalid phone `pattern` regex (rejected by Chrome's `v` flag) and an iframe attribute warning |

\* The only failing SEO audit is `is-crawlable` - caused on purpose by the localhost `noindex`. All other SEO audits passed, but the real production SEO score has **not** been measured and the 95+ target is therefore not claimed.
Home LCP in the lab run: 3.2 s (hero photo). **`/company-profile/` note:** Lighthouse also scores the embedded interactive presentation (3D intro, fonts, counters), whose own layout shift and weight drive that page to Performance 63 / LCP 7.0 s / CLS 0.13. That file is the company's own presentation and was not modified; if a faster page matters more than the interactive deck, the PDF viewer (once a PDF is supplied) would score much higher.

### Not tested
Lighthouse desktop, and Lighthouse on `/insulation-thermotech/`, `/newsblog/`, `/career/`, `/company-profile/`; real e-mail delivery; browsers other than the Chromium-based built-in browser and headless Chrome; Safari/iOS; screen readers; full keyboard walkthrough by hand (tabs, details, dialog and menu follow the standard patterns, and Lighthouse accessibility is 100); motion smoothness judged by eye on a real device (scroll-up/down feel, hero entrance) - only counts and screenshots were checked; the pop-up's 30 s auto-open timer (the dialog itself was opened and submitted manually); behaviour on the production server (HTTPS, `mod_expires`/`mod_deflate` availability).

> **Update 2026-10-20:** the Insulation page (`/insulation-thermotech/`) and its 39 images were removed on request; it now returns 404 and is no longer in the menu, footer or sitemap. Test results below were measured before this removal. If the old WordPress URL had inbound links or rankings, consider a 301 redirect to `/products/` at deployment.

## 3. Unresolved findings / decisions needed

0. **Gemini reference:** the shared link is a 10 s AI-generated video (panel -> exploded layers -> energy to a building). Only its concept was reused; no frames, text or numbers from it are in the site (its "30 %" chart was not reproduced). If you want that exact video embedded, send the file and it can be dropped into assets/hero/ for the photo tour or used as a poster.
0. **Instagram reference Reel was not reviewed.** Instagram requires a login and the reel could not be opened from this environment, so the camera language (slow push-ins, lateral drifts, rising tilts along panel rows) is my own interpretation, not a copy. Send the footage or screen recordings if you want the moves matched more closely.
   **Tour video footage is missing** (see "Video" above); stock footage was deliberately not downloaded/hotlinked without a licence decision from you.

1. **Where do leads go?** Production forms are WordPress plugins whose recipients are not visible from outside. Right now leads are saved in `storage/leads/*.jsonl` (not e-mailed). Before go-live: set `send_mail => true` with a working mail setup (SMTP via `config.local.php` would be better than `mail()`), or tell me the recipient/CRM and I will wire it.
2. **Blog posts** (29) remain WordPress pages. Either keep WordPress alive for them (route only the new pages to this site) or migrate the posts - tell me which. Until then the listing links to `https://hexamultienergi.com/<slug>/` (`blog_base` in `config.php`).
3. **No PDF / brand guide was provided**; the design tokens come from the HTML company profile. Send the PDF to `assets/company-profile/` (any filename ending `.pdf`) and it appears on the page automatically; if its colours or fonts differ, only the `:root` block needs changing.
4. `/security-system` and `/other-product/` are 404 on production, so they were not linked from the new footer.
5. Production copy typos were preserved (listed in `content-preservation.md`) - tell me if you want them corrected.
6. WordPress site search was not recreated.
7. The pop-up opens once per session 30 s after load on the home page; the exact trigger on the old site is unknown.
8. CSS/JS are not minified (Lighthouse suggests ~8 KB savings) and there is no build step by design.

## 4. Run locally

1. Start Apache (and keep `mod_rewrite` enabled, default in XAMPP).
2. Open `http://localhost/websitehme/`.
3. Folder must be writable for the web user at `storage/leads/` (it is by default on XAMPP/Windows).
4. Re-generate image variants after adding images: `C:\xampp\php\php.exe tools\make-variants.php` (images go in `assets/images/wp/<key>.webp`).

## 5. Add or replace the company profile files

- **PDF**: copy it into `assets/company-profile/` (e.g. `hme-company-profile.pdf`). It is used full screen when no presentation folder exists, and its download buttons also appear next to the presentation; delete the file and they disappear.
- **Interactive presentation**: replace the contents of `assets/company-profile/presentation/` with the new build (it must keep an `index.html`) and replace `assets/company-profile/HME-Company-Profile.zip` for the offline download.
- Images instead of a PDF: tell me the order/format and I will add a gallery section.

## 6. Deploy to production (when approved)

1. Back up the current WordPress site (files + database).
2. Decide the blog strategy (finding 2) - this decides whether the new site replaces the web root or sits next to WordPress.
3. Upload **everything except** `tools/`, `docs/` (optional) and `storage/leads/*`; keep `.htaccess` (Apache). On Nginx the `try_files` equivalent of the rewrite rule is needed and the denied folders must be blocked in the server config.
4. Create `config.local.php` with `send_mail`/SMTP settings; make `storage/leads/` writable but never public.
5. Check `https://hexamultienergi.com/robots.txt` (must allow crawling) and `/sitemap.xml`; submit the sitemap in Search Console. Localhost serves `noindex` automatically; production does not.
6. Smoke test: every page, both forms (verify the lead arrives), WhatsApp link, Company Profile menu, 404.
7. Keep the old URLs (all kept) - no redirects needed except `/home` -> `/` (already built-in).
8. Run Lighthouse on the live URL and record the real scores.

## Update — smoother scroll-driven 3D opening (2026-10-20)

Feedback: the opening felt "kurang smooth". Changes:

- **Scroll follower**: replaced the exponential follower with a critically damped spring (SmoothDamp, 0.42 s) stepped in ≤1/60 s slices — position *and* velocity stay continuous, so a wheel notch no longer produces a jerk and the motion eases out when scrolling stops.
- **Camera path**: Hermite interpolation with tangents measured in scroll progress (the old uniform Catmull-Rom changed speed abruptly at keyframes with unequal spacing).
- **GPU/CPU cost per frame**: shadow map is re-rendered only when the sun or the installed-panel count changes (it was rendered every frame); ground/hills/dynamic props no longer cast shadows; PCF reduced from 9 to 4 hardware-filtered taps; point lights skipped until the lamps are on; panel instance matrices only recomputed while panels are being installed; dynamic meshes reuse one CPU array and `bufferSubData` instead of allocating and re-creating buffers each frame.
- **Adaptive resolution** reacts earlier (average frame > 26 ms).
- Lighthouse mobile after the change: Performance 92, Accessibility 100, Best Practices 100, TBT 30 ms, LCP 3.0 s (localhost, simulated throttling).
- Not measured: real-GPU frame rate (the test browser used a software renderer). If it still feels uneven on a specific device, tell us the device/browser so SMOOTH (`assets/js/factory-sim.js`) and the shadow-map size can be tuned.

### Second smoothness pass (measured on a real GPU)

Frame times were measured in headless Chrome on an Intel UHD GPU while simulating mouse-wheel scrolling through the whole track (CPU profile via CDP):
- Found a one-off **83 ms hitch** at the start of panel installation (shader variants compiled lazily on first use) → the engine now **warms up** (draws five poses, one per task) before the canvas is shown. Result: max frame 21 ms, p95 14 ms, no frame > 33 ms.
- Found that **regenerating the moving props every frame** (cartons, robot arms, roof fans, cars) dominated the CPU (~70% of script time). They are now static templates drawn **instanced** with one matrix each. With 4× CPU throttling (weak laptop) the average frame fell from 44 ms to 18 ms.
- Lighthouse mobile after both passes: Performance 95, Accessibility 100, Best Practices 100, TBT 30 ms.

---

## Revision 3 — full interactive redesign (2026-10-20)

Scope: every page, not only the home hero. Approach: audit → shared motion system → new section library → rebuild each page → test.

### What the visitor now gets

| Area | Result |
|---|---|
| **Opening** | Scroll-driven 3D factory (unchanged engine) + category chips (Residential / Commercial / Industrial), **"Lewati animasi"** button (instant jump past the track), hero logo removed on request, honest label "Ilustrasi 3D interaktif (bukan foto proyek)". |
| **Home** | Ticker + counters (verified facts only) → About (layered images, facts list) → **Solar solution selector** (Residential / Commercial / Industrial: photo, description, benefits, example projects, matching CTA) → **Scroll storytelling** (sticky photo follows Consultation → Installation → Monitoring) → **System explorer** (On-Grid / Off-Grid / Hybrid diagram, click a component, "PLN padam" simulation) → **Project explorer** (filter, big photo, capacity bars) → Services rows → Mission/Vision/Goal tabs → Bento (benefits, Why choose us, warranty) → Clients & brands marquees → FAQ → visual CTA → quote form. |
| **Products** | Hero with jump chips, three alternating editorial rows (Residential / Commercial / Industrial), the original 4 benefit cards, system explorer + comparison, services, **Full Purchase vs Rental** schemes, advantages, brand marquee, CTA. Navbar gets a Products dropdown with anchors. |
| **Contact** | Four quick-action cards (call, WhatsApp, e-mail, Google Maps link), form (now pre-filled from `?topik=residential|commercial|industrial`), what happens next (3 steps), FAQ. |
| **News & Blog** | Featured latest post, live search ("izin" etc.) with result count, same 29 posts. |
| **Career** | Editorial split, team areas, vacancy posters with click-to-zoom lightbox, mail CTA. |
| **Navbar / footer** | Transparent over every hero, solid after scroll, animated underline, dropdown, animated mobile drawer; footer with 5 columns, social chips with icons, Maps link, consultation button, back-to-top. |

### Motion system (consistent, reduced-motion safe)

- Tokens in `assets/css/animations.css`: `--ease-out`, `--ease-in-out`, `--dur-fast/-micro/-reveal/-slow`, `--stagger`.
- Reveal classes: `.reveal-up/-left/-right/-scale/-clip`, **new** `.reveal-mask` (image wipe + settle zoom), `.reveal-draw`, `[data-split]` (headline words), `[data-count]` (counters), `[data-parallax]`, `[data-magnetic]`, `.marquee`.
- Opacity of reveals settles in the first 40% of the animation, so text reaches full contrast almost immediately.
- Page transition: native cross-document **View Transitions** (`@view-transition`), 0.2–0.3 s fade, header kept in place; ignored by browsers without support; off under reduced motion. No SPA.
- Custom cursor was deliberately **not** added (accessibility/performance); magnetic buttons run only on `(hover:hover) and (pointer:fine)`.

### Data honesty

All new facts come from the official Company Profile (`assets/company-profile/presentation`) and the live site, collected in `includes/data/company.php`: founded Nov 2022, "10+ MWp" (the five industrial projects sum to 10,26 MWp), 3 system types, "hingga 50%" (shown as the profile's own statement with its caveat), portfolio names and capacities, services, financing schemes, clients, brand logos, warranty (from the existing FAQ). The system explorer is labelled an educational diagram, not a simulator. No testimonials, ratings, prices or invented figures.

### Files

New: `includes/data/company.php`, `includes/components/{highlights,system-explorer,project-showcase,logos,faq,cta-visual}.php`, `assets/css/sections.css`, `assets/js/{motion,solar-ui}.js`, 31 project/logo images `assets/images/wp/hme-*.webp` (+ responsive variants).
Rewritten: `pages/{home,products,contact,newsblog,career}.php`, `includes/footer.php`.
Edited: `includes/{functions,forms,bootstrap,header}.php` (img attrs, image parts, prefill, gzip fallback, deferred CSS), `includes/data/{site,pages,factory-sim}.php`, `includes/components/factory-sim.php`, `assets/css/{style,animations,home,factory-sim}.css`, `assets/js/{scroll-reveal,interactions,factory-sim}.js`, `.htaccess`.

### Performance work done along the way

- Home CSS for sections below the first screen (`sections.css`) is injected after `load`, so it never blocks the first paint; the unused old section CSS was removed.
- HTML is gzip-compressed by PHP when the host does not do it (`ob_gzhandler`); `.htaccess` also compresses `text/javascript`.

### Test results (headless Chrome + Lighthouse, localhost)

| Check | Result |
|---|---|
| Interaction test (counters, selector, story, explorer incl. outage, project filter/select, FAQ, form validation, skip button, mobile menu, news search, lightbox, contact prefill) at 1366, 820 and 390 px | all pass, no JS errors |
| Horizontal overflow, 11 widths (320–1920) × 7 pages | none |
| Reduced motion | no hidden/pending content, no split text, counters final, static hero |
| Lighthouse mobile | home 91 / products 93 / contact 97 / news 90 / career 95 performance; accessibility 96–100; best practices 100 |
| Lighthouse desktop | home 99 / products 100 performance |

Notes: the few accessibility points below 100 were colour-contrast samples taken while text was fading in (final colours pass); keyframes were adjusted afterwards so opacity settles in 40% of the animation. SEO is not scored on localhost (pages are `noindex` there).

### Still open

- **No real video**: the opening is the 3D scene (+ photo fallback). Drop `assets/hero/solar-pv-tour.mp4` if footage becomes available (see `assets/hero/README.txt`).
- Leads are stored in `storage/leads/*.jsonl`; e-mail delivery needs `send_mail` + SMTP on production.
- Blog posts still link to WordPress; no detail pages for projects (no source material for them), so the project explorer is an in-page viewer.
- Not tested on real phones or Safari.
