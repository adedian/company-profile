/* Static PDF of the company profile: one chapter per 16:9 page, nothing interactive.

   Opens index.html in headless Edge (or Chrome) in the paged slide layout, freezes the 3D scenes into images,
   spreads tabbed content over extra pages (panel tabs, monitoring, financing, portfolio), opens every accordion,
   drops sliders, buttons and hints, then prints.

       npm i --no-save playwright-core@1.48.2
       node build-pdf.js                 -> HME-Company-Profile.pdf
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'HME-Company-Profile.pdf');
const W = 1600, H = 900;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function browser() {
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel }); } catch (e) { /* try the next one */ }
  }
  throw new Error('Microsoft Edge or Google Chrome is required');
}

/* layout for print: no header, every chapter exactly one page, everything revealed, no motion, no controls */
const CSS = `
:root{--hh:0px!important}
html,body{scroll-snap-type:none!important}
*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent}
.hdr,.dots,.kbd,.pctl,.pprog,.foot,#hmeIntro,.intro{display:none!important}
html.paged main>section{height:calc(100vh / var(--z,1));min-height:0!important;overflow:hidden;break-after:page;break-inside:avoid}
html.rv [data-r]:not(.in){transform:none}

/* hints and controls that only make sense on screen */
.hero-cta,.pv-hint,.cam-hint,.org-hint,.mfoot,.cp-btn,.mi .chev,.stage-bar,.controls,.save-tar input,.mq-lbl span,
.mcur,.mcap,.ring,.scan,.svc-vis .badge{display:none!important}
.seg[role=tablist] button:not([aria-selected=true]),.mode-tabs .mt:not([aria-selected=true]){display:none!important}
.seg[role=tablist] button[aria-selected=true]{pointer-events:none}
button{cursor:default}

/* accordions open, every service step spelled out */
.mi .body{grid-template-rows:1fr!important}
.mi .body>div{overflow:visible}
.step .t>span{grid-template-rows:1fr!important}
.lyr .fb span{display:block!important}
.shot .cam{transform:none!important}
/* css filters make Chrome rasterize a whole layer into the PDF */
.hex img{filter:none!important}
.contact::before{background:linear-gradient(180deg,rgba(7,28,48,.82),rgba(7,28,48,.94)),var(--photo) center/cover!important}
.step .t>span>em{overflow:visible}

/* logo marquees become a static wall */
.mq{mask-image:none!important;-webkit-mask-image:none!important;overflow:visible}
.mq-track{width:auto!important;flex-wrap:wrap;justify-content:center;transform:none!important}
.mq-track [aria-hidden=true]{display:none!important}
.lg:has(img[aria-hidden=true]){display:none!important}

.frozen{display:block;width:100%;height:100%}
`;

(async () => {
  const srv = await serve();
  const b = await browser();
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  page.on('pageerror', e => console.warn('page error:', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: CSS });

  await page.evaluate(() => {
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    $$('[data-r]').forEach(el => el.classList.add('in'));
    $$('[data-count]').forEach(el => { const v = +el.dataset.count; el.textContent = el.dataset.fmt === 'raw' ? v : v.toLocaleString('id-ID'); });
    $$('.mi').forEach(m => { m.dataset.open = 'true'; const bt = $('button', m); if (bt) bt.setAttribute('aria-expanded', 'true'); });
    /* sentences that ask the reader to click, drag or hover */
    const cut = (sel, re) => $$(sel).forEach(el => { el.innerHTML = el.innerHTML.replace(re, '').trim(); });
    cut('#pvHow .fb span', /\s*Coba putuskan kabelnya:[^<]*/);
    cut('.chart-card .note', /Klik atau geser pada grafik untuk memindahkan waktu\.\s*/);
    cut('#sistem .lead', /^Pilih sistem[^.]*\.\s*Beban dan PV[^.]*\.\s*/);
    $$('a[href^="#"]').forEach(a => a.removeAttribute('href'));
    dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(600);

  /* bring a chapter on screen (its 3D scene only runs while visible) */
  const show = id => page.evaluate(id => { const s = document.getElementById(id); window.scrollTo(0, s.offsetTop); }, id);
  /* replace a live element by a picture of it */
  async function freeze(sel) {
    const el = page.locator(sel).first();
    const png = await el.screenshot({ type: 'jpeg', quality: 88, animations: 'disabled' });
    await el.evaluate((n, src) => { n.innerHTML = `<img class="frozen" alt="" src="${src}">`; }, 'data:image/jpeg;base64,' + png.toString('base64'));
  }
  /* copy a chapter in its current state, put the copy before the original, and freeze the copy's scene */
  async function snapshot(id, sceneSel) {
    await page.evaluate(id => {
      const s = document.getElementById(id), c = s.cloneNode(true);
      c.id = id + '-' + document.querySelectorAll(`[data-copy-of="${id}"]`).length; c.dataset.copyOf = id;
      c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      c.querySelectorAll('canvas').forEach(n => n.replaceWith(Object.assign(document.createElement('div'), { className: 'frozen' })));
      s.before(c);
    }, id);
    if (sceneSel) {
      const png = await page.locator(`#${id} ${sceneSel}`).screenshot({ type: 'jpeg', quality: 88 });
      await page.evaluate(([id, sel, src]) => {
        const c = [...document.querySelectorAll(`[data-copy-of="${id}"]`)].pop(), box = c.querySelector(sel.replace(/#(\w+)/g, '[data-scene="$1"]'));
        box.innerHTML = `<img class="frozen" alt="" src="${src}">`;
      }, [id, sceneSel, 'data:image/jpeg;base64,' + png.toString('base64')]);
    }
  }
  /* tabs that are not selected are hidden by the print css, so press them from inside the page */
  const click = sel => page.evaluate(sel => { const n = document.querySelector(sel); if (n) n.click(); }, sel);
  /* mark scene boxes so they can still be found in copies after ids are stripped */
  await page.evaluate(() => ['pv3d', 'stage3d'].forEach(id => { const n = document.getElementById(id); if (n) n.dataset.scene = id; }));

  /* --- how a panel works: one page per tab --- */
  await show('panel'); await page.waitForTimeout(2500);
  for (const tab of ['#pvTabHow', '#pvTabCell', '#pvTabLyr']) {
    await click(tab); await page.waitForTimeout(2600);
    await snapshot('panel', '#pv3d');
  }
  await page.evaluate(() => document.getElementById('panel').remove());

  /* --- systems simulator: fixed camera, On-Grid at noon --- */
  await show('sistem'); await page.waitForTimeout(800);
  await click('#camReset');
  if (await page.getAttribute('#camAuto', 'aria-pressed') === 'true') await click('#camAuto');
  await page.waitForTimeout(3000);
  await freeze('#stage3d');
  /* the component card describes the solar panels (picked only after the scene is frozen: picking moves the camera) */
  await click('#partCard [data-p="pv"]');
  await page.evaluate(() => { const p = document.querySelector('#partCard p'); p.textContent = p.textContent.replace(/\s*Atur besarnya lewat slider[^.]*\./, ''); });

  /* --- monitoring: Overview and PV --- */
  await show('monitoring');
  for (const tab of ['#mtOv', '#mtPv']) {
    await click(tab); await page.waitForTimeout(400);
    await page.evaluate(() => { const c = document.getElementById('cam'); if (c) c.style.transform = 'none'; document.querySelectorAll('#feat .fb').forEach(b => { b.classList.remove('tour'); b.setAttribute('aria-pressed', 'false'); }); });
    await snapshot('monitoring');
  }
  await page.evaluate(() => document.getElementById('monitoring').remove());

  /* --- financing: Full Purchase and Rental --- */
  await show('skema');
  for (const tab of ['#fBuy', '#fRent']) { await click(tab); await page.waitForTimeout(2200); await snapshot('skema'); }
  await page.evaluate(() => document.getElementById('skema').remove());

  /* --- portfolio: industrial and commercial --- */
  await show('portofolio');
  for (const tab of ['#pfInd', '#pfCom']) { await click(tab); await page.waitForTimeout(900); await snapshot('portofolio'); }
  await page.evaluate(() => {
    document.getElementById('portofolio').remove();
    /* picking a project resets the highlight on every hexagon in the document, copies included */
    document.querySelectorAll('[data-copy-of="portofolio"]').forEach(c => { const h = c.querySelector('.hc.on .hex'); if (h) h.setAttribute('aria-pressed', 'true'); });
  });

  /* the remaining live canvases (background effects) and form controls are no longer needed */
  await page.evaluate(() => {
    document.querySelectorAll('input,canvas').forEach(n => { n.style.display = 'none'; });
    document.querySelectorAll('.step').forEach(b => b.setAttribute('aria-selected', 'true'));
  });
  /* Chrome stores WebP pictures losslessly in a PDF; photos go in as JPEG instead (logos keep their transparency) */
  await page.evaluate(async () => {
    const jpg = {}, toJpg = async src => {
      if (!jpg[src]) {
        const pic = new Image(); pic.src = src; await pic.decode();
        const cv = Object.assign(document.createElement('canvas'), { width: pic.naturalWidth, height: pic.naturalHeight });
        cv.getContext('2d').drawImage(pic, 0, 0); jpg[src] = cv.toDataURL('image/jpeg', .85);
      }
      return jpg[src];
    };
    for (const im of document.querySelectorAll('img[src$=".webp"]')) {
      const src = im.getAttribute('src');
      if (/^(b-|c-|hme-logo)/.test(src.split('/').pop())) continue;
      im.removeAttribute('loading'); im.src = await toJpg(src);
    }
    document.querySelector('.contact').style.setProperty('--photo', `url(${await toJpg('img/aerial-white.webp')})`);
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(400);

  /* shrink every chapter that would spill past its page; present.js only ever shrinks, which leaves copies too small */
  const fitAll = () => page.evaluate(H => document.querySelectorAll('main>section').forEach(s => {
    let z = 1; s.style.setProperty('--z', 1);
    for (let i = 0; i < 6; i++) {
      s.style.height = 'auto';
      const h = s.getBoundingClientRect().height;
      s.style.height = '';
      if (h <= H + 1) break;
      z = Math.max(.5, z * H / h - .004); s.style.setProperty('--z', z.toFixed(3));
    }
  }), H);
  await fitAll(); await page.waitForTimeout(500); await fitAll();

  await page.emulateMedia({ media: 'screen' });
  await page.pdf({ path: OUT, width: W + 'px', height: H + 'px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await b.close(); srv.close();
  console.log(`${path.basename(OUT)}: ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB`);
})().catch(e => { console.error(e); process.exit(1); });
