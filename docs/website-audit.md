# Website audit - PT Hexa Multi Energi

Audit date: 2026-10-20. Sources: live site https://hexamultienergi.com/ (HTML snapshot saved in `C:\xampp\backups\hme-website\2026-10-20\`) and the local folders in `C:\xampp\htdocs`.

## 1. What actually exists locally (important)

| Path | What it really is | Used as |
|---|---|---|
| `C:\xampp\htdocs\Company_profile` (`http://localhost/Company_profile/`) | The **new interactive Company Profile presentation** (single `index.html` + 3D intro, `fonts/`, `img/`, `HME-Company-Profile.zip`). It is **not** the website source. | Design source (colours, fonts, hexagon motif) and the content of the Company Profile menu. Not modified. |
| `C:\xampp\htdocs\websitehme` | Empty working folder when this audit started. | Target of the redesign (`http://localhost/websitehme/`). |
| `C:\xampp\htdocs\web-hme` | Laravel inventory app ("barang"), unrelated to the website. | Ignored. |
| `C:\xampp\htdocs\Company_profile_share.zip` | Share copy of the presentation. | Ignored. |

The "starter code" ZIP mentioned in the brief was not present on disk, so the PHP structure was built from scratch following the structure proposed in the brief. No PDF company profile was provided yet (see `implementation-report.md`, "Company profile files").

**Consequence:** there is no local copy of the production website's source. The old website was audited from its public HTML, and its content was copied verbatim from there.

## 2. Technology of the production site

- WordPress (Inspiro theme by WPZOOM, Elementor page builder, Yoast SEO, a lazy-loading plugin).
- Forms: **Fluent Forms** (#4 home quote form, #1 contact form) and **Formidable Forms** (#10 pop-up form, id `contact-us23`), each with the Akismet honeypot (`ak_hp_textarea`).
- Slider: WordPress slider plugin (`/uploads/slider/cache/...`).
- Sitemap: Yoast (`/sitemap_index.xml`, `/wp-sitemap.xml`), robots.txt allows everything.
- Downloads plugin (`wpdmpro`) and e-landing pages exist in the sitemap index but have no visible pages.

New implementation: **PHP Native (no framework)**, front-controller routing, runs from the web root or from a sub-folder (`/websitehme/`).

## 3. Page map (live site)

| URL | Title tag | Status | New route |
|---|---|---|---|
| `/` | PT Hexa Multi Energi Surabaya - PLTS Surabaya - Solar Panel | 200 | `/` (`pages/home.php`) |
| `/products/` | Products - PT Hexa Multi Energi Surabaya | 200 | same |
| `/insulation-thermotech/` | Insulation - ... | 200 | **removed on request (404)** |
| `/contact/` | Contact - ... | 200 | same |
| `/newsblog/` | News & Blog - ... | 200 | same (listing only) |
| `/career/` | Career - ... | 200 | same |
| `/home` | (redirect) | 301 -> `/` | 301 -> `/` |
| `/security-system`, `/other-product/` | Page not found | **404 on production** | not recreated (see content-preservation.md) |
| 29 blog posts (`/<slug>/`) | - | 200 | **still on WordPress**, linked from the listing |
| - | - | - | **NEW** `/company-profile/` |

## 4. Home page sections (order)

1. Header: logo, Home, Products (> Pembangkit Listrik Tenaga Surya, Insulation), Contact, News & Blog, WHATSAPP button, search form (WordPress search).
2. Hero slider, 3 slides (CLEAN ENERGY FOR A BETTER FUTURE / GO SOLAR, SAVE MORE / POWERING TOMORROW, TODAY).
3. About Our Company (2 paragraphs + project photo).
4. Tabs: Our Mission / Our Vision / our goal (each with photo + bullet list).
5. ADVANTAGES - Benefits of Going Solar (3 cards).
6. Why Choose Us? (animated headline "Creating quality urban lifestyles, building" + Experienced / Reliable / Sustainable / Affordable / Customizable / Trustworthy).
7. ADVANTAGES - Our Three Step Procedure (Consultation / Installation / Monitoring).
8. FAQ (5 questions + "Masih Butuh Bantuan?") and "Still need help? / Get Help Now".
9. Dapatkan Penawaran Terbaik dari Kami + quote form.
10. Footer (blurb, social links, Links, Other, copyright).
11. Hidden pop-up with an offer text and the detailed form.

## 5. Features, endpoints and fields

### Forms (all three submitted through WordPress plugins; recipients/endpoints are configured in the WP admin and are **not visible** from the public HTML)

| Form | Where | Original field names | New field names |
|---|---|---|---|
| Fluent Form #4 "Dapatkan Penawaran" | home | `names[first_name]`, `email`, `numeric-field` (WhatsApp), `numeric-field_1` (KVA), `description` (address) | `nama`, `email`, `telepon`, `daya_kva`, `alamat` |
| Fluent Form #1 "Contact Us" | /contact/ | same + `address_1[address_line_1/city/state/zip]`, `message` | `nama`, `email`, `telepon`, `daya_kva`, `alamat`, `kota`, `provinsi`, `kode_pos`, `pesan` |
| Formidable #10 pop-up | home (hidden) | `item_meta[44]` nama, `[37]` kontak, `[38]` email, `[43]` jenis bangunan, `[46]` jenis atap, `[41]` kapasitas daya, `[61]` tagihan listrik, `[53]` alamat | `nama`, `telepon`, `email`, `jenis_bangunan`, `jenis_atap`, `kapasitas_daya`, `tagihan_listrik`, `alamat` |

All fields were `required` on production except "Kode Pos"; the required message was "Bidang ini tidak boleh kosong". Same rules were kept.

### Links / integrations
- WhatsApp: `https://wa.me/6289637737431` (header button, FAQ "Get Help Now", contact page).
- Phone `tel:+62317437168`, mail `info@hexamultienergi.com`, career mail `hrd@hexamultienergi.com`.
- Social: Facebook, Instagram, LinkedIn (`/hexamultienergi`, `/company/pt-hexa-multi-energi`).
- No calculator, API or database feature is exposed publicly.

## 6. Findings / risks

1. Production form delivery cannot be replicated 1:1 outside WordPress (see implementation report): the new handler stores leads in `storage/leads/*.jsonl` and optionally e-mails them.
2. The blog posts are WordPress content. The new site links to them on `https://hexamultienergi.com/<slug>/`. If WordPress is removed from production those links break. Decision needed (see report).
3. The footer on production links to `/security-system` and `/other-product/`, which both return 404.
4. The home page slider "Full 1" image (`f1.jpg`) is a 100x68 placeholder; the real slide images were identified from the page's slide markup.
5. The insulation page repeats several images twice (desktop + mobile versions of the same Elementor container); they are shown once in the redesign.
6. Spelling errors exist in the production copy (e.g. "linkungan", "garan", "oengajuan", "Perbadaan", "higga"). They were **kept verbatim**; list in `content-preservation.md`.
7. `og:image` of several pages on production is a low-resolution or unrelated image.
