<?php
/**
 * Project portfolio. The projects, photos and facts come from https://hexamultienergi.com/portfolio/ (snapshot 2026-11-09)
 * and its six project pages; every project now has its own page on this site.
 *
 * cat   : ci (Commercial & Industrial) | res (Residential), the two filters of the original page
 * type  : commercial | industrial | residential (the "Type" field of each project page)
 * year / month : "Date" field of the project page (month null = only the year is given)
 * kwp   : "Capacity" field. The original prints "Kwh", but the Company Profile gives the same figures in kWp/MWp
 *         (44.2 kWp, 15.2 kWp, 1.59 MWp, 1.51 MWp, 1.9 MWp), so the unit is kWp. null = not published.
 * image : main photo (the first of photos); photos : every photo of the project page, in the order of the original page
 *          (files: assets/images/wp/hme-<project>-NN.webp, converted from the original photos)
 * slug  : address of the project page, /portfolio/<slug>/ (pages/portfolio-detail.php)
 * Text that differs per language (place, alt) is overridden in includes/translations/data/<lang>/portfolio.php, same order.
 */
return [
    [
        'title' => 'Hotel Azana Style', 'place' => 'Tulungagung Kota, Jawa Timur',
        'cat' => 'ci', 'type' => 'commercial', 'year' => 2025, 'month' => 3, 'kwp' => 44.25,
        'image' => 'hme-azana-01', 'alt' => 'PLTS atap Hotel Azana Style, Tulungagung',
        'slug' => 'hotel-azana-style-tulungagung',
        'photos' => ['hme-azana-01', 'hme-azana-02', 'hme-azana-03', 'hme-azana-04', 'hme-azana-05', 'hme-azana-06', 'hme-azana-07'],
    ],
    [
        'title' => 'PT Boncafe Sejahtera', 'place' => 'Gubeng, Surabaya, Jawa Timur',
        'cat' => 'ci', 'type' => 'commercial', 'year' => 2024, 'month' => null, 'kwp' => 15.21,
        'image' => 'hme-boncafe-01', 'alt' => 'PLTS atap PT Boncafe Sejahtera, Gubeng Surabaya',
        'slug' => 'pt-boncafe-sejahtera-surabaya',
        'photos' => ['hme-boncafe-01', 'hme-boncafe-02', 'hme-boncafe-03', 'hme-boncafe-04', 'hme-boncafe-05', 'hme-boncafe-06', 'hme-boncafe-07', 'hme-boncafe-08', 'hme-boncafe-09'],
    ],
    [
        'title' => 'Rumah Tinggal Surabaya', 'place' => 'Surabaya, Jawa Timur',
        'cat' => 'res', 'type' => 'residential', 'year' => null, 'month' => null, 'kwp' => null,
        'image' => 'rectangle-51', 'alt' => 'PLTS atap rumah tinggal di Surabaya',
        'slug' => 'rumah-tinggal-surabaya',
    ],
    [
        'title' => 'PT Setia Kawan Makmur Sejahtera', 'place' => 'Kec. Kedungwaru, Tulungagung, Jawa Timur',
        'cat' => 'ci', 'type' => 'industrial', 'year' => 2024, 'month' => 3, 'kwp' => 1586,
        'image' => 'hme-setia-01', 'alt' => 'PLTS atap pabrik PT Setia Kawan Makmur Sejahtera, Tulungagung',
        'slug' => 'pt-setia-kawan-makmur-sejahtera-tulungagung',
        'photos' => ['hme-setia-01', 'hme-setia-02', 'hme-setia-03', 'hme-setia-04', 'hme-setia-05', 'hme-setia-06', 'hme-setia-07', 'hme-setia-08', 'hme-setia-09'],
    ],
    [
        'title' => 'PT Pei Hai International Wiratama Indonesia', 'place' => 'Kec. Peterongan, Jombang, Jawa Timur',
        'cat' => 'ci', 'type' => 'industrial', 'year' => 2025, 'month' => 1, 'kwp' => 1515,
        'image' => 'hme-peihai-01', 'alt' => 'PLTS atap pabrik PT Pei Hai International Wiratama Indonesia, Jombang',
        'slug' => 'pt-pei-hai-international-wiratama-indonesia-jombang',
        'photos' => ['hme-peihai-01', 'hme-peihai-02', 'hme-peihai-03', 'hme-peihai-04', 'hme-peihai-05', 'hme-peihai-06', 'hme-peihai-07', 'hme-peihai-08', 'hme-peihai-09'],
    ],
    [
        'title' => 'PT Inkasa Jaya Aluminium', 'place' => 'Kec. Gempol, Pasuruan, Jawa Timur',
        'cat' => 'ci', 'type' => 'industrial', 'year' => 2025, 'month' => 8, 'kwp' => 1972,
        'image' => 'hme-inkasa-01', 'alt' => 'PLTS atap pabrik PT Inkasa Jaya Aluminium, Pasuruan',
        'slug' => 'pt-inkasa-jaya-aluminium-pasuruan',
        'photos' => ['hme-inkasa-01', 'hme-inkasa-02', 'hme-inkasa-03', 'hme-inkasa-04', 'hme-inkasa-05', 'hme-inkasa-06', 'hme-inkasa-07', 'hme-inkasa-08', 'hme-inkasa-09'],
    ],
];
