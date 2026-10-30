<?php
/**
 * Route table: route (without slashes) => template in /pages + SEO metadata.
 * Titles, URLs and the home/contact descriptions are the ones used on the live site;
 * other descriptions are summarised from each page's own content.
 */
$name = cfg('site_name');
$up = 'https://hexamultienergi.com/wp-content/uploads/';
$opening = (require INC . '/data/hero-tour.php')['opening'] ?? 'simulation';

return [
    '' => ['template' => 'home', 'meta' => [
        'key' => 'home', 'path' => '', 'og_type' => 'website',
        'title' => 'PT Hexa Multi Energi Surabaya - PLTS Surabaya - Solar Panel',
        'description' => 'Perusahaan yang bergerak di bidang konsultasi dan instalasi energi terbarukan. PLTS Surabaya area Citraland Surabaya.',
        'og_image' => $up . '2026/03/WhatsApp-Image-2025-09-09-at-14.05.26-2-scaled.jpeg',
        'body_class' => 'page-home',
        'assets' => $opening === 'tour'
            ? ['css' => ['css/home.css'], 'css_defer' => ['css/sections.css'], 'js' => ['js/solar-tour.js', 'js/solar-ui.js']]
            : ['css' => ['css/home.css', 'css/factory-sim.css'], 'css_defer' => ['css/sections.css'], 'js' => ['js/factory-sim.js', 'js/solar-ui.js']],
    ] + ($opening === 'tour' ? ['preload_image' => 'whatsapp-image-2025-02-18-at-05-33-49-1-scaled'] : [])],
    'products' => ['template' => 'products', 'meta' => [
        'key' => 'products', 'path' => 'products/', 'body_class' => 'has-hero', 'assets' => ['css' => ['css/sections.css'], 'js' => ['js/solar-ui.js']],
        'title' => 'Products - ' . $name,
        'description' => 'Residential, Commercial & Industrial Solar: hemat tagihan listrik, pengurangan biaya jangka panjang, energi terbarukan ramah lingkungan, dan nilai properti lebih tinggi dengan PLTS.',
        'og_image' => $up . '2024/07/01_Hybrid-close-up.jpg',
        'crumbs' => [['Home', ''], ['Products', 'products/']],
    ]],
    'contact' => ['template' => 'contact', 'meta' => [
        'key' => 'contact', 'path' => 'contact/', 'body_class' => 'has-hero', 'assets' => ['css' => ['css/sections.css'], 'js' => []],
        'title' => 'Contact - ' . $name,
        'description' => 'Hubungi Hexa Multi Energi untuk konsultasi gratis pemasangan panel surya (PLTS) On-Grid, Off-Grid, dan Hybrid di Surabaya.',
        'og_image' => $up . '2024/06/IMG_20240529_102719_172-scaled.jpg',
        'crumbs' => [['Home', ''], ['Contact', 'contact/']],
    ]],
    'newsblog' => ['template' => 'newsblog', 'meta' => [
        'key' => 'newsblog', 'path' => 'newsblog/', 'body_class' => 'has-hero', 'assets' => ['css' => ['css/sections.css'], 'js' => ['js/solar-ui.js']],
        'title' => 'News & Blog - ' . $name,
        'description' => 'Artikel dan berita seputar PLTS: panduan memilih kontraktor panel surya, syarat izin PLTS atap, sistem rental PLTS, dan tips perawatan inverter.',
        'og_image' => $up . '2026/08/EPC-PLTS-Surabaya-Jawa-Timur-300x201.jpg',
        'crumbs' => [['Home', ''], ['News & Blog', 'newsblog/']],
    ]],
    'career' => ['template' => 'career', 'meta' => [
        'key' => 'career', 'path' => 'career/', 'body_class' => 'has-hero', 'assets' => ['css' => ['css/sections.css'], 'js' => ['js/solar-ui.js']],
        'title' => 'Career - ' . $name,
        'description' => 'Bergabunglah dengan tim PT Hexa Multi Energi. Lihat lowongan yang dibuka dan kirim lamaran Anda.',
        'og_image' => $up . '2026/03/3-1-819x1024.png',
        'crumbs' => [['Home', ''], ['Career', 'career/']],
    ]],
    'company-profile' => ['template' => 'company-profile', 'meta' => [
        'key' => 'company-profile', 'path' => 'company-profile/', 'body_class' => 'page-profile',
        'title' => 'Company Profile - ' . $name,
        'description' => 'Company profile resmi PT Hexa Multi Energi: buka presentasi interaktif atau unduh dokumen profil perusahaan.',
        'og_image' => $up . '2026/03/WhatsApp-Image-2025-09-09-at-14.05.26-2-scaled.jpeg',
        'crumbs' => [['Home', ''], ['Company Profile', 'company-profile/']],
    ]],
];
