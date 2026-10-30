<?php
/**
 * Verified company facts used by the richer sections (highlights, project showcase, system explorer, services, clients, brands).
 *
 * SOURCE: the official interactive Company Profile 2026 (assets/company-profile/presentation/index.html + app.js) and the
 * live website. Nothing here is estimated or invented. Where the profile gives a company claim ("hingga 50%") it is shown
 * as the company's own statement, with the profile's own caveat that real results depend on the building.
 */
return [
    'highlights' => [
        ['value' => 2022, 'fmt' => 'raw', 'label' => 'Berdiri sejak November', 'note' => 'Berbasis di Citraland, Surabaya'],
        ['value' => 10, 'suffix' => '+ MWp', 'label' => 'Kapasitas PLTS terpasang', 'note' => 'Total proyek industri dalam portofolio kami: 10,26 MWp'],
        ['value' => 3, 'suffix' => ' sistem', 'label' => 'On-Grid, Off-Grid, Hybrid', 'note' => 'Dipilih sesuai kebutuhan bangunan'],
        ['value' => 50, 'prefix' => 'hingga ', 'suffix' => '%', 'label' => 'Hemat tagihan listrik per bulan', 'note' => 'Pernyataan Company Profile HME; hasil nyata bergantung profil beban'],
    ],

    'ticker' => ['Industrial Solar', 'Commercial Rooftop PV', 'Residential Solar', 'Engineering, Procurement & Construction', 'Installation & Maintenance', 'Monitoring', 'On-Grid · Off-Grid · Hybrid'],

    // Home: "Solar solution selector". Text comes from the existing site copy + the Company Profile (portfolio, schemes, services).
    'selector' => [
        'residential' => [
            'label' => 'Residential', 'title' => 'Residential Solar', 'image' => 'hme-res-1',
            'alt' => 'Instalasi PLTS residensial PT Hexa Multi Energi',
            'text' => 'Kurangi tagihan listrik Anda dengan memanfaatkan pembangkit listrik tenaga surya di Surabaya.',
            'points' => ['Hemat tagihan Listrik rumah', 'Pengurangan Biaya Listrik Jangka Panjang', 'Sumber Energi Terbarukan & Ramah Lingkungan', 'Meningkatkan Nilai Properti Anda'],
            'examples' => [],
            'cta' => ['Lihat Products', 'products/'],
        ],
        'commercial' => [
            'label' => 'Commercial', 'title' => 'Commercial Solar', 'image' => 'hme-boncafe',
            'alt' => 'Instalasi PLTS komersial PT Boncafe Sejahtera',
            'text' => 'Solusi PLTS untuk sektor komersial.',
            'points' => ['Layanan end-to-end: desain sistem, instalasi, monitoring performa, hingga O&M', 'Sistem disesuaikan dengan profil konsumsi listrik Anda', 'Beli putus atau rental (rent-to-own)'],
            'examples' => [['Hotel Azana Style', '44,2 kWp'], ['PT Boncafe Sejahtera', '15,2 kWp'], ['Zhang Palace', '15 kWp'], ['PT Indrayasa Migasa', '7 kWp']],
            'cta' => ['Diskusikan proyek komersial', 'contact/?topik=commercial'],
        ],
        'industrial' => [
            'label' => 'Industrial', 'title' => 'Industrial Solar', 'image' => 'hme-mitra-saruta',
            'alt' => 'Instalasi PLTS industri PT Mitra Saruta Indonesia',
            'text' => 'Solusi PLTS untuk sektor industri.',
            'points' => ['Layanan end-to-end: desain sistem, instalasi, monitoring performa, hingga O&M', 'Monitoring performa dari mana saja', 'Beli putus atau rental (rent-to-own)'],
            'examples' => [['PT Mitra Saruta Indonesia', '3 MWp'], ['PT Pei Hai International (Phase 2)', '2,26 MWp'], ['PT Inkasa Jaya Aluminium', '1,9 MWp'], ['PT Setia Kawan Makmur Sejahtera (Phase 1)', '1,59 MWp']],
            'cta' => ['Diskusikan proyek industri', 'contact/?topik=industrial'],
        ],
    ],

    // Company Profile -> "Our Portfolio" (names and capacities exactly as in app.js). cat: industri | komersial | residensial
    'portfolio' => [
        ['key' => 'mitra',   'name' => 'PT Mitra Saruta Indonesia', 'short' => 'Mitra Saruta', 'cat' => 'industri', 'v' => 3, 'unit' => 'MWp', 'cap' => '3 MWp', 'image' => 'hme-mitra-saruta'],
        ['key' => 'peihai2', 'name' => 'PT Pei Hai International Wiratama Indonesia (Phase 2)', 'short' => 'Pei Hai · Fase 2', 'cat' => 'industri', 'v' => 2.26, 'unit' => 'MWp', 'cap' => '2,26 MWp', 'image' => 'hme-pei-hai-2'],
        ['key' => 'inkasa',  'name' => 'PT Inkasa Jaya Aluminium', 'short' => 'Inkasa Jaya', 'cat' => 'industri', 'v' => 1.9, 'unit' => 'MWp', 'cap' => '1,9 MWp', 'image' => 'hme-inkasa'],
        ['key' => 'setia',   'name' => 'PT Setia Kawan Makmur Sejahtera (Phase 1)', 'short' => 'Setia Kawan · Fase 1', 'cat' => 'industri', 'v' => 1.59, 'unit' => 'MWp', 'cap' => '1,59 MWp', 'image' => 'hme-setia-kawan'],
        ['key' => 'peihai1', 'name' => 'PT Pei Hai International Wiratama Indonesia (Phase 1)', 'short' => 'Pei Hai · Fase 1', 'cat' => 'industri', 'v' => 1.51, 'unit' => 'MWp', 'cap' => '1,51 MWp', 'image' => 'hme-pei-hai-1'],
        ['key' => 'azana',   'name' => 'Hotel Azana Style', 'short' => 'Hotel Azana Style', 'cat' => 'komersial', 'v' => 44.2, 'unit' => 'kWp', 'cap' => '44,2 kWp', 'image' => 'hme-azana'],
        ['key' => 'boncafe', 'name' => 'PT Boncafe Sejahtera', 'short' => 'Boncafe Sejahtera', 'cat' => 'komersial', 'v' => 15.2, 'unit' => 'kWp', 'cap' => '15,2 kWp', 'image' => 'hme-boncafe'],
        ['key' => 'zhang',   'name' => 'Zhang Palace', 'short' => 'Zhang Palace', 'cat' => 'komersial', 'v' => 15, 'unit' => 'kWp', 'cap' => '15 kWp', 'image' => 'hme-zhang'],
        ['key' => 'indra',   'name' => 'PT Indrayasa Migasa', 'short' => 'Indrayasa Migasa', 'cat' => 'komersial', 'v' => 7, 'unit' => 'kWp', 'cap' => '7 kWp', 'image' => 'hme-indrayasa'],
        ['key' => 'res1',    'name' => 'Residensial 1', 'short' => 'Residensial', 'cat' => 'residensial', 'v' => null, 'unit' => '', 'cap' => 'Residensial', 'image' => 'hme-res-1'],
        ['key' => 'res2',    'name' => 'Residensial 2', 'short' => 'Residensial', 'cat' => 'residensial', 'v' => null, 'unit' => '', 'cap' => 'Residensial', 'image' => 'hme-res-2'],
        ['key' => 'res3',    'name' => 'Residensial 3', 'short' => 'Residensial', 'cat' => 'residensial', 'v' => null, 'unit' => '', 'cap' => 'Residensial', 'image' => 'hme-res-3'],
    ],

    // Company Profile -> "Our Systems" comparison table + component explanations (educational diagram, not an engineering simulator)
    'systems' => [
        'ongrid' => [
            'label' => 'On-Grid', 'tag' => 'Panel surya + PLN',
            'source' => 'Panel surya + PLN', 'battery' => 'Tidak ada', 'outage' => 'Inverter berhenti otomatis, gedung ikut padam',
            'fit' => 'Menekan tagihan listrik. Contoh produk: Home Solution dan solar canopy',
            'nodes' => ['panel', 'inverter', 'dist', 'load', 'grid', 'monitor'],
        ],
        'offgrid' => [
            'label' => 'Off-Grid', 'tag' => 'Panel surya + baterai',
            'source' => 'Panel surya + baterai', 'battery' => 'Ada, sumber utama malam hari', 'outage' => 'Tidak terpengaruh, tidak memakai PLN',
            'fit' => 'Daerah terpencil atau jaringan listrik tidak stabil',
            'nodes' => ['panel', 'inverter', 'battery', 'dist', 'load', 'monitor'],
        ],
        'hybrid' => [
            'label' => 'Hybrid', 'tag' => 'Panel surya + baterai + PLN',
            'source' => 'Panel surya + baterai + PLN', 'battery' => 'Ada, menyimpan kelebihan energi surya', 'outage' => 'Beralih ke baterai, beban tetap menyala',
            'fit' => 'Pasokan andal, kurang bergantung pada listrik konvensional',
            'nodes' => ['panel', 'inverter', 'battery', 'dist', 'load', 'grid', 'monitor'],
        ],
    ],
    'components' => [
        'panel'   => ['Panel surya', 'Mengubah cahaya matahari menjadi listrik arus searah (DC). Modul yang kami pakai berasal dari produsen Tier-1 global.'],
        'inverter' => ['Inverter', 'Mengubah listrik DC dari panel menjadi listrik AC yang dipakai peralatan dan mengatur kerja sistem bersama jaringan PLN atau baterai.'],
        'battery' => ['Baterai', 'Menyimpan energi surya untuk dipakai malam hari atau saat PLN padam (pada sistem Off-Grid dan Hybrid).'],
        'dist'    => ['Panel distribusi', 'Membagi listrik dari inverter ke beban gedung atau pabrik melalui panel distribusi tegangan rendah (LVMDP).'],
        'load'    => ['Beban', 'Peralatan, mesin, dan penerangan yang memakai listrik. Semakin besar pemakaian siang hari, semakin besar energi surya yang langsung terpakai.'],
        'grid'    => ['Jaringan PLN', 'Pada On-Grid dan Hybrid, listrik PLN mendampingi energi surya sehingga kebutuhan beban tetap tercukupi.'],
        'monitor' => ['Monitoring', 'Memantau produksi dan performa sistem dari mana saja, sehingga kinerja PLTS tetap terjaga.'],
    ],

    // Company Profile -> "Our Services" and "Financing & Rental Schemes"
    'services' => [
        ['code' => 'EPC', 'title' => 'Engineering, Procurement & Construction', 'text' => 'Paket menyeluruh: desain sistem, pengadaan material, dan konstruksi PLTS agar kualitas terjaga dan selesai tepat waktu.'],
        ['code' => 'I&M', 'title' => 'Installation & Maintenance', 'text' => 'Instalasi profesional, perawatan berkala, dan sistem monitoring supaya efisiensi dan kinerja PLTS tetap optimal.'],
        ['code' => 'CF',  'title' => 'Consultancy & Feasibility Studies', 'text' => 'Analisis kebutuhan energi, simulasi sistem, evaluasi teknis dan finansial, serta panduan regulasi.'],
    ],
    'schemes' => [
        ['title' => 'Full Purchase', 'lead' => 'Bayar sekali, milik Anda sejak hari pertama', 'text' => 'Pelanggan membayar satu kali untuk membeli sistem PLTS secara penuh. Anda langsung menikmati tagihan listrik yang lebih rendah dan berpotensi mendapat insentif pajak.',
            'pros' => ['Penghematan tagihan energi langsung terasa', 'Potensi balik modal (ROI) lebih cepat', 'Kontrol lebih besar atas upgrade dan perawatan'],
            'cons' => ['Belanja modal awal lebih tinggi', 'Tanggung jawab penuh atas operasi dan perawatan (O&M), meski HME menyediakan layanan O&M lengkap']],
        ['title' => 'Rental (Rent-to-Own)', 'lead' => 'Tanpa investasi awal, kepemilikan di akhir kontrak', 'text' => 'Tetapkan masa kontrak 15 sampai 25 tahun dan dapatkan diskon tetap dari tarif PLN, sehingga harga listrik lebih terjangkau.',
            'pros' => ['Zero investment', 'Risiko teknis lebih rendah karena operasi dan perawatan ditangani Developer/Investor', 'Opsi memiliki sistem di akhir kontrak'],
            'cons' => ['Dua tagihan listrik (PLN dan Developer)', 'Kontrak 15 sampai 25 tahun', 'Kepemilikan berpindah hanya jika syarat kontrak terpenuhi']],
    ],
    'benefits' => [
        ['Well Known Brand', 'Modul fotovoltaik Tier-1 dan produsen inverter tepercaya global, untuk kinerja terbukti, keamanan investasi, dan stabilitas operasional jangka panjang.'],
        ['Efficiency and Savings', 'Solusi kami membantu menurunkan tagihan listrik hingga 50% setiap bulan.'],
        ['Environmental Commitment', 'Memanfaatkan energi terbarukan untuk menekan emisi karbon dan berkontribusi pada masa depan yang lebih bersih dan hijau.'],
        ['Guaranteed Quality', 'Semua produk bersertifikat dengan garansi servis dan perawatan, menjamin kinerja yang awet.'],
    ],

    // Company Profile -> "Our Clients & Brand" (logo file keys in assets/images/wp)
    'clients' => [
        ['hme-c-ph', 'PT Pei Hai International Wiratama Indonesia'], ['hme-c-bravo', 'Bravo Supermarket Tuban'], ['hme-c-sk', 'SK'],
        ['hme-c-inkasa', 'PT Inkasa Jaya Aluminium'], ['hme-c-azana', 'Azana Tulungagung'], ['hme-c-boncafe', 'Boncafe Steak & Ice Cream'],
        ['hme-c-mitra', 'Mitra'], ['hme-c-sh', 'Sekolah Sinar Harapan'], ['hme-c-im', 'IM'], ['hme-c-zhang', 'Zhang Palace'],
    ],
    'brands' => [
        ['hme-b-huawei', 'Huawei'], ['hme-b-supreme', 'Supreme'], ['hme-b-kabelindo', 'Kabelindo'], ['hme-b-trina', 'Trina Solar'],
        ['hme-b-jinko', 'Jinko Solar'], ['hme-b-zte', 'ZTE'], ['hme-b-solarack', 'Solarack'], ['hme-b-sungrow', 'Sungrow'],
        ['hme-b-schneider', 'Schneider Electric'], ['hme-b-jasolar', 'JA Solar'], ['hme-b-jjlapp', 'JJ-Lapp'], ['hme-b-soeasy', 'Soeasy'],
    ],

    // Company Profile -> organisation chart (roles only; used on the career page)
    'teams' => ['Engineering', 'Project Management', 'Finance & Accounting', 'Procurement', 'Sales & Marketing', 'HR & General Affairs'],
];
