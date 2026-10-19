/* Our Systems: 3D scene + energy simulator (On-Grid / Off-Grid / Hybrid) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* battery capacity is user-set (kWh). While 'Auto' is on it follows the PV array (2 kWh per kWp, never below the 200 kWh sample) so big systems stay sensible */
  const BAT = () => S.bat;
  const autoBat = () => Math.max(200, S.pv * 2);
  const RNG = { load: [5, 5000], pv: [10, 5000], bat: [10, 20000], tar: [800, 2500] };
  const niceStep = v => v < 100 ? 5 : v < 500 ? 10 : v < 1000 ? 50 : 100;
  const fromPos = (k, x) => { const [a, b] = RNG[k], v = a * Math.pow(b / a, x / 100), st = niceStep(v); return clamp(Math.round(v / st) * st, a, b); };
  const toPos = (k, v) => Math.round(100 * Math.log(v / RNG[k][0]) / Math.log(RNG[k][1] / RNG[k][0]));
  const S = { mode: 'ongrid', hour: 12, load: 30, pv: 100, bat: 200, batAuto: true, tar: 1445, cloudy: false, outage: false, playing: false, part: 'pv', view: 'sim', site: 'factory' };

  /* ---------- colour helpers ---------- */
  const h2r = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const r2h = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = h2r(a), B = h2r(b); return r2h(A.map((v, i) => lerp(v, B[i], t))); };
  function kf(frames, h) {
    for (let i = 0; i < frames.length - 1; i++) {
      const [h0, v0] = frames[i], [h1, v1] = frames[i + 1];
      if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0 || 1); return typeof v0 === 'number' ? lerp(v0, v1, t) : mix(v0, v1, t); }
    }
    return frames[frames.length - 1][1];
  }
  const SKY_TOP = [[0, '#050b18'], [4.8, '#050b18'], [6, '#2a3a68'], [7.6, '#3a7fd0'], [16, '#2f78cf'], [17.8, '#3b3f78'], [19.4, '#050b18'], [24, '#050b18']];
  const SKY_BOT = [[0, '#12233b'], [4.8, '#12233b'], [6, '#f2a46a'], [7.8, '#bfe4ff'], [15.8, '#c4e6ff'], [17.9, '#ff8f5c'], [19.4, '#12233b'], [24, '#12233b']];
  const DAY = [[0, 0], [4.8, 0], [6.2, .5], [8, 1], [16, 1], [17.8, .5], [19.4, 0], [24, 0]];

  /* ---------- simulation ---------- */
  /* load shape relative to the Beban slider (peak = 1).
     Pabrik: industri 3 shift, beban stabil 24 jam.
     Rumah: siang sepi (penghuni bekerja/sekolah), naik saat pulang kerja (AC, TV, lampu, masak), AC tetap menyala malam hari. */
  const LOAD_P = {
    factory: [[0, 1], [24, 1]],
    house: [[0, .5], [4.5, .45], [5.5, .55], [6.5, .6], [8, .35], [9, .25], [15.5, .25], [17, .45], [18, .8], [19, 1], [21.5, 1], [22.5, .8], [23.5, .6], [24, .5]]
  };
  function loadProfile(h) { return kf(LOAD_P[S.site] || LOAD_P.factory, h); }
  function pvAt(h, cloudy) {
    if (h <= 6 || h >= 18) return 0;
    let p = S.pv * .88 * Math.pow(Math.sin(Math.PI * (h - 6) / 12), 1.15);
    if (cloudy) p *= .38 * (1 + .28 * Math.sin(h * 2.7));
    return Math.max(0, p);
  }
  function stepSim(mode, h, L, cloudy, outage, soc, dt) {
    const PMAX = Math.max(60, L * 1.2, S.pv * .6), pv = pvAt(h, cloudy), load = L * loadProfile(h);
    const r = { h, pv, load, bat: 0, grid: 0, soc, served: true, curtail: 0 };
    const gridUp = mode === 'offgrid' ? false : !outage;
    if (mode === 'ongrid') {
      if (!gridUp) { r.served = false; r.curtail = pv; return r; }
      r.grid = load - pv; return r;
    }
    const minSoc = mode === 'offgrid' ? .1 : (gridUp ? .2 : .05);
    const net = pv - load;
    if (net >= 0) {
      const ch = Math.min(net, PMAX, (1 - soc) * BAT() / dt);
      r.bat = ch; const rest = net - ch;
      if (gridUp) r.grid = -rest; else r.curtail = rest;
    } else {
      const need = -net, avail = Math.max(0, (soc - minSoc) * BAT() / dt);
      const dis = Math.min(need, PMAX, avail), rest = need - dis;
      if (rest > .05) {
        if (gridUp) { r.bat = -dis; r.grid = rest; }
        else { r.served = false; r.curtail = pv; }
      } else r.bat = -dis;
    }
    return r;
  }
  const cache = {};
  function simulate(outage = S.outage) {
    const key = [S.mode, S.site, S.load, S.pv, S.bat, S.cloudy, outage && S.mode !== 'offgrid'].join('|');
    if (cache[key]) return cache[key];
    if (Object.keys(cache).length > 300) for (const k in cache) delete cache[k];
    const dt = .25, n = 96; let soc = .5, out = [];
    const days = S.mode === 'ongrid' ? 1 : 5;
    for (let d = 0; d < days; d++) {
      out = [];
      for (let i = 0; i <= n; i++) {
        const r = stepSim(S.mode, i * dt, S.load, S.cloudy, outage, soc, dt);
        out.push(r);
        if (i < n) soc = clamp(soc + r.bat * dt / BAT(), 0, 1);
      }
    }
    return (cache[key] = out);
  }
  const fmtT = h => { const t = Math.round(h * 4) / 4; const hh = Math.floor(t) % 24 + (t >= 24 ? 24 : 0); const mm = Math.round((t % 1) * 60); return String(t >= 24 ? 24 : Math.floor(t)).padStart(2, '0') + ':' + String(t >= 24 ? 0 : mm).padStart(2, '0'); };
  const f0 = v => Math.round(v).toLocaleString('id-ID');
  /* compact rupiah: Rp 12,3 jt / Rp 1,2 M */
  const rpc = v => { const a = Math.abs(v), d = (x, n) => x.toLocaleString('id-ID', { maximumFractionDigits: n }); return 'Rp ' + (a >= 1e9 ? d(v / 1e9, 2) + ' M' : a >= 1e6 ? d(v / 1e6, 1) + ' jt' : d(Math.round(v), 0)); };
  const f1 = v => (Math.round(v * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });


  /* ---------- parts info ---------- */
  const PARTS = {
    pv: { t: 'Panel surya (PV)', d: 'Mengubah sinar matahari menjadi arus DC. HME memakai modul fotovoltaik Tier-1 agar kinerja terbukti dan investasi aman untuk jangka panjang. Terpasang di atap pabrik dan carport. Atur besarnya lewat slider Kapasitas PV.' },
    inverter: { t: 'Inverter', d: 'Mengubah arus DC dari panel menjadi AC supaya bisa langsung dipakai di properti Anda. Pada sistem hybrid, inverter juga mengatur kapan baterai diisi dan kapan dipakai.' },
    battery: { t: 'Baterai', d: 'Menyimpan kelebihan energi surya dan menjadi cadangan saat PLN padam. Pada Off-Grid, baterai adalah sumber utama di malam hari.' },
    grid: { t: 'Jaringan PLN', d: 'Pada On-Grid, PLN menutup kekurangan saat panel tidak cukup. Pada Hybrid, PLN menjadi sumber ketiga setelah panel dan baterai. Off-Grid tidak terhubung ke PLN.' },
    meter: { t: 'kWh meter', d: 'Mencatat listrik yang diambil dari jaringan PLN dan, bila diizinkan, yang dikirim ke jaringan. Ketentuan ekspor mengikuti regulasi dan kebijakan PLN setempat.' },
    loads: { t: 'Beban listrik', d: 'Mesin produksi, pendingin, dan lampu. Atur besarnya lewat slider Beban.' },
    walkway: { t: 'Walkway atap', d: 'Jalur teknisi dari aluminium/galvanis berlubang (anti-selip) di antara deretan panel, lengkap dengan tangga akses. Teknisi bisa naik untuk inspeksi dan perawatan tanpa menginjak modul surya.' },
    pipe: { t: 'Pipa air cleaning', d: 'Pipa utama naik di samping walkway, dengan cabang dan nozzle di tepi bawah dan atas array. Debu di permukaan panel bisa dibilas rutin supaya produksi tetap optimal. Tekan lagi untuk melihat semprotan air.' },
    safety: { t: 'Safety line', d: 'Kabel pengaman (lifeline) bertiang kuning di sepanjang walkway. Teknisi mengaitkan harness ke kabel ini saat bekerja di ketinggian, sesuai prosedur K3 kerja di atap.' },
    carport: { t: 'Carport surya', d: 'Atap panel berbentuk V (cekung) yang ditopang tiang tunggal berbentuk T. Mobil karyawan teduh di bawahnya, sementara panel menambah produksi listrik untuk pabrik.' },
    monitor: { t: 'Online monitoring', d: 'Produksi, konsumsi, dan interaksi dengan jaringan terpantau real-time dari HP atau komputer. Lihat contoh dashboard di bagian Monitoring.' }
  };
  const MODES = {
    ongrid: { n: 'On-Grid', s: 'Grid-Tied Solar System', d: 'Sistem On-Grid terhubung dengan jaringan PLN dan memakai inverter untuk mengoptimalkan energi surya. Panel menghasilkan arus DC, lalu inverter mengubahnya menjadi AC agar langsung dipakai di properti Anda. Produk unggulan seperti Home Solution dan solar canopy membantu menekan biaya listrik sambil menjaga pasokan tetap andal.', parts: ['pv', 'inverter', 'meter', 'grid', 'loads', 'monitor'] },
    offgrid: { n: 'Off-Grid', s: 'Independent Solar Power System', d: 'Tidak terhubung ke jaringan PLN. Mengandalkan panel surya dan baterai yang terpasang, cocok untuk daerah tanpa jaringan PLN, kawasan pedesaan, atau lokasi dengan jaringan listrik yang tidak stabil.', parts: ['pv', 'inverter', 'battery', 'loads', 'monitor'] },
    hybrid: { n: 'Hybrid', s: 'Panel surya + baterai + jaringan PLN', d: 'Sistem paling efisien: gabungan tiga sumber, yaitu panel surya, baterai, dan jaringan PLN. Kelebihan energi surya disimpan, ketergantungan pada listrik konvensional berkurang, dan saat padam sistem tetap menyala dari baterai.', parts: ['pv', 'inverter', 'battery', 'meter', 'grid', 'loads', 'monitor'] }
  };


  /* ---------- state -> 3D scene ---------- */
  const COL = { pv: '#ffb703', ac: '#6fe3ff', imp: '#ff7a6b', exp: '#58f08c', chg: '#58f08c', dis: '#b9a7ff' };
  let canvas3d, hasGL = false;

  function update() {
    const sim = simulate(), idx = clamp(Math.round(S.hour * 4), 0, 96), r = sim[idx], m = S.mode;
    const day = kf(DAY, S.hour), isOut = S.outage && m !== 'offgrid';
    const top = kf(SKY_TOP, S.hour), bot = kf(SKY_BOT, S.hour);
    const served = r.served, hasBat = m !== 'ongrid', soc = r.soc, gridKW = r.grid;
    const invRun = m === 'ongrid' ? !isOut && r.pv > .5 : (r.pv > .5 || Math.abs(r.bat) > .5 || r.served);
    const acOut = served ? (r.load - Math.max(gridKW, 0)) + Math.max(-gridKW, 0) : 0;
    const gridLive = m !== 'offgrid' && !isOut;
    const pvOn = r.pv > .4 && !(m === 'ongrid' && isOut);
    const fl = (on, dir, kw, color) => ({ on, dir, kw, color });
    const flows = {
      pv: fl(pvOn, 1, r.pv, COL.pv),
      invmdp: fl(served && acOut > .4, 1, acOut, COL.ac),
      l1: fl(served && r.load > .4, 1, r.load * .6, COL.ac),
      l2: fl(served && r.load > .4, 1, r.load * .4, COL.ac),
      bat: fl(hasBat && Math.abs(r.bat) > .4, r.bat >= 0 ? 1 : -1, Math.abs(r.bat), r.bat >= 0 ? COL.chg : COL.dis),
      grid: fl(gridLive && Math.abs(gridKW) > .4, gridKW >= 0 ? 1 : -1, Math.abs(gridKW), gridKW >= 0 ? COL.imp : COL.exp)
    };
    const meterTxt = gridLive ? (gridKW > .05 ? '↓' + f1(gridKW) : gridKW < -.05 ? '↑' + f1(-gridKW) : '0.0') : '—';
    const lv = {
      pv: f0(r.pv) + ' kW',
      inverter: f1(Math.max(0, acOut)) + ' kW',
      battery: hasBat ? Math.round(soc * 100) + '%' : '',
      loads: f0(served ? r.load : 0) + ' kW',
      meter: meterTxt,
      grid: m === 'offgrid' ? 'terputus' : isOut ? 'PADAM' : gridKW > .4 ? '↓ ' + f0(gridKW) + ' kW' : gridKW < -.4 ? '↑ ' + f0(-gridKW) + ' kW' : 'siaga',
      monitor: 'online'
    };
    if (window.Scene3D && Scene3D.ok) Scene3D.set({
      hour: S.hour, day, cloudy: S.cloudy, mode: m, served, pv: r.pv, pvFrac: r.pv / (S.pv * .88), load: r.load, soc, hasBat, isOut,
      skyTop: top, skyBot: bot,
      invTxt: f1(Math.max(0, acOut)), invOk: !(isOut && m === 'ongrid'),
      led: [isOut && m === 'ongrid' ? 0 : (invRun ? 1 : 2), hasBat && Math.abs(r.bat) > .5 ? 1 : 0, isOut && m === 'ongrid' ? 1 : 0],
      meterTxt, meterCol: gridKW < -.05 ? '#58f08c' : gridKW > .05 ? '#ff9a8c' : '#6fe3ff',
      batLed: Math.round(soc * 6), batCol: soc < .25 ? '#ff7a6b' : soc < .5 ? '#ffb703' : '#58f08c',
      gridLive, flows, labelVals: lv, parts: MODES[m].parts
    });
    updateKpi(r, m, isOut);
    updateSavings(m);
    updateStory(r, m, isOut, day);
    updateChart(sim, r);
  }


  function updateKpi(r, m, isOut) {
    $('#kPv').textContent = f1(r.pv); $('#sPv').textContent = r.pv > .4 ? (S.cloudy ? 'Hujan, produksi turun' : 'Menghasilkan listrik') : 'Tidak ada sinar matahari';
    $('#bPv').style.width = clamp(r.pv / (S.pv * .88) * 100, 0, 100) + '%';
    $('#kLd').textContent = f1(r.served ? r.load : 0); $('#sLd').textContent = r.served ? 'Terlayani penuh' : 'Padam, tidak terlayani';
    $('#bLd').style.width = clamp((r.served ? r.load : 0) / Math.max(1, S.load) * 100, 0, 100) + '%';
    const hasBat = m !== 'ongrid';
    $('#kBt').textContent = hasBat ? Math.round(r.soc * 100) : '—'; $('#uBt').textContent = hasBat ? '%' : '';
    $('#sBt').textContent = !hasBat ? 'Sistem ini tidak memakai baterai' : r.bat > .4 ? 'Mengisi ' + f1(r.bat) + ' kW' : r.bat < -.4 ? 'Dipakai ' + f1(-r.bat) + ' kW' : 'Siaga';
    $('#bBt').style.width = hasBat ? r.soc * 100 + '%' : '0%';
    const live = m !== 'offgrid' && !isOut;
    $('#kGd').textContent = live ? f1(Math.abs(r.grid)) : '0.0';
    $('#sGd').textContent = m === 'offgrid' ? 'Tidak terhubung ke PLN' : isOut ? 'PLN padam' : r.grid > .4 ? 'Diambil dari PLN' : r.grid < -.4 ? 'Dikirim ke PLN' : 'Hampir tidak dipakai';
    $('#bGd').style.width = live ? clamp(Math.abs(r.grid) / Math.max(40, S.pv * .88, S.load) * 100, 0, 100) + '%' : '0%';
    $('#kGd').parentElement.parentElement.querySelector('.k i').style.setProperty('--c', r.grid < -.4 ? '#58f08c' : '#ff7a6b');
    $('#bGd').parentElement.parentElement.style.setProperty('--c', r.grid < -.4 ? '#58f08c' : '#ff7a6b');
  }

  /* savings: one normal day (no outage) at the chosen weather, PLN energy avoided x tariff. Exported energy is not credited. */
  function updateSavings(m) {
    const sim = simulate(false), dt = .25; let base = 0, imp = 0, served = 0;
    for (let i = 0; i < 96; i++) { const p = sim[i]; base += p.load * dt; imp += Math.max(p.grid, 0) * dt; if (p.served) served += p.load * dt; }
    const saved = m === 'offgrid' ? served : Math.max(0, base - imp), pct = base > 0 ? clamp(saved / base, 0, 1) : 0, T = S.tar;
    $('#svDay').textContent = rpc(saved * T); $('#svKwh').textContent = f0(saved) + ' kWh dari surya' + (m === 'ongrid' ? '' : ' & baterai');
    $('#svMonth').textContent = rpc(saved * T * 30); $('#svYear').textContent = rpc(saved * T * 360);
    $('#svPct').textContent = Math.round(pct * 100) + '%'; $('#svBar').style.width = pct * 100 + '%';
    const rest = 100 - Math.round(pct * 100);
    $('#svBarG').style.display = m === 'offgrid' ? 'none' : '';
    $('#svMix').textContent = f0(saved) + ' dari ' + f0(base) + ' kWh/hari · ' + (m === 'offgrid' ? (rest > 0 ? rest + '% tidak terlayani' : 'tanpa PLN') : rest + '% dari PLN');
    $('#svBill').textContent = m === 'offgrid' ? 'Tanpa tagihan PLN' : rpc(base * T * 30) + ' → ' + rpc((base - saved) * T * 30);
    $('#svSub').textContent = m === 'ongrid' ? 'On-Grid: panel menutup beban siang hari, malam tetap dari PLN.' : m === 'hybrid' ? 'Hybrid: kelebihan siang disimpan di baterai untuk dipakai malam.' : 'Off-Grid: seluruh kebutuhan dari panel dan baterai, tanpa PLN.';
  }

  function updateStory(r, m, isOut, day) {
    const pv = f0(r.pv), ld = f0(r.load), g = f0(Math.abs(r.grid)), b = f0(Math.abs(r.bat));
    const t = fmtT(S.hour), night = day < .2, w = S.cloudy && !night ? ' (hujan)' : '';
    let s = '', warn = false, st = 'Sistem normal';
    if (m === 'ongrid') {
      if (isOut) { s = `PLN padam. Inverter On-Grid berhenti otomatis demi keselamatan petugas (anti-islanding), jadi gedung ikut padam${r.pv > .5 ? ` walaupun panel sedang menghasilkan ${pv} kW` : ''}.`; warn = true; st = 'Gedung padam'; }
      else if (r.pv < .5) s = `Malam hari, panel belum menghasilkan listrik. Seluruh beban ${ld} kW diambil dari PLN.`;
      else if (r.grid > .5) s = `Panel menghasilkan ${pv} kW${w} dan melayani sebagian beban ${ld} kW. Kekurangan ${g} kW dipasok PLN.`;
      else if (r.grid < -.5) s = `Panel menghasilkan ${pv} kW${w}, lebih besar dari beban ${ld} kW. Kelebihan ${g} kW mengalir ke jaringan PLN, sesuai ketentuan ekspor yang berlaku.`;
      else s = `Produksi panel setara dengan beban ${ld} kW, PLN hampir tidak dipakai.`;
    } else if (m === 'offgrid') {
      if (!r.served) { s = `Baterai sudah mencapai batas bawah dan panel belum cukup, sehingga beban ${ld} kW tidak terlayani. Pada desain nyata, kapasitas baterai dan panel dihitung agar kondisi ini tidak terjadi.`; warn = true; st = 'Baterai habis'; }
      else if (r.pv < .5) s = `Tanpa PLN, baterai menyuplai beban ${ld} kW sendirian. Sisa daya ${Math.round(r.soc * 100)}%.`;
      else if (r.bat > .5) s = `Panel menghasilkan ${pv} kW${w}, melayani beban ${ld} kW dan mengisi baterai ${b} kW.${r.curtail > .5 ? ' Kelebihan lain dibatasi karena kapasitas pengisian.' : ''}`;
      else if (r.bat < -.5) s = `Panel menghasilkan ${pv} kW${w}, belum cukup untuk beban ${ld} kW. Baterai menambah ${b} kW.`;
      else s = `Panel dan beban seimbang di ${ld} kW, baterai siaga.`;
      if (S.outage) s += ' Off-Grid tidak bergantung pada PLN, jadi padam tidak berpengaruh.';
    } else {
      if (isOut) {
        if (!r.served) { s = `PLN padam dan baterai sudah habis, sehingga beban tidak terlayani.`; warn = true; st = 'Baterai habis'; }
        else s = `PLN padam. Sistem hybrid beralih otomatis ke panel dan baterai, beban ${ld} kW tetap menyala. Sisa baterai ${Math.round(r.soc * 100)}%.`;
        st = r.served ? 'Hybrid mode cadangan' : st; warn = !r.served;
      } else if (r.pv < .5 && r.bat < -.5) s = `Malam hari, baterai menyuplai beban ${ld} kW sehingga PLN tidak dipakai. Sisa baterai ${Math.round(r.soc * 100)}%.`;
      else if (r.grid > .5 && r.bat < -.5) s = `Baterai menyuplai ${b} kW, kekurangan ${g} kW dipasok PLN.`;
      else if (r.grid > .5) s = `${r.pv > .5 ? `Panel ${pv} kW${w} belum cukup dan baterai di batas cadangan` : 'Baterai di batas cadangan'}, sehingga ${g} kW diambil dari PLN.`;
      else if (r.bat > .5 && r.grid < -.5) s = `Panel ${pv} kW${w} melayani beban ${ld} kW, mengisi baterai ${b} kW, dan sisa ${g} kW dikirim ke PLN.`;
      else if (r.bat > .5) s = `Panel ${pv} kW${w} melayani beban ${ld} kW dan menyimpan kelebihan ${b} kW ke baterai.`;
      else if (r.grid < -.5) s = `Baterai penuh. Kelebihan ${g} kW dikirim ke PLN, sesuai ketentuan ekspor yang berlaku.`;
      else s = `Panel dan beban seimbang di ${ld} kW, baterai siaga.`;
    }
    $('#story').textContent = `${t}. ${s}`;
    $('#statusTxt').textContent = st; $('#statusChip').classList.toggle('warn', warn);
  }

  /* ---------- chart ---------- */
  const CH = { W: 1200, H: 220, L: 52, R: 52, T: 16, B: 30 };
  function updateChart(sim, r) {
    /* present mode shows the chart in a narrow dashboard column, so draw it on a smaller canvas to keep text readable */
    const compact = document.documentElement.classList.contains('paged');
    /* phones: a narrow, taller canvas that fits the screen width without sideways scrolling, labels every 6 hours */
    const narrow = !compact && $('#chart').parentElement.clientWidth < 560;
    const short = document.documentElement.classList.contains('short');
    CH.W = narrow ? 400 : compact ? 640 : 1200; CH.H = narrow ? 250 : short ? 190 : compact ? 250 : 220; CH.L = CH.R = narrow ? 34 : compact ? 40 : 52;
    $('#chart').setAttribute('viewBox', `0 0 ${CH.W} ${CH.H}`);
    const { W, H, L, R, T, B } = CH, iw = W - L - R, ih = H - T - B;
    let mx = 0; sim.forEach(p => { mx = Math.max(mx, p.pv, p.load, p.grid); }); const ticks = [10, 20, 25, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000], tick = ticks.find(v => v * 4 >= mx * 1.08) || 5000, ymax = Math.max(40, tick * 4);
    const X = h => L + h / 24 * iw, Y = v => T + (1 - v / ymax) * ih, YS = v => T + (1 - v) * ih;
    const area = (fn, base) => { let d = `M${X(0)} ${Y(0)}`; sim.forEach((p, i) => d += `L${X(i / 4).toFixed(1)} ${Y(fn(p)).toFixed(1)}`); return d + `L${X(24)} ${Y(0)}Z`; };
    const line = fn => sim.map((p, i) => (i ? 'L' : 'M') + X(i / 4).toFixed(1) + ' ' + Y(fn(p)).toFixed(1)).join('');
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = ymax * k / 4, y = Y(v); g += `<path d="M${L} ${y}H${W - R}" stroke="rgba(255,255,255,.12)"/><text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#a9c2d8" font-family="Figtree,system-ui,sans-serif">${Math.round(v)}</text>`; }
    g += `<text x="${L - 8}" y="${T - 4}" text-anchor="end" font-size="10" fill="#a9c2d8" font-family="Figtree,system-ui,sans-serif">kW</text>`;
    for (let h = 0; h <= 24; h += narrow ? 6 : 3) g += `<text x="${X(h)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#a9c2d8" font-family="Figtree,system-ui,sans-serif">${String(h).padStart(2, '0')}.00</text>`;
    const hasBat = S.mode !== 'ongrid';
    if (hasBat) { for (let k = 0; k <= 4; k++) g += `<text x="${W - R + 8}" y="${YS(k / 4) + 4}" font-size="11" fill="#58f08c" font-family="Figtree,system-ui,sans-serif">${k * 25}%</text>`; }
    g += `<path d="${area(p => p.pv)}" fill="#ffb703" opacity=".5"/><path d="${line(p => p.pv)}" stroke="#ffb703" stroke-width="2" fill="none"/>`;
    g += `<path d="${area(p => Math.max(p.grid, 0))}" fill="#ff7a6b" opacity=".4"/>`;
    g += `<path d="${line(p => p.served ? p.load : 0)}" stroke="#6fe3ff" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
    if (hasBat) g += `<path d="${sim.map((p, i) => (i ? 'L' : 'M') + X(i / 4).toFixed(1) + ' ' + YS(p.soc).toFixed(1)).join('')}" stroke="#58f08c" stroke-width="2.2" stroke-dasharray="6 4" fill="none"/>`;
    const cx = X(S.hour);
    g += `<path d="M${cx} ${T}V${H - B}" stroke="#fff" stroke-width="1.5"/>`;
    g += `<circle cx="${cx}" cy="${Y(r.pv)}" r="4.5" fill="#ffb703" stroke="#fff" stroke-width="1.5"/><circle cx="${cx}" cy="${Y(r.served ? r.load : 0)}" r="4.5" fill="#6fe3ff" stroke="#fff" stroke-width="1.5"/>`;
    if (hasBat) g += `<circle cx="${cx}" cy="${YS(r.soc)}" r="4.5" fill="#58f08c" stroke="#fff" stroke-width="1.5"/>`;
    const lx = cx > W - 110 ? cx - 56 : cx + 6;
    g += `<rect x="${lx - 4}" y="${T}" width="54" height="20" rx="10" fill="#fff"/><text x="${lx + 23}" y="${T + 14}" text-anchor="middle" font-size="12" font-weight="700" fill="#0a3055" font-family="Figtree,system-ui,sans-serif">${fmtT(S.hour)}</text>`;
    $('#chart').innerHTML = g; $('#lgBat').style.display = hasBat ? '' : 'none';
    // energy so far
    let eP = 0, eI = 0, eX = 0, eL = 0; const dt = .25;
    for (let i = 0; i <= Math.min(96, Math.round(S.hour * 4)); i++) { const p = sim[i]; eP += p.pv * dt; if (p.served) eL += p.load * dt; eI += Math.max(p.grid, 0) * dt; eX += Math.max(-p.grid, 0) * dt; }
    $('#eP').textContent = f0(eP) + ' kWh'; $('#eI').textContent = f0(eI) + ' kWh'; $('#eX').textContent = f0(eX) + ' kWh';
    $('#eS').textContent = eL > 1 ? Math.round(clamp((eL - eI) / eL, 0, 1) * 100) + '%' : '—';
  }

  /* ---------- cards ---------- */
  function renderCards() {
    const M = MODES[S.mode];
    $('#modeCard').innerHTML = `<div class="sub">Dari company profile</div><h3>${M.n} · ${M.s}</h3><p>${M.d}</p>`;
    renderPart();
    $$('[data-c]').forEach(e => e.classList.toggle('on', e.dataset.c === S.mode));
  }
  const EXTRA = ['walkway', 'pipe', 'safety', 'carport'];
  const partsFor = M => S.site === 'factory' ? M.parts.concat(EXTRA) : M.parts;
  function renderPart() {
    const M = MODES[S.mode], p0 = PARTS[S.part] || PARTS.pv;
    const p = S.part === 'loads' ? { t: p0.t, d: S.site === 'factory' ? 'Mesin produksi, pendingin, dan lampu pabrik yang beroperasi 3 shift, sehingga beban relatif stabil selama 24 jam. Atur besarnya lewat slider Beban.' : 'AC, TV, lampu, kulkas, dan peralatan dapur. Siang hari beban kecil karena penghuni bekerja atau sekolah, lalu melonjak sore sampai malam saat semua pulang. Atur puncaknya lewat slider Beban.' } : p0;
    const names = { walkway: 'Walkway', pipe: 'Pipa air', safety: 'Safety line', carport: 'Carport', pv: 'Panel surya', inverter: 'Inverter', battery: 'Baterai', grid: 'Jaringan PLN', meter: 'kWh meter', loads: 'Beban', monitor: 'Monitoring' };
    $('#partCard').innerHTML = `<div class="sub" style="color:var(--sun);font-weight:700;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase">Komponen</div><h4>${p.t}</h4><p>${p.d}</p><div class="pills" role="group" aria-label="Pilih komponen">${partsFor(M).map(k => `<button data-p="${k}" aria-pressed="${k === S.part}">${names[k]}</button>`).join('')}</div>`;
    $$('#partCard [data-p]').forEach(b => b.onclick = () => selectPart(b.dataset.p, true));
  }
  let tourOn = false, tourT = null, tourI = 0, userTouched = false;
  function stopTour() { tourOn = false; clearTimeout(tourT); const b = $('#camTour'); if (b) b.setAttribute('aria-pressed', false); }
  function stepTour() {
    if (!tourOn) return; const list = partsFor(MODES[S.mode]);
    if (tourI >= list.length) { stopTour(); if (hasGL) Scene3D.reset(); return; }
    selectPart(list[tourI++], true, true); tourT = setTimeout(stepTour, 3400);
  }
  function startTour() { if (!hasGL) return; tourOn = true; tourI = 0; $('#camTour').setAttribute('aria-pressed', true); stepTour(); }
  function selectPart(k, fly, fromTour) {
    if (!k) { return; }
    if (!fromTour) stopTour();
    S.part = k; renderPart();
    if (window.Scene3D && Scene3D.ok) { if (fly) Scene3D.focus(k); }
    $('#camHint') && ($('#camHint').hidden = true);
  }

  function setMode(m) {
    S.mode = m; if (!partsFor(MODES[m]).includes(S.part)) S.part = 'pv';
    $$('.mt').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
    const bs = $('#bSlide'); bs.disabled = m === 'ongrid'; $('#bAuto').disabled = m === 'ongrid'; $('#batCtl').classList.toggle('off', m === 'ongrid'); drawBat();
    const off = m === 'offgrid';
    const sw = $('#outSw'); sw.disabled = off; $('#outTxt').textContent = off ? 'Tidak terhubung PLN' : 'PLN padam';
    renderCards(); update();
    const stage = $('#stage3d'); if (stage) { stage.classList.remove('flip'); void stage.offsetWidth; stage.classList.add('flip'); }
  }
  function drawBat() {
    const bs = $('#bSlide'); bs.value = toPos('bat', S.bat); setRange(bs);
    $('#bOut').textContent = S.bat >= 1000 ? (S.bat / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MWh' : f0(S.bat) + ' kWh';
    $('#bAuto').setAttribute('aria-pressed', S.batAuto);
  }
  function setRange(el) { const p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p + '%'); }

  let lastW = 0;
  addEventListener('resize', () => { const w = innerWidth; if (w !== lastW) { lastW = w; if ($('#chart')) update(); } });

  /* ---------- init ---------- */
  function init() {
    canvas3d = $('#scene3d'); if (!canvas3d) return;
    hasGL = !!(window.Scene3D && Scene3D.init(canvas3d, $('#labels3d'), 'factory'));
    if (hasGL) Scene3D.onPick = id => { if (id) selectPart(id, false); };
    $$('.mt').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    const setSite = k => { S.site = k; if (!partsFor(MODES[S.mode]).includes(S.part)) S.part = 'pv'; renderPart(); $('#sFac').setAttribute('aria-pressed', k === 'factory'); $('#sHome').setAttribute('aria-pressed', k === 'house'); stopTour(); if (hasGL) Scene3D.setSite(k); update(); };
    $('#sFac').onclick = () => setSite('factory'); $('#sHome').onclick = () => setSite('house');
    $('#camReset').onclick = () => { userTouched = true; stopTour(); if (hasGL) Scene3D.reset(); };
    $('#camTour').onclick = () => { userTouched = true; if (tourOn) { stopTour(); if (hasGL) Scene3D.reset(); } else startTour(); };
    canvas3d.addEventListener('pointerdown', () => { userTouched = true; stopTour(); });
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); setTimeout(() => { if (!userTouched && hasGL) startTour(); }, 1600); } }, { threshold: .6 }).observe($('#stage3d'));
    const au = $('#camAuto'); au.onclick = () => { if (!hasGL) return; const v = !Scene3D.isAuto(); Scene3D.setAuto(v); au.setAttribute('aria-pressed', v); };
    const ts = $('#tSlide'), ls = $('#lSlide'), ps = $('#pSlide');
    ts.oninput = () => { S.hour = +ts.value; $('#tOut').textContent = fmtT(S.hour); setRange(ts); update(); };
    ls.oninput = () => { S.load = fromPos('load', +ls.value); $('#lOut').textContent = f0(S.load) + ' kW'; setRange(ls); update(); };
    const bs = $('#bSlide'), tar = $('#tarSlide');
    ps.oninput = () => { S.pv = fromPos('pv', +ps.value); $('#pOut').textContent = f0(S.pv) + ' kWp'; setRange(ps); if (S.batAuto) S.bat = clamp(autoBat(), RNG.bat[0], RNG.bat[1]); drawBat(); update(); };
    bs.oninput = () => { S.bat = fromPos('bat', +bs.value); S.batAuto = false; drawBat(); update(); };
    $('#bAuto').onclick = () => { S.batAuto = !S.batAuto; if (S.batAuto) S.bat = clamp(autoBat(), RNG.bat[0], RNG.bat[1]); drawBat(); update(); };
    tar.oninput = () => { S.tar = +tar.value; $('#tarOut').textContent = 'Rp ' + f0(S.tar) + ' / kWh'; setRange(tar); update(); };
    $('#wSun').onclick = () => { S.cloudy = false; $('#wSun').setAttribute('aria-pressed', true); $('#wCloud').setAttribute('aria-pressed', false); update(); };
    $('#wCloud').onclick = () => { S.cloudy = true; $('#wCloud').setAttribute('aria-pressed', true); $('#wSun').setAttribute('aria-pressed', false); update(); };
    $('#outSw').onclick = () => { S.outage = !S.outage; $('#outSw').setAttribute('aria-checked', S.outage); update(); };
    let timer = null;
    const playIc = $('#playIc');
    const setPlay = on => { S.playing = on; playIc.setAttribute('d', on ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'); $('#playBtn').setAttribute('aria-label', on ? 'Jeda simulasi' : 'Putar simulasi satu hari'); clearInterval(timer); if (on) timer = setInterval(() => { S.hour = S.hour >= 24 ? 0 : S.hour + .25; ts.value = S.hour; ts.oninput(); }, 130); };
    $('#playBtn').onclick = () => setPlay(!S.playing);
    const ch = $('#chart'); let drag = false;
    const fromEv = e => { const rc = ch.getBoundingClientRect(), x = (e.clientX - rc.left) / rc.width * CH.W; S.hour = clamp(Math.round((x - CH.L) / (CH.W - CH.L - CH.R) * 24 * 4) / 4, 0, 24); ts.value = S.hour; ts.oninput(); };
    ch.addEventListener('pointerdown', e => { drag = true; ch.setPointerCapture(e.pointerId); setPlay(false); fromEv(e); });
    ch.addEventListener('pointermove', e => { if (drag) fromEv(e); });
    ch.addEventListener('pointerup', () => drag = false);
    const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) { if (hasGL) Scene3D.start(); } else { if (hasGL) Scene3D.stop(); if (S.playing) setPlay(false); } }); }, { threshold: .05 });
    io.observe($('#sistem'));
    ls.value = toPos('load', S.load); ps.value = toPos('pv', S.pv); setRange(ts); setRange(ls); setRange(ps); setRange(tar); $('#tOut').textContent = fmtT(S.hour);
    setMode('ongrid');
    window.__hme = { S, setMode, update };
  }
  init();
})();