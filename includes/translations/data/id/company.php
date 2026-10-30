<?php
/**
 * Indonesian text for includes/data/company.php. Wording follows KBBI/PUEBI; company, client, brand and project names,
 * units (kWp, MWp, kVA) and the system names On-Grid / Off-Grid / Hybrid are kept.
 */
return [
    'highlights' => [
        3 => ['note' => 'Pernyataan Profil Perusahaan HME; hasil nyata bergantung pada profil beban'],
    ],

    'ticker' => ['PLTS Industri', 'PLTS Atap Komersial', 'PLTS Residensial', 'Rekayasa, Pengadaan, dan Konstruksi (EPC)', 'Instalasi dan Pemeliharaan', 'Pemantauan', 'On-Grid · Off-Grid · Hybrid'],

    'selector' => [
        'residential' => [
            'label' => 'Residensial', 'title' => 'PLTS Residensial',
            'points' => ['Hemat tagihan listrik rumah', 'Biaya listrik lebih rendah dalam jangka panjang', 'Sumber energi terbarukan dan ramah lingkungan', 'Meningkatkan nilai properti Anda'],
            'cta' => ['Lihat Produk'],
        ],
        'commercial' => [
            'label' => 'Komersial', 'title' => 'PLTS Komersial',
            'points' => ['Layanan menyeluruh: desain sistem, instalasi, pemantauan kinerja, hingga operasi dan pemeliharaan (O&M)', 'Sistem disesuaikan dengan profil konsumsi listrik Anda', 'Beli putus atau sewa beli'],
            'cta' => ['Diskusikan Proyek Komersial'],
        ],
        'industrial' => [
            'label' => 'Industri', 'title' => 'PLTS Industri',
            'points' => ['Layanan menyeluruh: desain sistem, instalasi, pemantauan kinerja, hingga operasi dan pemeliharaan (O&M)', 'Pemantauan kinerja dari mana saja', 'Beli putus atau sewa beli'],
            'examples' => [['PT Mitra Saruta Indonesia', '3 MWp'], ['PT Pei Hai International (Fase 2)', '2,26 MWp'], ['PT Inkasa Jaya Aluminium', '1,9 MWp'], ['PT Setia Kawan Makmur Sejahtera (Fase 1)', '1,59 MWp']],
            'cta' => ['Diskusikan Proyek Industri'],
        ],
    ],

    'portfolio' => [
        1 => ['name' => 'PT Pei Hai International Wiratama Indonesia (Fase 2)'],
        3 => ['name' => 'PT Setia Kawan Makmur Sejahtera (Fase 1)'],
        4 => ['name' => 'PT Pei Hai International Wiratama Indonesia (Fase 1)'],
    ],

    'systems' => [
        'ongrid' => ['fit' => 'Menekan tagihan listrik. Contoh produk: Home Solution dan kanopi surya'],
    ],

    'components' => [
        'monitor' => ['Pemantauan', 'Memantau produksi listrik dan kondisi sistem dari mana saja, sehingga kinerja PLTS tetap terjaga.'],
    ],

    'services' => [
        ['code' => 'EPC', 'title' => 'Rekayasa, Pengadaan, dan Konstruksi (EPC)'],
        ['code' => 'IP', 'title' => 'Instalasi dan Pemeliharaan', 'text' => 'Instalasi profesional, perawatan berkala, dan sistem pemantauan supaya efisiensi dan kinerja PLTS tetap optimal.'],
        ['code' => 'KS', 'title' => 'Konsultasi dan Studi Kelayakan'],
    ],

    'schemes' => [
        [
            'title' => 'Beli Putus',
            'pros' => ['Penghematan tagihan energi langsung terasa', 'Potensi pengembalian modal (ROI) lebih cepat', 'Kendali lebih besar atas peningkatan sistem dan perawatan'],
        ],
        [
            'title' => 'Sewa Beli',
            'pros' => ['Tanpa investasi awal', 'Risiko teknis lebih rendah karena operasi dan perawatan ditangani pengembang atau investor', 'Opsi memiliki sistem di akhir kontrak'],
            'cons' => ['Dua tagihan listrik (PLN dan pengembang)', 'Kontrak 15 sampai 25 tahun', 'Kepemilikan berpindah hanya jika syarat kontrak terpenuhi'],
        ],
    ],

    'benefits' => [
        ['Merek Ternama'],
        ['Efisiensi dan Penghematan'],
        ['Komitmen terhadap Lingkungan'],
        ['Kualitas Terjamin'],
    ],

    'teams' => ['Teknik', 'Manajemen Proyek', 'Keuangan dan Akuntansi', 'Pengadaan', 'Penjualan dan Pemasaran', 'SDM dan Urusan Umum'],
];
