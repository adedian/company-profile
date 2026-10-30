<?php
/**
 * Solar PV Tour (home hero) - everything you may want to change lives here.
 *
 * SCENES   Real HME project photographs (see assets/images/wp). Each scene has its own slow "camera move".
 *          The captions of scenes 1, 3 and 5 are the three original slide messages of hexamultienergi.com.
 *          move: push | pan-right | pan-left | rise      pos_d / pos_m: object-position on desktop / mobile
 *
 * VIDEO    Optional cinematic background video. Put the files in assets/hero/ with the names below
 *          (paths are relative to /assets/). When a file exists it is loaded after the page has painted, and the
 *          photo scenes stay as poster/fallback (also used when autoplay is blocked, data-saver is on or the visitor
 *          prefers reduced motion). If no file exists the photo tour is used. See assets/hero/README.txt.
 */
return [
    // Home opening: 'simulation' (scroll-driven solar PV in a factory) or 'tour' (photo/video tour)
    'opening' => 'simulation',

    'eyebrow'   => 'CLEAN ENERGY. REAL IMPACT.',
    'headline'  => ['Powering the Future,', 'One Sunlit Surface at a Time.'],
    'sub'       => 'Solusi energi surya terintegrasi untuk industri, komersial, dan residensial yang lebih efisien dan berkelanjutan.',
    'cta_primary'   => ['label' => 'Explore Our Solar Solutions', 'path' => 'products/'],
    'cta_secondary' => ['label' => 'Discuss Your Project', 'path' => 'contact/'],
    'scroll_label'  => 'SCROLL TO EXPLORE',
    'scroll_target' => '#about',

    // Seconds each scene stays on screen (the progress bar and the camera move use the same duration)
    'interval' => 7.5,

    'video' => [
        'desktop' => 'hero/solar-pv-tour.mp4',          // 16:9, H.264, ~1080p, 12-20 s loop, no audio, < 6 MB
        'mobile'  => 'hero/solar-pv-tour-mobile.mp4',   // optional portrait/square crop, 720p, < 3 MB
        'webm'    => 'hero/solar-pv-tour.webm',         // optional smaller VP9 version of the desktop file
    ],

    'scenes' => [
        [
            'image' => 'whatsapp-image-2025-02-18-at-05-33-49-1-scaled',
            'alt'   => 'Pembangkit Listrik Tenaga Surya Pabrik Kertas',
            'label' => 'Wide aerial view',
            'title' => 'CLEAN ENERGY FOR A BETTER FUTURE',
            'text'  => 'Energi mandiri! Hemat biaya, ramah linkungan, energi masa depan untuk semua!',
            'move'  => 'push', 'origin' => '30% 40%', 'pos_d' => '50% 50%', 'pos_m' => '42% 50%',
        ],
        [
            'image' => 'hme-mitra-saruta',
            'alt'   => 'PLTS PT Mitra Saruta Indonesia, tampak udara',
            'label' => 'Across the rooftop arrays',
            'title' => '', 'text' => '',
            'move'  => 'pan-right', 'origin' => '50% 50%', 'pos_d' => '50% 45%', 'pos_m' => '58% 50%',
        ],
        [
            'image' => 'whatsapp-image-2026-03-06-at-10-54-12-am-1',
            'alt'   => 'Instalasi panel surya PT Hexa Multi Energi',
            'label' => 'Industrial site from above',
            'title' => 'GO SOLAR, SAVE MORE',
            'text'  => 'Solusi Surya yang Efisien dan Terjangkau. Kurangi tagihan energi Anda dan rangkul keberlanjutan hari ini!',
            'move'  => 'push', 'origin' => '35% 55%', 'pos_d' => '50% 50%', 'pos_m' => '30% 50%',
        ],
        [
            'image' => 'hme-pei-hai-2',
            'alt'   => 'PLTS PT Pei Hai International Wiratama Indonesia (Phase 2), barisan panel surya',
            'label' => 'Along the panel rows',
            'title' => '', 'text' => '',
            'move'  => 'rise', 'origin' => '50% 60%', 'pos_d' => '50% 55%', 'pos_m' => '55% 50%',
        ],
        [
            'image' => 'whatsapp-image-2025-09-09-at-14-05-26-1-scaled',
            'alt'   => 'Proyek instalasi oleh kontraktor PLTS PT Hexa Multi Energi',
            'label' => 'Top-down over the roof',
            'title' => 'POWERING TOMORROW, TODAY',
            'text'  => 'Solusi Energi Bersih untuk Masa Depan. Pilih energi surya kami untuk masa depan yang lebih hijau dan hemat biaya!',
            'move'  => 'pan-left', 'origin' => '60% 50%', 'pos_d' => '50% 50%', 'pos_m' => '50% 50%',
        ],
    ],
];
