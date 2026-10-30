<?php
/** Indonesian page titles / descriptions / breadcrumbs (base: includes/data/pages.php). Wording follows KBBI/PUEBI. */
$name = cfg('site_name');

return [
    '' => ['meta' => [
        'title' => 'PT Hexa Multi Energi Surabaya - PLTS Surabaya - Panel Surya',
        'description' => 'Perusahaan yang bergerak di bidang konsultasi dan instalasi energi terbarukan. PLTS Surabaya yang melayani kawasan Citraland Surabaya.',
    ]],
    'products' => ['meta' => [
        'title' => 'Produk - ' . $name,
        'description' => 'PLTS Residensial, Komersial, dan Industri: hemat tagihan listrik, biaya lebih rendah dalam jangka panjang, energi terbarukan yang ramah lingkungan, dan nilai properti yang lebih tinggi dengan PLTS.',
        'crumbs' => [['Beranda', ''], ['Produk', 'products/']],
    ]],
    'contact' => ['meta' => [
        'title' => 'Kontak - ' . $name,
        'description' => 'Hubungi Hexa Multi Energi untuk konsultasi gratis pemasangan panel surya (PLTS) On-Grid, Off-Grid, dan Hybrid di Surabaya.',
        'crumbs' => [['Beranda', ''], ['Kontak', 'contact/']],
    ]],
    'newsblog' => ['meta' => [
        'title' => 'Berita dan Blog - ' . $name,
        'description' => 'Artikel dan berita seputar PLTS: panduan memilih kontraktor panel surya, syarat izin PLTS atap, sistem sewa PLTS, dan kiat perawatan inverter.',
        'crumbs' => [['Beranda', ''], ['Berita dan Blog', 'newsblog/']],
    ]],
    'career' => ['meta' => [
        'title' => 'Karier - ' . $name,
        'description' => 'Bergabunglah dengan tim PT Hexa Multi Energi. Lihat lowongan yang dibuka dan kirim lamaran Anda.',
        'crumbs' => [['Beranda', ''], ['Karier', 'career/']],
    ]],
    'company-profile' => ['meta' => [
        'title' => 'Profil Perusahaan - ' . $name,
        'description' => 'Profil perusahaan resmi PT Hexa Multi Energi: buka presentasi interaktif atau unduh dokumen profil perusahaan.',
        'crumbs' => [['Beranda', ''], ['Profil Perusahaan', 'company-profile/']],
    ]],
];
