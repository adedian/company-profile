# Multi-language (Bahasa Indonesia + English)

Indonesian is the default language. English lives under `/en/`. Both versions are real, crawlable pages.

## URLs and routing

| Indonesian (default) | English |
| --- | --- |
| `/` | `/en/` |
| `/products/` | `/en/products/` |
| `/contact/` | `/en/contact/` |
| `/newsblog/` | `/en/newsblog/` |
| `/career/` | `/en/career/` |
| `/company-profile/` | `/en/company-profile/` |

* The old routes are unchanged (no redirects, no 404s). `index.php` splits the `/en` prefix off in `includes/language.php` before routing, so every route works in both languages.
* `url()` adds the prefix automatically for pages (`/en/...`) and leaves `assets/`, `sitemap.xml` and `robots.txt` alone. The form posts to `/kirim/` or `/en/kirim/`, so server messages follow the page language.
* Only `id` and `en` are accepted (allow-list in `LANGUAGES`). No file name is ever built from user input.

## How the language is remembered

* The URL decides the language of every page, so every internal link keeps the visitor in their language and a refresh never changes it.
* Choosing a language in the switcher also stores `hme_lang` (cookie, 1 year). It is only used for one thing: a returning visitor who opens the bare Indonesian home page `/` is sent to `/en/` (302, `Vary: Cookie`). Search engines send no cookie, so they always see both versions.
* The switcher links are normal links: `/en/...` for English, `...?hl=id` for Indonesian (the server stores the choice and redirects to the clean URL). They work without JavaScript and keep the query string (for example `?topik=industrial`).
* Default with no preference: Indonesian.
* Text already typed in a form is parked in `sessionStorage` when the switcher is used and put back on the other language's page (`interactions.js`, `saveDrafts` / `restoreDrafts`).

## SEO

* `<html lang="id|en">`, `og:locale` and `og:locale:alternate`.
* `rel="canonical"` points at the page's own language version.
* `hreflang="id"`, `hreflang="en"` and `hreflang="x-default"` (= Indonesian) on every real page; not on the 404 page.
* Separate `title` and `meta description` per language (`translations/data/*/pages.php`); breadcrumb and FAQ JSON-LD are output in the page language.
* `sitemap.xml` lists every page twice (id, en) with `xhtml:link` alternates. `robots.txt` blocks `/kirim/` and `/en/kirim/` in production.

## Where the texts live

| What | File(s) |
| --- | --- |
| UI strings used by templates, forms, JS (`t('nav.home')`) | `includes/translations/id.php`, `includes/translations/en.php` (flat keys, same keys in both) |
| Content (home, company data, hero, simulation captions, navigation/footer, page meta, blog listing) | `includes/data/*.php` = structure + original wording; `includes/translations/data/{id,en}/<name>.php` = text per language, merged over the base with `data('<name>')` |
| Strings needed by JavaScript | `js.*` keys, printed as JSON in the footer (`#hme-i18n`) and read through `window.hmeI18n` |
| 3D opening callouts | `sim.callout.01-12`, passed to the WebGL scene through `data-callouts` |
| Company Profile presentation (iframe) | `assets/company-profile/presentation/i18n.js` + `i18n-en.js`, switched on by `?lang=en` |
| Language helpers | `includes/language.php` (`t()`, `data()`, `num()`, `lang_boot()`, `prod_page_url()`) |
| Switcher markup | `includes/components/language-switcher.php` (+ CSS in `assets/css/style.css`, JS in `assets/js/interactions.js`) |

Rules used in the translations: company, brand, client and project names, addresses, product names (Home Solution) and the system names On-Grid / Off-Grid / Hybrid and technical terms (EPC, O&M, inverter, kWp, Tier-1) are kept. Numbers and claims are unchanged; only the number format follows the language (`2,26 MWp` / `2.26 MWp`).

Form option lists keep their Indonesian *value* (that is what is validated and stored, so the sales team always gets the same wording); only the visible label is translated. Staff e-mails and the stored lead use the Indonesian labels and record the site language (`lang`).

## Adding or changing a text

1. UI string: add the key to **both** `id.php` and `en.php`.
2. Content text: edit the entry in `translations/data/id/<name>.php` and `.../en/<name>.php`. Overlays are merged by position, so keep list lengths equal to the base file.
3. Run `php tools/check-translations.php`. It fails when a key is missing in one language, a `{placeholder}` differs, or an overlay list no longer matches its base.

## Known limits / follow-ups

* Blog articles live on the WordPress site in Indonesian. The English listing translates titles and excerpts and says that the full articles are in Indonesian (`news.note`).
* `assets/company-profile/HME-Company-Profile.zip` (offline copy) is the Indonesian presentation only.
* The presentation's English texts are applied by its own small dictionary (exact texts + patterns for numbers). If its Indonesian wording changes, update `presentation/i18n-en.js`; an untranslated string simply stays Indonesian.

## Indonesian wording = full Indonesian, KBBI/PUEBI (decision 2026-10-23)

This replaces the 2026-10-22 decision (English headings as on hexamultienergi.com). The Indonesian version (site, forms,
page titles, blog listing and the Company Profile deck) is written in standard Indonesian:

* Spelling and word choice follow KBBI/PUEBI: *Anda* (capital), *andal*, *tepercaya*, *kinerja*, *surel*, *berkas*, *unduh*, *dasbor*, *pemantauan*, *pemeliharaan*, *komersial*, *karier*, *nomor*, *aspal*, *dolar*, *izin*, *mengapa* (not *kenapa*).
* Headings use title case; the particles *dan, yang, di, ke, dari, untuk, dengan, pada, tentang* stay lower case. "&" becomes "dan" in running labels.
* Kept as they are: company, brand, client and project names, units (kWp, MWp, kVA), acronyms (PLTS, EPC, O&M, LVMDP, PLN, ROI, BEP), technical terms with no common Indonesian equivalent (inverter, lifeline, Tier-1) and the three system names On-Grid / Off-Grid / Hybrid.
* Product lines are *PLTS Residensial / Komersial / Industri* (English: Residential / Commercial / Industrial Solar).
* Blog dates are shown as "4 Agustus 2026" (`post_date()` in `includes/language.php`); English keeps the stored dd/mm/yyyy. Author names are capitalised.
* The typos that were left untouched earlier ("linkungan", "garan", "oengajuan", "Nomer Kontak", "Komersil", "Aspalt", "Bagiamana") are corrected in the Indonesian version.
* Form option values are now KBBI too (`Komersial`, `Genteng Aspal`, `Galvalum Tanpa Baut`, `Galvalum Berbaut`, `Lebih dari 60.000 VA`); the label keys `form.opt.*` follow the new slugs in both language files.
* All Indonesian text lives in `translations/id.php` and `translations/data/id/*.php` (the base files in `includes/data/` keep the original live-site wording and are only the structure). The deck was edited in place (`presentation/index.html`, `app.js`, `scene*.js`, `intro*.js`) and `i18n-en.js` keys were renamed to the new Indonesian texts, so `?lang=en` still translates everything. `HME-Company-Profile.zip` was rebuilt from the current deck.
* Backups of the previous state: `C:\xampp\backups\hme-website\id-overlay-before-kbbi\` (translations, deck files, old zip) and `...\id-overlay-before-live-wording\`.

## Deck update 2026-10-30 (sync with `C:\xampp\htdocs\Company_profile`, commit `22d8f92`)

The website copy was last taken from deck commit `df583a4`. The new deck (Apple-style look, liquid glass cards, Three.js factory with AC combiner and LVMDP, "How solar panels work" chapter with a 3D module, glossy financing charts, portfolio as a company list with photo stage, tidier org chart) was merged in with a three-way merge (`git merge-file`, base `df583a4`), so all earlier KBBI and `HMEi18n` edits stayed.

* New files: `factory3d.js`, `panel3d.js`, `panel3d-ui.js`, `vendor/three.min.js` (the other `vendor/` folders of the deck repo are not used by the page and were not copied; neither were `build-pdf.js`, `build-single.py` or `HME-Company-Profile.html`).
* New Indonesian texts follow the KBBI rule (e.g. *Cara Kerja Panel Surya*, *Lembar belakang (backsheet)*, *Kotak sambungan (junction box)*, *antipantul*, *teranodisasi*, *hingga* instead of "up to", *Siaga*, *daring*); the factory labels use the same words as `scene.js` (*Meter kWh*, *Jalur teknisi*, *Pipa air pembersih*, *Tali pengaman*, *Kanopi parkir*, *Pemantauan*).
* English: about 100 new entries and 5 patterns in `i18n-en.js` (section "2026-10-30 deck"); canvas text in `factory3d.js` goes through `HMEi18n.t()`; `panel3d-ui.js` and the chart decimals in `app.js` follow `HMEi18n.locale`.
* The deck's own **Download** button points to `../HME-Company-Profile.zip` on the website; it is removed from the `index.html` inside the zip.
* `HME-Company-Profile.zip` was rebuilt from the new deck (launcher files taken over from the previous zip).
* Website facts in `includes/data/company.php` did not need changes: portfolio names and capacities, "hingga 50%", schemes and the team are the same in the new deck.
* Backup of the previous deck and zip: `C:\xampp\backups\hme-website\deck-before-2026-10-30\`.

Next time: diff the deck repo against `22d8f92`, merge the same way, then compare the Indonesian and `?lang=en` pages for text that stays untranslated.
