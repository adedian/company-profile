<?php
/**
 * Scroll-driven opening.
 *
 * MAIN MODE  - an own real-time 3D factory (WebGL2, no library, not the presentation's model): sun rises, the solar
 *              array is installed module by module, walkway / cleaning pipe / lifeline appear, DC cable to the inverters,
 *              transformer and grid pole, then the camera flies in through the entrance and along the walkway and
 *              production line to the inverter and distribution panel (LVMDP).
 * FALLBACK   - real HME photographs, one per chapter, used when WebGL is unavailable, on data-saver / slow devices.
 *
 * Captions: chapters 1, 3 and 6 carry the three original slide messages of hexamultienergi.com; chapter 2 the original
 * 'Installation' text; chapter 4 and 5 use wording from the presentation callouts (walkway, pipe, safety line, DC cable, inverter).
 * Photo and project data come from the official Company Profile.
 *
 * 't' = seconds on the 3D timeline where each chapter starts (the last value is where the opening ends).
 */
return [
    // Own 3D world (assets/js/hme-world-core.js + hme-world.js): draw(p) is a pure function of the scroll progress p (0..1).
    'engine' => ['js/hme-world-core.js', 'js/hme-world.js'],
    'logo'   => 'company-profile/presentation/img/hme-logo.webp',

    'frames' => [
        [
            'image' => 'whatsapp-image-2025-02-18-at-05-33-49-1-scaled',
            'alt'   => 'Pembangkit Listrik Tenaga Surya Pabrik Kertas, tampak udara',
            'kind'  => 'photo', 'pos_d' => '50% 50%', 'pos_m' => '42% 50%',
            'label' => 'Survei & desain atap',
            'title' => 'CLEAN ENERGY FOR A BETTER FUTURE',
            'text'  => 'Energi mandiri! Hemat biaya, ramah linkungan, energi masa depan untuk semua!',
        ],
        [
            'image' => 'hme-roof-panels',
            'alt'   => 'Deretan panel surya terpasang di atap pabrik',
            'kind'  => 'photo', 'pos_d' => '50% 60%', 'pos_m' => '30% 50%',
            'label' => 'Rail aluminium & panel surya',
            'title' => 'Installation',
            'text'  => 'Teknisi ahli kami akan memasang panel surya Anda dengan presisi dan teliti.',
        ],
        [
            'image' => 'whatsapp-image-2025-02-18-at-05-33-49-2',
            'alt'   => 'PLTS PT. Setia Kawan Makmur Sejahtera',
            'kind'  => 'photo', 'pos_d' => '50% 55%', 'pos_m' => '62% 50%',
            'label' => 'Walkway, pipa cleaning & safety line',
            'title' => 'GO SOLAR, SAVE MORE',
            'text'  => 'Solusi Surya yang Efisien dan Terjangkau. Kurangi tagihan energi Anda dan rangkul keberlanjutan hari ini!',
        ],
        [
            'image' => 'hme-factory-roof',
            'alt'   => 'Atap pabrik dengan panel surya terpasang, tampak udara miring',
            'kind'  => 'photo', 'pos_d' => '50% 50%', 'pos_m' => '58% 50%',
            'label' => 'Kabel DC & inverter',
            'title' => 'PLTS aktif, tersambung ke jaringan',
            'text'  => 'Kabel DC turun dari atap ke inverter, lalu PLTS aktif dan tersambung ke jaringan listrik.',
        ],
        [
            'image' => 'hme-dash-overview',
            'alt'   => 'Dashboard monitoring PLTS PT Setia Kawan Makmur Sejahtera, 1.586,5 kWp',
            'kind'  => 'card', 'pos_d' => '50% 50%', 'pos_m' => '50% 50%',
            'label' => 'Memasuki pabrik',
            'title' => 'Dari atap sampai ke lini produksi',
            'text'  => 'Listrik dari panel diubah inverter, dibagi lewat panel distribusi, lalu menyalakan mesin dan lampu pabrik.',
            'note'  => 'Contoh dashboard proyek: PT Setia Kawan Makmur Sejahtera, 1.586,5 kWp',
        ],
        [
            'image' => 'hme-mitra-saruta',
            'alt'   => 'PLTS atap pabrik PT Mitra Saruta Indonesia, tampak udara',
            'kind'  => 'photo', 'pos_d' => '50% 50%', 'pos_m' => '55% 50%',
            'label' => 'Monitoring',
            'title' => 'POWERING TOMORROW, TODAY',
            'text'  => 'Solusi Energi Bersih untuk Masa Depan. Pilih energi surya kami untuk masa depan yang lebih hijau dan hemat biaya!',
            'note'  => 'Monitoring: Kami akan memastikan sistem Anda berjalan secara efisien dan efektif untuk tahun-tahun mendatang',
        ],
    ],

    // Detail cards opened by pressing a 3D callout (same wording as the Company Profile presentation)
    'info' => [
        'pipe' => [
            'label' => 'Detail komponen',
            'title' => 'Pipa air cleaning',
            'text'  => 'Pipa utama naik di samping walkway, dengan cabang dan nozzle di tepi bawah dan atas array. Debu di permukaan panel bisa dibilas rutin supaya produksi tetap optimal.',
            'cta'   => 'Lihat semprotan air',
            'cta_off' => 'Hentikan semprotan',
        ],
    ],

    'source_3d'    => 'Ilustrasi 3D interaktif (bukan foto proyek)',
    'source_photo' => 'Foto dan data: proyek PT Hexa Multi Energi (Company Profile)',

    // Scroll length of the opening (viewport heights)
    'length_desktop' => 620,
    'length_mobile'  => 520,
];
