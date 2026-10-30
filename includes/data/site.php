<?php
/**
 * Company facts, navigation and footer data.
 * All strings are taken verbatim from https://hexamultienergi.com/ (snapshot 2026-10-20).
 */
return [
    'name'      => 'PT Hexa Multi Energi',
    'full_name' => 'PT Hexa Multi Energi Surabaya',
    'tagline'   => 'We are a reliable and experienced solar company that offers affordable and sustainable energy solutions, customized to fit your unique needs.',

    'phone'          => '+62 31 743 7168',
    'phone_href'     => 'tel:+62317437168',
    'whatsapp'       => '+62 896 3773 7431',
    'whatsapp_href'  => 'https://wa.me/6289637737431',
    'email'          => 'info@hexamultienergi.com',
    'career_email'   => 'hrd@hexamultienergi.com',
    'address'        => 'Ruko North Junction Blok RA-25, Citraland, Jl. Taman Puspa Raya, Sambikerep, Kec. Sambikerep, Surabaya, Jawa Timur',
    'address_parts'  => [
        'street'   => 'Ruko North Junction Blok RA-25, Citraland, Jl. Taman Puspa Raya, Sambikerep',
        'locality' => 'Surabaya',
        'region'   => 'Jawa Timur',
        'country'  => 'ID',
    ],

    'social' => [
        ['label' => 'Facebook',  'href' => 'https://www.facebook.com/hexamultienergi'],
        ['label' => 'Instagram', 'href' => 'https://www.instagram.com/hexamultienergi'],
        ['label' => 'Linkedin',  'href' => 'https://www.linkedin.com/company/pt-hexa-multi-energi'],
    ],

    // Main navigation. "key" is matched against the current route for the active state.
    'nav' => [
        ['key' => 'home',            'label' => 'Home',            'path' => ''],
        ['key' => 'products',        'label' => 'Products',        'path' => 'products/', 'children' => [
            ['key' => 'p-residential', 'label' => 'Residential Solar', 'path' => 'products/#residential'],
            ['key' => 'p-commercial',  'label' => 'Commercial Solar',  'path' => 'products/#commercial'],
            ['key' => 'p-industrial',  'label' => 'Industrial Solar',  'path' => 'products/#industrial'],
            ['key' => 'p-system',      'label' => 'On-Grid, Off-Grid & Hybrid', 'path' => 'products/#sistem'],
            ['key' => 'p-scheme',      'label' => 'Layanan & skema pembelian', 'path' => 'products/#layanan'],
        ]],
        ['key' => 'contact',         'label' => 'Contact',         'path' => 'contact/'],
        ['key' => 'newsblog',        'label' => 'News & Blog',     'path' => 'newsblog/'],
        ['key' => 'company-profile', 'label' => 'Company Profile', 'path' => 'company-profile/', 'highlight' => true],
    ],

    // Footer columns (a list, so each column can be translated by position)
    'footer_links' => [
        ['title' => 'Links', 'links' => [
            ['label' => 'Home',       'path' => ''],
            ['label' => 'Products',   'path' => 'products/'],
            ['label' => 'Contact Us', 'path' => 'contact/'],
        ]],
        ['title' => 'Solutions', 'links' => [
            ['label' => 'Residential Solar', 'path' => 'products/#residential'],
            ['label' => 'Commercial Solar',  'path' => 'products/#commercial'],
            ['label' => 'Industrial Solar',  'path' => 'products/#industrial'],
            ['label' => 'On-Grid, Off-Grid, Hybrid', 'path' => 'products/#sistem'],
        ]],
        ['title' => 'Other', 'links' => [
            ['label' => 'News & Blogs', 'path' => 'newsblog/'],
            ['label' => 'Career',      'path' => 'career/'],
            ['label' => 'Company Profile', 'path' => 'company-profile/'],
        ]],
    ],

    'copyright' => 'Copyright © 2026 PT Hexa Multi Energi Surabaya. All Right Reserved',
];
