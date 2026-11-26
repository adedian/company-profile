/* Language switch (Bahasa Indonesia / English).
   The page is written in Indonesian. This file keeps an ID -> EN dictionary and swaps the text in place:
   static HTML, text that the other scripts generate later (a MutationObserver translates it as it appears),
   and a helper (HME_T) for text drawn on canvases.
   Originals are remembered per node, so switching back to Indonesian restores them exactly. */
(function () {
  'use strict';
  var KEY = 'hme-lang';
  var doc = document, root = doc.documentElement;

  /* ================= dictionary: exact strings ================= */
  var D = [
    /* header, nav, chrome */
    ['Navigasi bab', 'Chapter navigation'], ['Tentang', 'About'], ['Struktur', 'Structure'], ['Panel', 'Panels'], ['Sistem', 'Systems'],
    ['Layanan', 'Services'], ['Skema', 'Schemes'], ['Portofolio', 'Portfolio'], ['Kontak', 'Contact'],
    ['Download 1 file HTML, bisa dibuka offline', 'Download 1 HTML file, works offline'],
    ['Mulai presentasi layar penuh', 'Start fullscreen presentation'],
    ['Lompat ke bab', 'Jump to chapter'], ['Tekan', 'Press'], ['untuk pindah bab', 'to switch chapters'],
    ['Slide sebelumnya', 'Previous slide'], ['Slide berikutnya', 'Next slide'], ['Keluar dari presentasi (Esc)', 'Exit presentation (Esc)'],
    /* section titles (data-title) */
    ['Beranda', 'Home'], ['Visi & Misi', 'Vision & Mission'], ['Cara Kerja Panel', 'How Panels Work'], ['Perbandingan', 'Comparison'],
    ['Benefit', 'Benefits'], ['Klien', 'Clients'],

    /* hero */
    ['PT Hexa Multi Energi menghadirkan sistem Pembangkit Listrik Tenaga Surya (PLTS) untuk industri, komersial, dan residensial. Mulai dari desain, instalasi, monitoring, sampai perawatan.',
      'PT Hexa Multi Energi delivers solar power plant (PLTS) systems for industrial, commercial, and residential customers, from design, installation, and monitoring to maintenance.'],
    ['Lihat simulasi sistem', 'See the system simulation'], ['Hubungi kami', 'Contact us'],
    ['Berdiri sejak November', 'Established in November'], ['Hemat tagihan listrik, hingga', 'Electricity bill savings, up to'],
    ['Kapasitas PLTS terpasang', 'Installed PV capacity'], ['sistem', 'systems'],

    /* about */
    ['Energi surya untuk kemandirian energi di setiap lapisan', 'Solar energy for energy independence at every level'],
    ['Selamat datang di', 'Welcome to'],
    ['Kami berfokus pada solusi surya untuk kebutuhan industri dan komersial, dengan teknologi inovatif, sistem hemat biaya, dan dukungan tenaga ahli.',
      'We focus on solar solutions for industrial and commercial needs, with innovative technology, cost-effective systems, and expert support.'],
    ['PT Hexa Multi Energi adalah penyedia solusi energi terbarukan yang berdiri pada November 2022. Kami memanfaatkan energi surya untuk mendorong kemandirian energi di setiap lapisan masyarakat. Sejak awal, kami berfokus mengembangkan dan memasang sistem PLTS yang inovatif, ramah lingkungan, dan berkualitas tinggi.',
      'PT Hexa Multi Energi is a renewable energy solutions provider founded in November 2022. We harness solar energy to drive energy independence at every level of society. From the start, we have focused on developing and installing solar PV systems that are innovative, environmentally friendly, and of high quality.'],
    ['Kantor pusat kami berada di North Junction, Citraland, Surabaya, dan kami melayani kebutuhan energi bersih di berbagai sektor.',
      'Our head office is at North Junction, Citraland, Surabaya, and we serve clean energy needs across a range of sectors.'],
    ['Kami menawarkan solusi menyeluruh: instalasi, monitoring, dan perawatan PLTS untuk sektor industri, komersial, dan residensial. Teknologi terbaru seperti micro-inverter, sistem hybrid, dan smart monitoring kami hadirkan dengan efisiensi energi tinggi, penghematan listrik hingga 50%, dan dukungan tim profesional di setiap fase proyek.',
      'We offer end-to-end solutions: installation, monitoring, and maintenance of solar PV systems for the industrial, commercial, and residential sectors. We bring the latest technology, such as micro-inverters, hybrid systems, and smart monitoring, with high energy efficiency, electricity savings of up to 50%, and the support of a professional team in every phase of the project.'],
    ['Deretan panel surya di atap pabrik di tepi jalan tol, foto udara', 'Rows of solar panels on a factory roof beside a toll road, aerial photo'],
    ['Instalasi PLTS atap, salah satu proyek HME.', 'Rooftop PV installation, one of HME’s projects.'],
    ['Berdiri', 'Established'], ['Kantor pusat', 'Head office'], ['Sektor', 'Sectors'], ['Industri, komersial, residensial', 'Industrial, commercial, residential'], ['Teknologi', 'Technology'],

    /* vision & mission */
    ['Menjadi', 'To be'], ['penyedia solusi energi surya terdepan di Indonesia', 'the leading solar energy solutions provider in Indonesia'],
    ['penggerak transisi menuju energi bersih. Kami ingin memberdayakan industri, usaha komersial, dan masyarakat dengan solusi surya yang inovatif dan efisien untuk masa depan yang lebih cerdas, hijau, dan berkelanjutan.',
      'a driver of the transition to clean energy. We want to empower industry, commercial businesses, and communities with innovative and efficient solar solutions for a smarter, greener, and more sustainable future.'],
    ['Kami berdedikasi menghadirkan produk dan layanan profesional PLTS berkualitas tinggi yang disesuaikan dengan beragam kebutuhan energi klien.',
      'We are dedicated to delivering high-quality, professional solar PV products and services tailored to our clients’ diverse energy needs.'],
    ['Lewat teknologi mutakhir dan desain sistem yang cerdas, kami meningkatkan efisiensi energi dan menekan biaya operasional secara signifikan, sehingga manfaat ekonomi dan lingkungan berjalan bersamaan.',
      'Through cutting-edge technology and smart system design, we improve energy efficiency and significantly reduce operating costs, so economic and environmental benefits go hand in hand.'],
    ['Kami aktif mendorong penggunaan energi bersih dan mendukung inisiatif seperti program Net Zero Emissions 2060, ikut menurunkan emisi karbon dan membangun kerangka energi yang tangguh untuk jangka panjang.',
      'We actively promote the use of clean energy and support initiatives such as the Net Zero Emissions 2060 program, helping to cut carbon emissions and build a resilient energy framework for the long term.'],

    /* team */
    ['Struktur organisasi', 'Organization structure'],
    ['Tim kami menggabungkan keahlian engineering, manajemen proyek, keuangan, dan hubungan pelanggan. Setiap anggota membawa pengalaman dan komitmen untuk menghadirkan solusi PLTS terbaik bagi visi masa depan yang lebih bersih.',
      'Our team combines expertise in engineering, project management, finance, and customer relations. Every member brings experience and commitment to delivering the best solar PV solutions for a cleaner future.'],
    ['Klik nama kepala divisi untuk menyorot tim di bawahnya. Klik lagi untuk kembali.', 'Click a division head’s name to highlight their team. Click again to go back.'],

    /* how a solar panel works */
    ['Bagaimana panel surya menghasilkan listrik?', 'How do solar panels generate electricity?'],
    ['Tampilan panel', 'Panel view'], ['Cara kerja', 'How it works'], ['Di dalam sel', 'Inside the cell'], ['Isi lapisan', 'Layers'],
    ['Cahaya matahari', 'Sunlight'], ['Terik', 'Blazing'], ['Kabel tersambung', 'Cable connected'], ['Kabel diputus', 'Cable disconnected'],
    ['Malam', 'Night'], ['Mendung tebal', 'Heavy overcast'], ['Berawan', 'Cloudy'], ['Cerah', 'Sunny'],
    ['Model 3D modul surya: cahaya matahari (titik kuning) mengenai sel silikon, elektron (titik biru) mengalir lewat kabel ke lampu',
      '3D model of a solar module: sunlight (yellow dots) hits the silicon cells, and electrons (blue dots) flow through the cable to the lamp'],
    ['Seret untuk memutar · klik nama lapisan', 'Drag to rotate · click a layer name'],
    ['Cahaya', 'Light'], ['Daya panel', 'Panel power'], ['Lampu menyala', 'Lamp on'], ['Lampu padam', 'Lamp off'], ['0 W (sirkuit terbuka)', '0 W (open circuit)'],
    ['Empat hal yang dibutuhkan', 'Four things it needs'],
    ['Sel silikon dua lapis', 'Two-layer silicon cell'], ['Garis logam penjemput', 'Metal collector lines'], ['Rangkaian tertutup', 'Closed circuit'],
    ['Cahaya membawa paket energi kecil bernama foton (titik kuning). Yang dipakai terangnya, bukan panasnya, jadi saat mendung panel tetap bekerja, hanya hasilnya lebih kecil.',
      'Light carries small packets of energy called photons (yellow dots). What matters is brightness, not heat, so panels keep working on cloudy days, just with a lower output.'],
    ['Foton menyentak elektron di dalam silikon. Pertemuan lapisan atas (N) dan bawah (P) bekerja seperti lereng, sehingga elektron hanya bisa bergerak ke satu arah.',
      'Photons knock electrons loose inside the silicon. The junction between the top (N) and bottom (P) layers works like a slope, so electrons can only move in one direction.'],
    ['Garis perak tipis dan busbar di permukaan sel mengumpulkan elektron (titik biru). Sel-sel disambung berderet supaya tegangannya cukup besar.',
      'Thin silver lines and busbars on the cell surface collect the electrons (blue dots). The cells are connected in series so the voltage is high enough.'],
    ['Elektron butuh jalan keluar dan jalan pulang: kabel ke peralatan, lalu kembali ke panel. Coba putuskan kabelnya: lampu padam walau matahari terik.',
      'Electrons need a way out and a way back: a cable to the appliance, then back to the panel. Try disconnecting the cable: the lamp goes out even in blazing sun.'],
    ['Foton menabrak apa?', 'What does a photon hit?'], ['Menabrak atom silikon', 'Hits a silicon atom'],
    ['Sel surya tersusun dari jutaan atom silikon yang saling bergandengan (bola abu-abu). Foton menabrak elektron yang terikat di atom itu, dan energinya cukup untuk melepaskan elektron (titik biru). Di tempat elektron tadi tertinggal "lubang" kosong (cincin oranye).',
      'A solar cell is made of millions of silicon atoms bonded together (grey spheres). A photon hits an electron bound to one of those atoms, and its energy is enough to free the electron (blue dot). An empty “hole” (orange ring) is left where the electron was.'],
    ['Didorong medan di sambungan P-N', 'Pushed by the field at the P-N junction'],
    ['Batas antara lapisan N (biru) dan P (merah muda) menyimpan medan listrik, seperti lereng satu arah. Elektron didorong naik ke lapisan N, lubang turun ke lapisan P. Elektron dan lubang jadi terpisah, sehingga tidak saling bertemu lagi.',
      'The boundary between the N layer (blue) and the P layer (pink) holds an electric field, like a one-way slope. Electrons are pushed up into the N layer and holes down into the P layer. Electrons and holes end up separated, so they no longer meet.'],
    ['Dijemput garis perak, jadi arus', 'Collected by the silver lines, becoming current'],
    ['Elektron di lapisan N dikumpulkan garis perak, keluar lewat kabel, menyalakan peralatan, lalu pulang lewat kontak belakang untuk mengisi lubang. Aliran yang terus berputar inilah arus listrik.',
      'Electrons in the N layer are gathered by the silver lines, leave through the cable, power the appliance, then return through the back contact to fill the holes. This continuous flow is the electric current.'],
    ['Tidak semua foton jadi listrik: elektron yang lepas jauh dari sambungan bisa jatuh kembali ke lubang, dan energinya hanya menjadi panas (kilatan oranye). Karena itu panel komersial mengubah sekitar 20–23% cahaya menjadi listrik.',
      'Not every photon becomes electricity: electrons freed far from the junction can fall back into a hole, and their energy just becomes heat (orange flash). That is why commercial panels convert about 20–23% of light into electricity.'],
    ['Isi tiap lapisan, dari depan ke belakang', 'What each layer contains, from front to back'],
    ['Kaca tempered', 'Tempered glass'], ['Kaca rendah besi 3,2 mm', '3.2 mm low-iron glass'],
    ['Kaca yang dikeraskan dan dilapisi anti-pantul. Melindungi sel dari hujan, debu, dan hujan es, tetapi tetap meloloskan cahaya.',
      'Hardened glass with an anti-reflective coating. It protects the cells from rain, dust, and hail, while still letting light through.'],
    ['EVA atas', 'Top EVA'], ['Lem bening (ethylene vinyl acetate)', 'Clear adhesive (ethylene vinyl acetate)'],
    ['Lembaran plastik yang meleleh saat dipres panas, lalu membungkus sel dengan rapat: kedap air dan meredam getaran.',
      'A plastic sheet that melts under hot pressing and wraps the cells tightly: watertight and vibration-damping.'],
    ['Sel surya silikon', 'Silicon solar cell'], ['60 sel, tebal sekitar 0,18 mm', '60 cells, about 0.18 mm thick'],
    ['Irisan silikon dengan lapisan N di atas dan P di bawah. Garis perak (finger dan busbar) mengumpulkan listriknya, dan pita tembaga menyambung sel-sel menjadi satu deret.',
      'A slice of silicon with the N layer on top and the P layer below. Silver lines (fingers and busbars) collect the electricity, and copper ribbons join the cells into a string.'],
    ['EVA bawah', 'Bottom EVA'], ['Lem bening sisi belakang', 'Clear adhesive, rear side'],
    ['Bahan yang sama di belakang sel, sehingga sel terbungkus rapat dari dua sisi.', 'The same material behind the cells, so the cells are sealed tightly on both sides.'],
    ['Plastik putih berlapis', 'Laminated white plastic'],
    ['Lapisan PET dan fluoropolimer: penyekat listrik dan pelindung dari sinar UV serta kelembapan.', 'PET and fluoropolymer layers: an electrical insulator that also protects against UV light and moisture.'],
    ['Bingkai aluminium', 'Aluminium frame'],
    ['Membuat panel kaku, melindungi tepi kaca, dan menjadi tempat panel dibaut ke rangka atap.', 'Keeps the panel rigid, protects the glass edges, and is where the panel is bolted to the roof structure.'],
    ['Kotak di belakang panel', 'Box on the back of the panel'],
    ['Berisi dioda bypass, supaya bagian yang tertutup bayangan tidak mematikan seluruh panel, serta kabel + dan − dengan konektor MC4.',
      'Contains bypass diodes, so a shaded section does not shut down the whole panel, plus the + and − cables with MC4 connectors.'],
    ['Ilustrasi modul 60 sel, 350 Wp. Pada cahaya 1.000 W/m² (matahari terik) panel menghasilkan sekitar 350 W.',
      'Illustration of a 60-cell, 350 Wp module. At 1,000 W/m² (blazing sun) the panel produces about 350 W.'],
    /* 3D panel labels */
    ['Garis perak (finger)', 'Silver line (finger)'], ['Lapisan anti-pantul', 'Anti-reflective layer'], ['Lapisan N', 'N layer'],
    ['Sambungan P-N (medan listrik)', 'P-N junction (electric field)'], ['Lapisan P', 'P layer'], ['Kontak belakang', 'Back contact'], ['Atom silikon', 'Silicon atom'],

    /* systems: tabs + controls */
    ['Dari On-Grid sampai Hybrid, lihat energinya mengalir', 'From On-Grid to Hybrid, watch the energy flow'],
    ['Pilih sistem, geser jam, atur kapasitas PV dan beban, atau simulasikan PLN padam. Beban dan PV bisa diatur sampai 5.000 kW / kWp. Angka di bawah adalah ilustrasi (awalnya 100 kWp dengan baterai contoh 200 kWh, baterai ikut menyesuaikan kapasitas PV) untuk menjelaskan cara kerja, bukan hasil proyek tertentu.',
      'Pick a system, slide the clock, set the PV capacity and load, or simulate a PLN outage. Load and PV can be set up to 5,000 kW / kWp. The figures below are illustrative (initially 100 kWp with a sample 200 kWh battery; the battery follows the PV capacity) to explain how it works, not the results of a specific project.'],
    ['Jenis sistem', 'System type'], ['Panel surya + jaringan PLN', 'Solar panels + PLN grid'], ['Panel surya + baterai, tanpa PLN', 'Solar panels + battery, no PLN'],
    ['Panel surya + baterai + PLN', 'Solar panels + battery + PLN'], ['Jenis bangunan', 'Building type'], ['Pabrik', 'Factory'], ['Rumah', 'Home'],
    ['Putar otomatis', 'Auto-rotate'], ['Tur komponen', 'Component tour'], ['Reset kamera', 'Reset camera'],
    ['Sistem normal', 'System normal'], ['Gedung padam', 'Building blacked out'], ['Baterai habis', 'Battery depleted'], ['Hybrid mode cadangan', 'Hybrid backup mode'],
    ['Model 3D pabrik dengan panel surya, inverter, baterai, dan jaringan PLN. Geser untuk memutar, klik label komponen untuk mendekat.',
      '3D model of a factory with solar panels, inverter, battery, and PLN grid. Drag to rotate, click a component label to zoom in.'],
    ['Geser untuk memutar · klik komponen untuk mendekat', 'Drag to rotate · click a component to zoom in'],
    ['Waktu', 'Time'], ['Putar simulasi satu hari', 'Play one-day simulation'], ['Jeda simulasi', 'Pause simulation'],
    ['Beban', 'Load'], ['Kapasitas PV', 'PV capacity'], ['Kapasitas baterai', 'Battery capacity'], ['Ikuti kapasitas PV otomatis', 'Follow PV capacity automatically'],
    ['Cuaca', 'Weather'], ['Hujan', 'Rainy'], ['Gangguan', 'Fault'], ['PLN padam', 'PLN outage'], ['Tidak terhubung PLN', 'Not connected to PLN'],
    /* KPIs */
    ['Panel surya', 'Solar panels'], ['Baterai', 'Battery'], ['Jaringan PLN', 'PLN grid'],
    ['Hujan, produksi turun', 'Rainy, output reduced'], ['Menghasilkan listrik', 'Generating power'], ['Tidak ada sinar matahari', 'No sunlight'],
    ['Terlayani penuh', 'Fully served'], ['Padam, tidak terlayani', 'Outage, not served'], ['Sistem ini tidak memakai baterai', 'This system has no battery'],
    ['Batas bawah 5% tercapai', '5% lower limit reached'], ['Siaga', 'Standby'], ['siaga', 'standby'], ['Tidak terhubung ke PLN', 'Not connected to PLN'],
    ['Diambil dari PLN', 'Imported from PLN'], ['Dikirim ke PLN', 'Exported to PLN'], ['Hampir tidak dipakai', 'Almost unused'],
    ['terputus', 'disconnected'], ['PADAM', 'OUTAGE'], ['online', 'online'],
    /* savings */
    ['Simulasi penghematan', 'Savings simulation'], ['Dihitung dari satu hari simulasi di atas.', 'Calculated from the one-day simulation above.'],
    ['Tarif PLN', 'PLN tariff'], ['Hemat per hari', 'Savings per day'], ['Hemat per bulan', 'Savings per month'], ['Hemat per tahun', 'Savings per year'],
    ['30 hari × 12 bulan', '30 days × 12 months'], ['Listrik disuplai PV', 'Power supplied by PV'], ['Tanpa tagihan PLN', 'No PLN bill'],
    ['On-Grid: panel menutup beban siang hari, malam tetap dari PLN.', 'On-Grid: the panels cover the daytime load, nights still come from PLN.'],
    ['Hybrid: kelebihan siang disimpan di baterai untuk dipakai malam.', 'Hybrid: daytime surplus is stored in the battery for use at night.'],
    ['Off-Grid: seluruh kebutuhan dari panel dan baterai, tanpa PLN.', 'Off-Grid: all demand comes from the panels and battery, without PLN.'],
    ['Kelebihan energi yang dikirim ke PLN tidak dihitung. Angka nyata bergantung pada tarif, profil beban, dan studi kelayakan.',
      'Surplus energy exported to PLN is not counted. Actual figures depend on the tariff, load profile, and feasibility study.'],
    /* chart */
    ['Satu hari penuh, 00.00 sampai 24.00', 'A full day, 00.00 to 24.00'], ['Produksi surya', 'Solar production'], ['Baterai (%)', 'Battery (%)'],
    ['Grafik produksi, beban, impor PLN dan baterai dalam 24 jam', 'Chart of production, load, PLN import, and battery over 24 hours'],
    ['Energi surya s/d jam ini', 'Solar energy up to this hour'], ['Kebutuhan dari surya & baterai', 'Demand met by solar & battery'],
    ['Klik atau geser pada grafik untuk memindahkan waktu. Simulasi menghitung satu hari berulang dengan langkah 15 menit. Hasil proyek nyata bergantung pada kapasitas, profil beban, dan studi kelayakan.',
      'Click or drag on the chart to move the time. The simulation repeats a single day in 15-minute steps. Real project results depend on capacity, load profile, and feasibility study.'],
    /* parts info */
    ['Dari company profile', 'From the company profile'], ['Komponen', 'Components'], ['Pilih komponen', 'Choose a component'],
    ['Panel surya (PV)', 'Solar panels (PV)'],
    ['Mengubah sinar matahari menjadi arus DC. HME memakai modul fotovoltaik Tier-1 agar kinerja terbukti dan investasi aman untuk jangka panjang. Terpasang di atap pabrik dan carport. Atur besarnya lewat slider Kapasitas PV.',
      'Converts sunlight into DC current. HME uses Tier-1 photovoltaic modules for proven performance and a secure long-term investment. Installed on the factory roof and carport. Set the size with the PV Capacity slider.'],
    ['Mengubah arus DC dari panel menjadi AC supaya bisa langsung dipakai di properti Anda. Pada sistem hybrid, inverter juga mengatur kapan baterai diisi dan kapan dipakai.',
      'Converts the DC current from the panels into AC so it can be used directly on your property. In a hybrid system, the inverter also controls when the battery charges and when it discharges.'],
    ['Menyimpan kelebihan energi surya dan menjadi cadangan saat PLN padam. Pada Off-Grid, baterai adalah sumber utama di malam hari.',
      'Stores surplus solar energy and acts as backup during a PLN outage. In Off-Grid, the battery is the main source at night.'],
    ['Pada On-Grid, PLN menutup kekurangan saat panel tidak cukup. Pada Hybrid, PLN menjadi sumber ketiga setelah panel dan baterai. Off-Grid tidak terhubung ke PLN.',
      'In On-Grid, PLN makes up the shortfall when the panels are not enough. In Hybrid, PLN is the third source after the panels and battery. Off-Grid is not connected to PLN.'],
    ['Panel yang menggabungkan keluaran AC dari keempat inverter menjadi satu saluran ke LVMDP. Tiap inverter punya MCCB sendiri, dilengkapi proteksi surja (SPD) dan busbar, jadi satu inverter bisa dimatikan untuk perawatan tanpa menghentikan yang lain.',
      'A panel that combines the AC output of all four inverters into a single line to the LVMDP. Each inverter has its own MCCB, along with surge protection (SPD) and a busbar, so one inverter can be shut down for maintenance without stopping the others.'],
    ['Low Voltage Main Distribution Panel, panel distribusi utama 380/220 V pabrik. Listrik dari PLTS masuk ke sini dan dibagikan ke mesin produksi, pendingin, dan penerangan. Pada On-Grid dan Hybrid, suplai PLN dari kWh meter juga masuk ke panel ini, sehingga energi surya terpakai lebih dulu dan PLN menutup kekurangannya.',
      'Low Voltage Main Distribution Panel, the factory’s main 380/220 V distribution panel. Power from the PV system enters here and is distributed to production machinery, cooling, and lighting. In On-Grid and Hybrid, the PLN supply from the kWh meter also enters this panel, so solar energy is used first and PLN covers the shortfall.'],
    ['Mencatat listrik yang diambil dari jaringan PLN dan, bila diizinkan, yang dikirim ke jaringan. Ketentuan ekspor mengikuti regulasi dan kebijakan PLN setempat.',
      'Records the electricity drawn from the PLN grid and, where permitted, what is sent back to the grid. Export terms follow local PLN regulations and policy.'],
    ['Beban listrik', 'Electrical load'], ['Mesin produksi, pendingin, dan lampu. Atur besarnya lewat slider Beban.', 'Production machinery, cooling, and lighting. Set the size with the Load slider.'],
    ['Walkway atap', 'Roof walkway'],
    ['Jalur teknisi dari aluminium/galvanis berlubang (anti-selip) di antara deretan panel, lengkap dengan tangga akses. Teknisi bisa naik untuk inspeksi dan perawatan tanpa menginjak modul surya.',
      'A technician path of perforated (anti-slip) aluminium/galvanised steel between the rows of panels, complete with an access ladder. Technicians can go up for inspection and maintenance without stepping on the solar modules.'],
    ['Pipa air cleaning', 'Cleaning water pipe'],
    ['Pipa utama naik di samping walkway, dengan cabang dan nozzle di tepi bawah dan atas array. Debu di permukaan panel bisa dibilas rutin supaya produksi tetap optimal. Tekan lagi untuk melihat semprotan air.',
      'The main pipe runs up beside the walkway, with branches and nozzles along the lower and upper edges of the array. Dust on the panel surface can be rinsed regularly to keep production optimal. Press again to see the water spray.'],
    ['Kabel pengaman (lifeline) bertiang kuning di sepanjang walkway. Teknisi mengaitkan harness ke kabel ini saat bekerja di ketinggian, sesuai prosedur K3 kerja di atap.',
      'A safety cable (lifeline) on yellow posts along the walkway. Technicians clip their harness to this cable when working at height, in line with rooftop occupational safety (K3) procedures.'],
    ['Carport surya', 'Solar carport'],
    ['Atap panel berbentuk V (cekung) yang ditopang tiang tunggal berbentuk T. Mobil karyawan teduh di bawahnya, sementara panel menambah produksi listrik untuk pabrik.',
      'A V-shaped (concave) panel roof supported by a single T-shaped post. Employees’ cars stay shaded underneath, while the panels add electricity production for the factory.'],
    ['Produksi, konsumsi, dan interaksi dengan jaringan terpantau real-time dari HP atau komputer. Lihat contoh dashboard di bagian Monitoring.',
      'Production, consumption, and interaction with the grid are monitored in real time from a phone or computer. See the sample dashboard in the Monitoring section.'],
    ['Mesin produksi, pendingin, dan lampu pabrik yang beroperasi 3 shift, sehingga beban relatif stabil selama 24 jam. Atur besarnya lewat slider Beban.',
      'Production machinery, cooling, and factory lighting running in 3 shifts, so the load stays relatively steady over 24 hours. Set the size with the Load slider.'],
    ['AC, TV, lampu, kulkas, dan peralatan dapur. Siang hari beban kecil karena penghuni bekerja atau sekolah, lalu melonjak sore sampai malam saat semua pulang. Atur puncaknya lewat slider Beban.',
      'Air conditioning, TV, lights, refrigerator, and kitchen appliances. The load is small in the daytime because residents are at work or school, then jumps from the afternoon into the evening when everyone is home. Set the peak with the Load slider.'],
    ['Pipa air', 'Water pipe'],
    ['Sistem On-Grid terhubung dengan jaringan PLN dan memakai inverter untuk mengoptimalkan energi surya. Panel menghasilkan arus DC, lalu inverter mengubahnya menjadi AC agar langsung dipakai di properti Anda. Produk unggulan seperti Home Solution dan solar canopy membantu menekan biaya listrik sambil menjaga pasokan tetap andal.',
      'An On-Grid system is connected to the PLN grid and uses an inverter to make the most of solar energy. The panels produce DC current, and the inverter converts it to AC for direct use on your property. Flagship products such as Home Solution and solar canopy help cut electricity costs while keeping the supply reliable.'],
    ['Tidak terhubung ke jaringan PLN. Mengandalkan panel surya dan baterai yang terpasang, cocok untuk daerah tanpa jaringan PLN, kawasan pedesaan, atau lokasi dengan jaringan listrik yang tidak stabil.',
      'Not connected to the PLN grid. It relies on the installed solar panels and battery, suited to areas without a PLN grid, rural regions, or locations with an unstable power supply.'],
    ['Panel surya + baterai + jaringan PLN', 'Solar panels + battery + PLN grid'],
    ['Hybrid · Panel surya + baterai + jaringan PLN', 'Hybrid · Solar panels + battery + PLN grid'],
    ['Sistem paling efisien: gabungan tiga sumber, yaitu panel surya, baterai, dan jaringan PLN. Kelebihan energi surya disimpan, ketergantungan pada listrik konvensional berkurang, dan saat padam sistem tetap menyala dari baterai.',
      'The most efficient system: a combination of three sources, namely solar panels, battery, and the PLN grid. Surplus solar energy is stored, reliance on conventional electricity is reduced, and during an outage the system stays on from the battery.'],

    /* comparison */
    ['Our Systems · Perbandingan', 'Our Systems · Comparison'], ['Pilih sistem yang paling cocok', 'Choose the system that fits best'],
    ['Sumber listrik', 'Power source'], ['Panel surya + PLN', 'Solar panels + PLN'], ['Panel surya + baterai', 'Solar panels + battery'],
    ['Tidak ada', 'None'], ['Ada, sumber utama malam hari', 'Yes, the main source at night'], ['Ada, menyimpan kelebihan energi surya', 'Yes, stores surplus solar energy'],
    ['Saat PLN padam', 'During a PLN outage'], ['Inverter berhenti otomatis, gedung ikut padam', 'The inverter stops automatically, so the building loses power too'],
    ['Tidak terpengaruh, tidak memakai PLN', 'Unaffected, it does not use PLN'], ['Beralih ke baterai, beban tetap menyala', 'Switches to the battery, the load stays on'],
    ['Cocok untuk', 'Best for'], ['Menekan tagihan listrik. Contoh produk: Home Solution dan solar canopy', 'Cutting electricity bills. Example products: Home Solution and solar canopy'],
    ['Daerah terpencil atau jaringan listrik tidak stabil', 'Remote areas or an unstable power grid'],
    ['Pasokan andal, kurang bergantung pada listrik konvensional', 'Reliable supply, less dependent on conventional electricity'],

    /* monitoring */
    ['Semua terpantau, dari mana saja', 'Everything monitored, from anywhere'], ['Halaman dashboard', 'Dashboard pages'],
    ['Contoh dashboard proyek: PT Setia Kawan Makmur Sejahtera, 1.586,5 kWp', 'Sample project dashboard: PT Setia Kawan Makmur Sejahtera, 1,586.5 kWp'],
    ['Dashboard monitoring tab Overview', 'Monitoring dashboard, Overview tab'], ['Dashboard monitoring tab PV', 'Monitoring dashboard, PV tab'],
    ['Pantau produksi energi, konsumsi, dan interaksi dengan jaringan secara langsung.', 'Monitor energy production, consumption, and grid interaction live.'],
    ['Wawasan berbasis data untuk keputusan operasional yang lebih cerdas.', 'Data-driven insights for smarter operational decisions.'],
    ['Respons lebih cepat dan perawatan proaktif demi keandalan maksimal.', 'Faster response and proactive maintenance for maximum reliability.'],
    ['Pemantauan rinci performa tiap inverter.', 'Detailed performance monitoring of each inverter.'],
    ['Rasio kinerja langsung untuk panen energi yang optimal.', 'Live performance ratio for an optimal energy harvest.'],
    ['Analisis mendalam daya yang dihasilkan terhadap iradiasi matahari.', 'In-depth analysis of power generated against solar irradiation.'],
    ['Jeda tur otomatis', 'Pause auto tour'], ['Putar tur otomatis', 'Play auto tour'],
    ['Klik fitur untuk menyorot bagian dashboard yang relevan.', 'Click a feature to highlight the relevant part of the dashboard.'],

    /* services */
    ['Satu mitra untuk seluruh perjalanan proyek', 'One partner for the whole project journey'],
    ['Paket menyeluruh: desain sistem, pengadaan material, dan konstruksi PLTS agar kualitas terjaga dan selesai tepat waktu.',
      'A complete package: system design, material procurement, and PV construction to keep quality high and finish on time.'],
    ['Instalasi profesional, perawatan berkala, dan sistem monitoring supaya efisiensi dan kinerja PLTS tetap optimal.',
      'Professional installation, periodic maintenance, and a monitoring system to keep PV efficiency and performance optimal.'],
    ['Analisis kebutuhan energi, simulasi sistem, evaluasi teknis dan finansial, serta panduan regulasi.',
      'Energy needs analysis, system simulation, technical and financial evaluation, and regulatory guidance.'],
    ['Konsultasi & studi kelayakan', 'Consultation & feasibility study'],
    ['Analisis kebutuhan energi, simulasi sistem PLTS, evaluasi teknis dan finansial, serta panduan regulasi.',
      'Energy needs analysis, PV system simulation, technical and financial evaluation, and regulatory guidance.'],
    ['Desain sistem', 'System design'], ['Desain sistem PLTS yang disesuaikan dengan kebutuhan dan profil beban Anda.', 'A PV system design tailored to your needs and load profile.'],
    ['Pengadaan material', 'Material procurement'],
    ['Pengadaan modul fotovoltaik Tier-1 dan inverter dari produsen tepercaya global.', 'Procurement of Tier-1 photovoltaic modules and inverters from trusted global manufacturers.'],
    ['Konstruksi & instalasi', 'Construction & installation'], ['Instalasi profesional agar kualitas terjaga dan proyek selesai tepat waktu.', 'Professional installation to keep quality high and finish the project on time.'],
    ['Monitoring sistem', 'System monitoring'], ['Sistem monitoring memantau produksi, konsumsi, dan performa tiap perangkat.', 'The monitoring system tracks production, consumption, and the performance of each device.'],
    ['Perawatan berkala', 'Periodic maintenance'], ['Perawatan rutin menjaga efisiensi dan kinerja optimal PLTS sepanjang umur sistem.', 'Routine maintenance keeps the PV system efficient and performing optimally throughout its life.'],
    ['Survei atap', 'Roof survey'], ['Ruang panel LVMDP', 'LVMDP panel room'], ['Ukur jalur kabel', 'Measuring the cable route'], ['Cek breaker', 'Checking the breaker'],
    ['Ukur struktur', 'Measuring the structure'], ['Distribusi modul di atap', 'Distributing modules on the roof'], ['Pemasangan clamp', 'Installing clamps'], ['Penempatan modul', 'Placing modules'],
    ['PV LAYOUT · ATAP PABRIK', 'PV LAYOUT · FACTORY ROOF'], ['Rev. A · skala 1:200', 'Rev. A · scale 1:200'],

    /* financing */
    ['Beli putus atau sewa', 'Buy outright or rent'], ['Skema', 'Schemes'],
    ['Bayar sekali, milik Anda sejak hari pertama', 'Pay once, yours from day one'],
    ['Pelanggan membayar satu kali untuk membeli sistem PLTS secara penuh. Anda langsung menikmati tagihan listrik yang lebih rendah dan berpotensi mendapat insentif pajak.',
      'The customer pays once to buy the PV system outright. You immediately enjoy a lower electricity bill and may qualify for tax incentives.'],
    ['Keuntungan', 'Advantages'], ['Pertimbangan', 'Considerations'],
    ['Penghematan tagihan energi langsung terasa', 'Energy bill savings are felt immediately'], ['Potensi balik modal (ROI) lebih cepat', 'Potentially faster return on investment (ROI)'],
    ['Kontrol lebih besar atas upgrade dan perawatan', 'More control over upgrades and maintenance'], ['Belanja modal awal lebih tinggi', 'Higher upfront capital expenditure'],
    ['Tanggung jawab penuh atas operasi dan perawatan (O&M), meski HME menyediakan layanan O&M lengkap', 'Full responsibility for operation and maintenance (O&M), although HME provides complete O&M services'],
    ['Tanpa investasi awal, kepemilikan di akhir kontrak', 'No upfront investment, ownership at the end of the contract'],
    ['Tetapkan masa kontrak 15 sampai 25 tahun dan dapatkan diskon tetap dari tarif PLN, sehingga harga listrik lebih terjangkau.',
      'Set a contract term of 15 to 25 years and get a fixed discount off the PLN tariff, making electricity more affordable.'],
    ['Risiko teknis lebih rendah karena operasi dan perawatan ditangani Developer/Investor', 'Lower technical risk because operation and maintenance are handled by the Developer/Investor'],
    ['Opsi memiliki sistem di akhir kontrak', 'Option to own the system at the end of the contract'], ['Dua tagihan listrik (PLN dan Developer)', 'Two electricity bills (PLN and the Developer)'],
    ['Kontrak 15 sampai 25 tahun', '15 to 25-year contract'], ['Kepemilikan berpindah hanya jika syarat kontrak terpenuhi', 'Ownership transfers only if the contract terms are met'],
    /* financing charts */
    ['Penghematan', 'Savings'], ['Tagihan sewa', 'Rental bill'], ['Biaya O&M', 'O&M cost'], ['Tagihan PLN', 'PLN bill'],
    ['Selama kontrak', 'During the contract'], ['tahun 1–25', 'years 1–25'], ['Setelah kontrak selesai', 'After the contract ends'], ['tahun ke-26 dst.', 'year 26 onward'],
    ['Komposisi tagihan listrik', 'Electricity bill composition'], ['porsi tagihan tanpa surya', 'share of the bill without solar'],
    ['Arus kas kumulatif', 'Cumulative cash flow'], ['× tagihan tahun 1', '× year-1 bill'], ['Tagihan tanpa surya', 'Bill without solar'], ['Tahun', 'Year'],
    ['Awal (tahun 0)', 'Start (year 0)'], ['Investasi awal', 'Initial investment'],
    ['Grafik ilustrasi: porsi tagihan listrik dengan sewa PLTS, selama dan sesudah kontrak 25 tahun', 'Illustrative chart: share of the electricity bill with a rented PV system, during and after a 25-year contract'],
    ['Grafik ilustrasi: porsi tagihan listrik dan arus kas kumulatif pada pembelian PLTS', 'Illustrative chart: share of the electricity bill and cumulative cash flow when buying a PV system'],
    ['Ilustrasi: porsi dari tagihan listrik tanpa surya, contoh kontrak 25 tahun.', 'Illustration: shares of the electricity bill without solar, for a sample 25-year contract.'],
    ['Setelah kontrak selesai, porsi surya (hingga 50% tagihan) menjadi gratis; sisa tagihan PLN tetap ada.', 'After the contract ends, the solar share (up to 50% of the bill) becomes free; the remaining PLN bill stays.'],
    ['Ilustrasi: porsi surya hingga 50% tagihan, biaya O&M ± 2%, tarif PLN naik 3% per tahun, investasi awal ± 2,7× tagihan tahun pertama.',
      'Illustration: solar share up to 50% of the bill, O&M cost ± 2%, PLN tariff rising 3% per year, initial investment ± 2.7× the first-year bill.'],
    ['Angka aktual tergantung tarif, profil beban, dan studi kelayakan.', 'Actual figures depend on the tariff, load profile, and feasibility study.'],
    ['Data grafik (porsi dari tagihan tanpa surya)', 'Chart data (share of the bill without solar)'], ['Periode', 'Period'], ['Kumulatif', 'Cumulative'],
    ['Arus kas kumulatif (× tagihan tahun 1)', 'Cumulative cash flow (× year-1 bill)'],

    /* benefits */
    ['Apa yang Anda dapatkan', 'What you get'],
    ['Modul fotovoltaik Tier-1 dan produsen inverter tepercaya global, untuk kinerja terbukti, keamanan investasi, dan stabilitas operasional jangka panjang.',
      'Tier-1 photovoltaic modules and globally trusted inverter manufacturers, for proven performance, investment security, and long-term operational stability.'],
    ['Solusi kami membantu menurunkan tagihan listrik hingga 50% setiap bulan.', 'Our solutions help cut electricity bills by up to 50% every month.'],
    ['Memanfaatkan energi terbarukan untuk menekan emisi karbon dan berkontribusi pada masa depan yang lebih bersih dan hijau.',
      'Using renewable energy to reduce carbon emissions and contribute to a cleaner, greener future.'],
    ['Semua produk bersertifikat dengan garansi servis dan perawatan, menjamin kinerja yang awet.', 'All products are certified, with service and maintenance warranties that ensure lasting performance.'],

    /* portfolio */
    ['Proyek yang sudah menyala', 'Projects already switched on'], ['Kategori proyek', 'Project category'], ['Industri (MWp)', 'Industrial (MWp)'],
    ['Komersial & Residensial (kWp)', 'Commercial & Residential (kWp)'], ['Pilih proyek', 'Choose a project'],
    ['Pei Hai · Fase 1', 'Pei Hai · Phase 1'], ['Setia Kawan · Fase 1', 'Setia Kawan · Phase 1'], ['Pei Hai · Fase 2', 'Pei Hai · Phase 2'],
    ['PT Pei Hai International Wiratama Indonesia (Phase 1)', 'PT Pei Hai International Wiratama Indonesia (Phase 1)'],
    ['Industri', 'Industrial'], ['Komersial', 'Commercial'], ['Residensial', 'Residential'],
    ['Residensial 1', 'Residential 1'], ['Residensial 2', 'Residential 2'], ['Residensial 3', 'Residential 3'],
    ['Residensial 1, Residensial', 'Residential 1, Residential'], ['Residensial 2, Residensial', 'Residential 2, Residential'], ['Residensial 3, Residensial', 'Residential 3, Residential'],

    /* clients, contact, footer */
    ['Dipercaya klien, dibangun dari merek terpercaya', 'Trusted by clients, built on trusted brands'],
    ['Arahkan kursor untuk menjeda', 'Hover to pause'], ['Komponen dari produsen global', 'Components from global manufacturers'],
    ['Terima', 'Thank'], ['Kasih', 'You'], ['Mari bicarakan kebutuhan energi bangunan Anda.', 'Let’s talk about your building’s energy needs.'],
    ['Telepon / WhatsApp', 'Phone / WhatsApp'], ['Kantor', 'Office'], ['Salin', 'Copy'], ['Tersalin', 'Copied'], ['Buka', 'Open'], ['Alamat', 'Address'],

    /* opening animation (present mode) */
    ['Animasi pemasangan PLTS di pabrik, diakhiri logo PT Hexa Multi Energi', 'Animation of a PV installation at a factory, ending with the PT Hexa Multi Energi logo'],
    ['Pemasangan PLTS atap pabrik', 'Factory rooftop PV installation'], ['Lewati', 'Skip'],
    ['Pemasangan panel surya', 'Installing the solar panels'], ['Survei & desain atap', 'Roof survey & design'], ['Pemasangan rangka & rail', 'Installing frames & rails'],
    ['Pemasangan panel surya serentak', 'Installing all solar panels together'], ['Walkway, pipa cleaning & safety line', 'Walkway, cleaning pipe & safety line'],
    ['Kabel DC & inverter', 'DC cables & inverter'], ['Commissioning · PLTS menyala', 'Commissioning · PV system switched on'],
    ['Operator menerbangkan drone DJI Mini 4K', 'Operator flying a DJI Mini 4K drone'], ['Survei udara · drone POV', 'Aerial survey · drone POV'],
    ['Monitoring dari HP', 'Monitoring from a phone'], ['Operator HME · drone DJI Mini 4K', 'HME operator · DJI Mini 4K drone'],
    ['DJI Mini 4K naik ke atap', 'DJI Mini 4K flies up to the roof'], ['Survei & pengukuran atap', 'Roof survey & measurement'],
    ['Rail aluminium & klem', 'Aluminium rails & clamps'], ['Walkway aluminium anti-selip', 'Anti-slip aluminium walkway'],
    ['Pipa air untuk cleaning panel', 'Water pipe for panel cleaning'], ['Safety line (lifeline) keliling atap', 'Safety line (lifeline) around the roof'],
    ['PLTS aktif · tersambung ke jaringan', 'PV system live · connected to the grid'], ['Dipantau real-time dari HP', 'Monitored in real time from a phone'],

    /* canvas texts in the 3D scene */
    ['akumulasi harian', 'daily total'], ['dari panel surya', 'from solar panels'], ['terlayani', 'served'], ['PRODUKSI HARI INI', 'TODAY’S PRODUCTION'],
    ['DAYA SAAT INI', 'CURRENT POWER'], ['BEBAN PABRIK', 'FACTORY LOAD'], ['Produksi vs beban (24 jam)', 'Production vs load (24 h)'], ['Status perangkat', 'Device status'],
    ['PLTS Atap Pabrik', 'Factory Rooftop PV'], ['tidak ada', 'none'], ['terhubung', 'connected'], ['Suhu modul', 'Module temperature'], ['Iradiasi', 'Irradiation'],
    ['kW produksi surya', 'kW solar output'], ['Tanpa baterai', 'No battery'], ['PLN PADAM', 'PLN OUTAGE'], ['TERPUTUS DARI PLN', 'DISCONNECTED FROM PLN']
  ];

  /* ================= dictionary: patterns with {placeholders} ================= */
  var P = [
    /* story line of the simulator (one sentence at a time) */
    ['PLN padam.', 'PLN outage.'],
    ['Inverter On-Grid berhenti otomatis demi keselamatan petugas (anti-islanding), jadi gedung ikut padam.', 'The On-Grid inverter stops automatically for the safety of utility crews (anti-islanding), so the building loses power too.'],
    ['Inverter On-Grid berhenti otomatis demi keselamatan petugas (anti-islanding), jadi gedung ikut padam walaupun panel sedang menghasilkan {a} kW.',
      'The On-Grid inverter stops automatically for the safety of utility crews (anti-islanding), so the building loses power too, even though the panels are producing {a} kW.'],
    ['Malam hari, panel belum menghasilkan listrik.', 'It is night, so the panels are not producing electricity yet.'],
    ['Seluruh beban {a} kW diambil dari PLN.', 'The entire {a} kW load is drawn from PLN.'],
    ['Panel menghasilkan {a} kW{w} dan melayani sebagian beban {b} kW.', 'The panels produce {a} kW{w} and serve part of the {b} kW load.'],
    ['Kekurangan {a} kW dipasok PLN.', 'The {a} kW shortfall is supplied by PLN.'],
    ['Panel menghasilkan {a} kW{w}, lebih besar dari beban {b} kW.', 'The panels produce {a} kW{w}, more than the {b} kW load.'],
    ['Kelebihan {a} kW mengalir ke jaringan PLN, sesuai ketentuan ekspor yang berlaku.', 'The {a} kW surplus flows into the PLN grid, in line with the applicable export rules.'],
    ['Produksi panel setara dengan beban {a} kW, PLN hampir tidak dipakai.', 'Panel output matches the {a} kW load, so PLN is barely used.'],
    ['Baterai sudah mencapai batas bawah dan panel belum cukup, sehingga beban {a} kW tidak terlayani.', 'The battery has hit its lower limit and the panels are not enough, so the {a} kW load is not served.'],
    ['Pada desain nyata, kapasitas baterai dan panel dihitung agar kondisi ini tidak terjadi.', 'In a real design, the battery and panel capacity are sized so this does not happen.'],
    ['Tanpa PLN, baterai menyuplai beban {a} kW sendirian.', 'Without PLN, the battery supplies the {a} kW load on its own.'],
    ['Sisa daya {a}%.', 'Remaining charge {a}%.'],
    ['Panel menghasilkan {a} kW{w}, melayani beban {b} kW dan mengisi baterai {c} kW.', 'The panels produce {a} kW{w}, serve the {b} kW load, and charge the battery at {c} kW.'],
    ['Kelebihan lain dibatasi karena kapasitas pengisian.', 'The remaining surplus is curtailed because of the charging capacity limit.'],
    ['Panel menghasilkan {a} kW{w}, belum cukup untuk beban {b} kW.', 'The panels produce {a} kW{w}, not enough for the {b} kW load.'],
    ['Baterai menambah {a} kW.', 'The battery adds {a} kW.'],
    ['Panel dan beban seimbang di {a} kW, baterai siaga.', 'Panels and load are balanced at {a} kW, and the battery is on standby.'],
    ['Off-Grid tidak bergantung pada PLN, jadi padam tidak berpengaruh.', 'Off-Grid does not depend on PLN, so an outage has no effect.'],
    ['PLN padam dan baterai sudah habis, sehingga beban tidak terlayani.', 'PLN is out and the battery is depleted, so the load is not served.'],
    ['Sistem hybrid beralih otomatis ke panel dan baterai, beban {a} kW tetap menyala.', 'The hybrid system switches automatically to the panels and battery, and the {a} kW load stays on.'],
    ['Sisa baterai {a}%.', 'Battery remaining {a}%.'],
    ['Malam hari, baterai menyuplai beban {a} kW sehingga PLN tidak dipakai.', 'It is night: the battery supplies the {a} kW load, so PLN is not used.'],
    ['Baterai menyuplai {a} kW, kekurangan {b} kW dipasok PLN.', 'The battery supplies {a} kW, and the {b} kW shortfall is supplied by PLN.'],
    ['Panel {a} kW{w} belum cukup dan baterai di batas cadangan, sehingga {b} kW diambil dari PLN.', 'The {a} kW{w} panels are not enough and the battery is at its reserve limit, so {b} kW is drawn from PLN.'],
    ['Baterai di batas cadangan, sehingga {a} kW diambil dari PLN.', 'The battery is at its reserve limit, so {a} kW is drawn from PLN.'],
    ['Panel {a} kW{w} melayani beban {b} kW, mengisi baterai {c} kW, dan sisa {d} kW dikirim ke PLN.', 'The {a} kW{w} panels serve the {b} kW load, charge the battery at {c} kW, and send the remaining {d} kW to PLN.'],
    ['Panel {a} kW{w} melayani beban {b} kW dan menyimpan kelebihan {c} kW ke baterai.', 'The {a} kW{w} panels serve the {b} kW load and store the {c} kW surplus in the battery.'],
    ['Baterai penuh.', 'The battery is full.'],
    ['Kelebihan {a} kW dikirim ke PLN, sesuai ketentuan ekspor yang berlaku.', 'The {a} kW surplus is sent to PLN, in line with the applicable export rules.'],
    /* KPI / savings / chart readouts */
    ['Mengisi {a} kW', 'Charging {a} kW'], ['Dipakai {a} kW', 'Discharging {a} kW'],
    ['{a} kWh dari surya & baterai', '{a} kWh from solar & battery'], ['{a} kWh dari surya', '{a} kWh from solar'],
    ['{a} dari {b} kWh/hari · {c}% tidak terlayani', '{a} of {b} kWh/day · {c}% not served'],
    ['{a} dari {b} kWh/hari · tanpa PLN', '{a} of {b} kWh/day · without PLN'],
    ['{a} dari {b} kWh/hari · {c}% dari PLN', '{a} of {b} kWh/day · {c}% from PLN'],
    ['Cahaya {a}', 'Light {a}'],
    /* portfolio */
    ['Total proyek industri di atas: {a} MWp.', 'Total industrial projects above: {a} MWp.'],
    ['Total proyek komersial di atas: {a} kWp, ditambah instalasi residensial.', 'Total commercial projects above: {a} kWp, plus residential installations.'],
    ['Foto instalasi {a}', 'Installation photo: {a}'], ['Foto {a}: {b}', 'Photo {a}: {b}'],
    /* services visual */
    ['{a} modul × 550 Wp', '{a} modules × 550 Wp'], ['Animasi desain layout PLTS atap: {a} modul, {b} kWp', 'Animated rooftop PV layout design: {a} modules, {b} kWp'],
    /* financing charts */
    ['Investasi awal −{a}×', 'Initial investment −{a}×'], ['Balik modal ± tahun ke-{a}', 'Payback ± year {a}'], ['+{a}× di tahun ke-30', '+{a}× in year 30'], ['Tahun {a}', 'Year {a}'],
    /* opening animation */
    ['Semua panel terpasang serentak  {a} / {b}', 'All panels installed together  {a} / {b}']
  ];

  /* ================= engine ================= */
  var dict = new Map(), rev = new Map(), pats = [];
  D.forEach(function (p) { dict.set(p[0], p[1]); if (p[0] !== p[1] && !rev.has(p[1])) rev.set(p[1], p[0]); });
  function esc(s) { return s.replace(/[.*+?^$()|[\]\\]/g, '\\$&'); }
  P.forEach(function (p) {
    var names = [], re = '^' + esc(p[0]).replace(/\{(\w+)\}/g, function (_, n) { names.push(n); return n === 'w' ? '( \\(hujan\\))?' : '((?:(?!\\.\\s).)+?)'; }) + '$';    /* a value never runs across a sentence end */
    pats.push({ re: new RegExp(re), names: names, out: p[1] });
  });

  var NUM = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+/g;
  /* Indonesian number format (1.445,5) -> English (1,445.5); rupiah suffixes jt / M -> mn / bn */
  function loc(s) {
    if (!/\d/.test(s)) return s;
    return s.replace(NUM, function (m) { return m.replace(/[.,]/g, function (c) { return c === '.' ? ',' : '.'; }); })
      .replace(/(Rp\s[\d.,]+)\s(jt|M)(?![A-Za-z])/g, function (_, a, u) { return a + (u === 'jt' ? ' mn' : ' bn'); });
  }
  var cache = new Map();
  function lookup(t) {
    if (dict.has(t)) return dict.get(t);
    for (var i = 0; i < pats.length; i++) {
      var m = pats[i].re.exec(t); if (!m) continue;
      var vals = {}; pats[i].names.forEach(function (n, k) { vals[n] = m[k + 1]; });
      return pats[i].out.replace(/\{(\w+)\}/g, function (_, n) { return n === 'w' ? (vals.w ? ' (rainy)' : '') : tr(vals[n]); });
    }
    return null;
  }
  /* translate one trimmed string; returns the English text, or the input with only its numbers localised */
  function tr(t) {
    if (!t || !/[A-Za-z]/.test(t)) return loc(t);
    if (cache.has(t)) return cache.get(t);
    var out = lookup(t);
    if (out === null) {
      var time = /^(\d\d:\d\d\. )([\s\S]+)$/.exec(t);                    /* simulator story: "12:00. sentence sentence" */
      if (time) out = time[1] + tr(time[2]);
      else if (/\.\s/.test(t)) {                                          /* several sentences: translate each one */
        var hit = false, parts = t.split(/(?<=\.)\s+/).map(function (s) { var r = lookup(s); if (r !== null) hit = true; return r === null ? loc(s) : r; });
        out = hit ? parts.join(' ') : null;
      }
    }
    if (out === null) out = loc(t);
    if (cache.size > 3000) cache.clear();
    cache.set(t, out); return out;
  }
  /* text node / attribute value with its surrounding whitespace and leading punctuation kept */
  function trRaw(raw) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw), core = m[2]; if (!core) return raw;
    var r = tr(core);
    if (r === loc(core) && /^[.,;:]/.test(core)) {                      /* ". Sentence" right after an inline tag */
      var m2 = /^([.,;:]\s*)([\s\S]+)$/.exec(core); if (m2) { var r2 = tr(m2[2]); if (r2 !== loc(m2[2])) return m[1] + m2[1] + r2 + m[3]; }
    }
    return m[1] + r + m[3];
  }

  /* ================= applying / restoring ================= */
  var lang = 'id', ATTRS = ['aria-label', 'title', 'alt', 'data-title'];
  var tOrig = new WeakMap(), tDone = new WeakMap(), aOrig = new WeakMap(), hOrig = new WeakMap();
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1 };

  function isHeading(el) { return el.tagName === 'H2' && el.closest('main') && (el.querySelector('.w') || !el.children.length); }
  function setHeading(el, text) {
    var split = el.classList.contains('split2'), lbl = el.hasAttribute('aria-label');
    el.textContent = text; if (lbl) el.setAttribute('aria-label', text);
    if (split && window.__hmeSplit) window.__hmeSplit(el);
  }
  function applyText(n) {
    var v = n.nodeValue; if (tDone.get(n) === v) return;
    var t = trRaw(v); if (t === v) return;
    tOrig.set(n, v); tDone.set(n, t); n.nodeValue = t;
  }
  function applyAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a); if (v === null) continue;
      var rec = aOrig.get(el); if (rec && rec[a] && rec[a].done === v) continue;
      var t = trRaw(v); if (t === v) continue;
      if (!rec) { rec = {}; aOrig.set(el, rec); } rec[a] = { orig: v, done: t }; el.setAttribute(a, t);
    }
  }
  function apply(node) {
    if (node.nodeType === 3) { if (!node.parentNode || !SKIP[node.parentNode.nodeName]) applyText(node); return; }
    if (node.nodeType !== 1 || node.closest && node.closest('[data-i18n-skip]')) return;
    if (node.nodeName === 'CANVAS') { applyAttrs(node); return; }          /* nothing to translate inside, but its aria-label */
    if (SKIP[node.nodeName]) return;
    if (isHeading(node)) {
      var o = hOrig.get(node); if (o === undefined) { o = (node.getAttribute('aria-label') || node.textContent).trim(); hOrig.set(node, o); }
      var t = tr(o); if (t !== o && node.textContent.trim() !== t) setHeading(node, t); return;
    }
    applyAttrs(node);
    for (var c = node.firstChild; c; c = c.nextSibling) apply(c);
  }
  function restore(node) {
    if (node.nodeType === 3) { if (tOrig.has(node)) { node.nodeValue = tOrig.get(node); tOrig.delete(node); tDone.delete(node); } return; }
    if (node.nodeType !== 1) return;
    if (hOrig.has(node)) { var o = hOrig.get(node); if (node.textContent.trim() !== o) setHeading(node, o); return; }
    var rec = aOrig.get(node);
    if (rec) { for (var a in rec) if (node.getAttribute(a) === rec[a].done) node.setAttribute(a, rec[a].orig); aOrig.delete(node); }
    for (var c = node.firstChild; c; c = c.nextSibling) restore(c);
  }

  /* text that other scripts write while English is active gets translated as it appears */
  var mo = new MutationObserver(function (recs) {
    if (lang !== 'en') return;
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.type === 'characterData') apply(r.target);
      else if (r.type === 'attributes') applyAttrs(r.target);
      else for (var k = 0; k < r.addedNodes.length; k++) apply(r.addedNodes[k]);
    }
    mo.takeRecords();                                                    /* drop the records caused by our own writes */
  });
  function watch(on) {
    if (on) mo.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    else mo.disconnect();
  }

  /* ================= switcher UI ================= */
  var GLOBE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.6 2.8 4 6 4 9.5s-1.4 6.7-4 9.5c-2.6-2.8-4-6-4-9.5s1.4-6.7 4-9.5z"/></svg>';
  var CHEV = '<svg class="lang-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
  var LANGS = [['id', 'ID', 'Bahasa Indonesia'], ['en', 'EN', 'English']];
  var btn, menu, cur;
  function buildUI() {
    var host = doc.querySelector('.hdr-act'); if (!host) return;
    var box = doc.createElement('div'); box.className = 'lang'; box.setAttribute('data-i18n-skip', '');
    box.innerHTML = '<button type="button" class="lang-btn" id="langBtn" aria-haspopup="true" aria-expanded="false" aria-controls="langMenu" aria-label="Language / Bahasa" title="Language / Bahasa">' + GLOBE + '<span class="lang-cur"></span>' + CHEV + '</button>' +
      '<div class="lang-menu" id="langMenu" role="menu" hidden>' + LANGS.map(function (l) {
        return '<button type="button" role="menuitemradio" data-lang="' + l[0] + '" aria-checked="false"><span class="lang-code">' + l[1] + '</span><span class="lang-name" lang="' + l[0] + '">' + l[2] + '</span><span class="lang-ok">' + CHECK + '</span></button>';
      }).join('') + '</div>';
    host.appendChild(box);
    btn = box.querySelector('#langBtn'); menu = box.querySelector('#langMenu'); cur = box.querySelector('.lang-cur');
    var open = function (on) { menu.hidden = !on; btn.setAttribute('aria-expanded', on); };
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(menu.hidden); });
    menu.addEventListener('click', function (e) { var b = e.target.closest('[data-lang]'); if (!b) return; set(b.dataset.lang); open(false); btn.focus(); });
    doc.addEventListener('click', function (e) { if (!menu.hidden && !box.contains(e.target)) open(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { open(false); btn.focus(); } });
    syncUI();
  }
  function syncUI() {
    if (!btn) return;
    cur.textContent = lang.toUpperCase();
    [].forEach.call(menu.querySelectorAll('[data-lang]'), function (b) { b.setAttribute('aria-checked', b.dataset.lang === lang); });
  }

  /* ================= public api ================= */
  var listeners = [];
  function set(l, init) {
    if (l !== 'id' && l !== 'en') l = 'id';
    if (l === lang && !init) return;
    lang = l; root.lang = l; api.lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { /* private mode: the choice just is not remembered */ }
    if (l === 'en') { apply(doc.body); watch(true); } else { watch(false); restore(doc.body); }
    mo.takeRecords();
    syncUI();
    listeners.forEach(function (f) { try { f(l); } catch (e) { /* a listener must not break the switch */ } });
    doc.dispatchEvent(new CustomEvent('hme-lang', { detail: l }));
  }
  /* what the text of an element was before translation (for scripts that read text back and write it again) */
  function orig(el) {
    var s = ''; (function w(n) { if (n.nodeType === 3) s += tOrig.has(n) ? tOrig.get(n) : n.nodeValue; else for (var c = n.firstChild; c; c = c.nextSibling) w(c); })(el); return s;
  }
  var api = window.HME_I18N = { lang: 'id', tr: function (s) { return lang === 'en' ? trRaw(s) : s; }, set: set, orig: orig, onChange: function (f) { listeners.push(f); } };
  window.HME_T = api.tr;

  /* ================= start ================= */
  var start = 'id';
  try { var q = /[?&]lang=(id|en)\b/.exec(location.search); start = q ? q[1] : (localStorage.getItem(KEY) || 'id'); } catch (e) { /* ignore */ }
  buildUI();
  if (start === 'en') set('en', true);
})();
