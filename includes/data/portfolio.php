<?php
/**
 * Project portfolio, copied from https://hexamultienergi.com/portfolio/ (snapshot 2026-11-09) and the six project pages it links to.
 *
 * cat   : ci (Commercial & Industrial) | res (Residential), the two filters of the original page
 * type  : commercial | industrial | residential (the "Type" field of each project page)
 * year / month : "Date" field of the project page (month null = only the year is given)
 * kwp   : "Capacity" field. The original prints "Kwh", but the Company Profile gives the same figures in kWp/MWp
 *         (44.2 kWp, 15.2 kWp, 1.59 MWp, 1.51 MWp, 1.9 MWp), so the unit is kWp. null = not published.
 * url   : the project page on the WordPress site (unchanged)
 * Text that differs per language (place, alt) is overridden in includes/translations/data/<lang>/portfolio.php, same order.
 */
return [
    [
        'title' => 'Hotel Azana Style', 'place' => 'Tulungagung Kota, Jawa Timur',
        'cat' => 'ci', 'type' => 'commercial', 'year' => 2025, 'month' => 3, 'kwp' => 44.25,
        'image' => 'hme-azana', 'alt' => 'PLTS atap Hotel Azana Style, Tulungagung',
        'url' => 'https://hexamultienergi.com/hotel-azana-style-tulungagung/',
    ],
    [
        'title' => 'PT Boncafe Sejahtera', 'place' => 'Gubeng, Surabaya, Jawa Timur',
        'cat' => 'ci', 'type' => 'commercial', 'year' => 2024, 'month' => null, 'kwp' => 15.21,
        'image' => 'hme-boncafe', 'alt' => 'PLTS atap PT Boncafe Sejahtera, Gubeng Surabaya',
        'url' => 'https://hexamultienergi.com/pt-boncafe-sejahtera-raya-gubeng-surabaya/',
    ],
    [
        'title' => 'Rumah Tinggal Surabaya', 'place' => 'Surabaya, Jawa Timur',
        'cat' => 'res', 'type' => 'residential', 'year' => null, 'month' => null, 'kwp' => null,
        'image' => 'rectangle-51', 'alt' => 'PLTS atap rumah tinggal di Surabaya',
        'url' => 'https://hexamultienergi.com/rumah-tinggal-surabaya/',
    ],
    [
        'title' => 'PT Setia Kawan Makmur Sejahtera', 'place' => 'Kec. Kedungwaru, Tulungagung, Jawa Timur',
        'cat' => 'ci', 'type' => 'industrial', 'year' => 2024, 'month' => 3, 'kwp' => 1586,
        'image' => 'whatsapp-image-2025-02-18-at-05-33-49', 'alt' => 'PLTS atap pabrik PT Setia Kawan Makmur Sejahtera, Tulungagung',
        'url' => 'https://hexamultienergi.com/pt-setia-kawan-makmur-sejahtera-tulungagung/',
    ],
    [
        'title' => 'PT Pei Hai International Wiratama Indonesia', 'place' => 'Kec. Peterongan, Jombang, Jawa Timur',
        'cat' => 'ci', 'type' => 'industrial', 'year' => 2025, 'month' => 1, 'kwp' => 1515,
        'image' => 'whatsapp-image-2026-03-06-at-10-54-12-am-1', 'alt' => 'PLTS atap pabrik PT Pei Hai International Wiratama Indonesia, Jombang',
        'url' => 'https://hexamultienergi.com/pt-pei-hai-international-wiratam%d0%b0-indonesiajombang/',
    ],
    [
        'title' => 'PT Inkasa Jaya Aluminium', 'place' => 'Kec. Gempol, Pasuruan, Jawa Timur',
        'cat' => 'ci', 'type' => 'industrial', 'year' => 2025, 'month' => 8, 'kwp' => 1972,
        'image' => 'whatsapp-image-2025-09-09-at-14-05-26-1-scaled', 'alt' => 'PLTS atap pabrik PT Inkasa Jaya Aluminium, Pasuruan',
        'url' => 'https://hexamultienergi.com/pt-inkasa-jaya-alumunium-pasuruan/',
    ],
];
