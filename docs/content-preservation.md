# Content preservation

Rule applied: **copy and facts were not rewritten.** All text lives in `includes/data/*.php` and `pages/*.php`, copied from the production HTML snapshot (`C:\xampp\backups\hme-website\2026-10-20\`). Only layout, grouping and styling changed.

## Verification performed

An automated comparison was run on 2026-10-20: every text line of each production page body (home, products, insulation-thermotech, contact, newsblog, career) was searched, normalised, in the rendered local page. Result: **all page content was found**. The only lines not found are WordPress theme chrome listed under "Intentionally not carried over".

## What was kept (per section)

- **Home**: 3 hero slides (headline + tagline + image), About Our Company (both paragraphs, link on "PT Hexa Multi Energi", *end-to-end* emphasis), Our Mission / Our Vision / our goal with their photos and all bullets (3 / 3 / 5), Benefits of Going Solar (3 cards with their images), Why Choose Us? (lead sentence + the 6 words), Our Three Step Procedure (3 steps with images), FAQ (all 5 Q&A + "Masih Butuh Bantuan?" with phone / WhatsApp / e-mail) and "Still need help? / Get Help Now", the quote section text and form, the pop-up text and form, footer text, social links, copyright.
- **Products**: heading, sub-heading, tagline, "Contact Us" button, 4 benefit cards.
- **Insulation**: page **removed on request (2026-10-20)** together with its images, nav entry and footer link. The original is kept in `C:\xampp\backups\hme-website\2026-10-20\` if it is ever needed again.
- **Contact**: form (all fields), photo, phone, WhatsApp, e-mail.
- **News & Blog**: all 29 listed posts (title, excerpt, thumbnail, date, author, comment count, link).
- **Career**: heading, texts, 3 vacancy images, mail-to button.
- **SEO text**: existing title tags (all pages) and existing meta descriptions (home, contact). Descriptions for products / insulation / newsblog / career had none on production; new ones were written from the page's own content.

## Verbatim typos (kept on purpose - decide whether to fix)

| Where | Text on production |
|---|---|
| Hero slide 1 | "ramah **linkungan**" |
| FAQ | "Iya, kami memiliki **garan** 1 tahun maintenance ..." |
| FAQ | "Untuk **oengajuan** kredit ..." |
| Quote form | placeholder "First Name" on the *Nama Lengkap* field |
| Why Choose Us | the lead "Creating quality urban lifestyles, building" ends with a comma-less dangling word because the original is an animated headline whose rotating words are the six items |

## Intentionally not carried over (and why)

| Item | Reason |
|---|---|
| WordPress search form in the header ("Search for:") | needs WordPress; the PHP site has no search backend |
| "Toggle navigation / Toggle sidebar" labels, slider alt names "Full 1 / Slide 2 / Slide 3" | theme chrome, replaced by accessible equivalents |
| Footer links **Security Systems** (`/security-system`) and **Other Product** (`/other-product/`) | both pages return **404 on production**; keeping them would ship dead links. They can be restored in `includes/data/site.php` (`footer_links`) in one line each once the pages exist. |
| "Powered by WordPress / Inspiro WordPress Theme by WPZOOM" | no longer true for the new site |
| Honeypot label "If you are human, leave this field blank." | replaced by an invisible honeypot (`website`) |
| Slider placeholder `f1.jpg` (100x68) | not a real slide image |

## Added (not on production)

- **Company Profile** menu item + page (requested).
- Footer "Company Profile" link and a "Contact" column in the footer using the existing address / phone / WhatsApp / e-mail (no new facts).
- Hero buttons: "Dapatkan Penawaran" (existing label, scrolls to the form) and "WHATSAPP" (existing label and link).
- Brand text "Hexa Multi Energi / PLTS Surabaya" beside the logo.
- Accessible labels (Breadcrumb, Previous/Next slide, etc.).
- JSON-LD (see implementation report). No ratings, reviews or certifications were added.

## Revision 3 additions (2026-10-20)

New sections reuse existing copy where it exists (About, Mission/Vision/Goal, Solutions, Advantages, Why Choose Us, Steps, FAQ, Products cards, Career, Contact) and add **only** facts taken from the official Company Profile (`assets/company-profile/presentation`): founding date, HQ, sectors, technologies, systems comparison, services, financing schemes, portfolio capacities, clients, brands, and the "hingga 50%" statement (shown as the company's own claim with its caveat). New UI labels written for navigation only: "Lewati animasi", "Simulasikan PLN padam", "Contoh proyek HME", "Kembali ke atas", "Konsultasi Gratis", section lead sentences that describe how to use the interactive blocks. Everything is in `includes/data/company.php` and the page templates.
