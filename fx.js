/* Extra motion + interaction layer (hero particles, split text, tilt cards, magnetic buttons, glow, marquee velocity) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- split text: hero h1 + section h2 ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = t; frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  }
  if (!reduce) {
    const h1 = $('.hero h1'); if (h1) { h1.setAttribute('aria-label', h1.textContent); splitWords(h1); h1.classList.add('split'); }
    $$('main h2').forEach(h => { if (h.closest('.hero') || !h.closest('[data-r]')) return; h.setAttribute('aria-label', h.textContent); splitWords(h); h.classList.add('split2'); });
  }

  /* ---------- hero energy particles ---------- */
  const hero = $('#top');
  if (hero && !reduce) {
    const cv = document.createElement('canvas'); cv.className = 'hero-fx'; cv.setAttribute('aria-hidden', 'true'); hero.appendChild(cv);
    const ctx = cv.getContext('2d'); let W = 0, H = 0, DPR = 1, on = false, last = 0, mouse = null, P = [], sparks = [];
    const hexPath = (x, y, r) => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); };
    function size() {
      const r = hero.getBoundingClientRect(); W = r.width; H = r.height; DPR = Math.min(2, devicePixelRatio || 1);
      cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const n = clamp(Math.round(W * H / 16000), 24, 70); P = [];
      for (let i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 8, vy: -(6 + Math.random() * 16), r: 1 + Math.random() * 2.4, h: Math.random() < .22, ph: Math.random() * 7 });
    }
    function frame(ts) {
      if (!on) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        if (mouse) { const dx = p.x - mouse[0], dy = p.y - mouse[1], d2 = dx * dx + dy * dy; if (d2 < 22000) { const d = Math.sqrt(d2) + 1, f = (1 - d / 148) * 260; p.vx += dx / d * f * dt; p.vy += dy / d * f * dt; } }
        p.vx *= .985; p.vy += (-(10 + p.r * 5) - p.vy) * .6 * dt; p.x += (p.vx + Math.sin(ts / 900 + p.ph) * 6) * dt; p.y += p.vy * dt;
        if (p.y < -12) { p.y = H + 8; p.x = Math.random() * W; } if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        const a = .35 + .4 * Math.sin(ts / 600 + p.ph);
        if (p.h) { ctx.strokeStyle = `rgba(253,184,19,${a * .7})`; ctx.lineWidth = 1.2; hexPath(p.x, p.y, p.r * 4.2); ctx.stroke(); }
        else { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5); g.addColorStop(0, `rgba(255,214,102,${a + .25})`); g.addColorStop(1, 'rgba(255,184,3,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r * 5, p.y - p.r * 5, p.r * 10, p.r * 10); }
      }
      if (mouse) {
        ctx.lineWidth = 1;
        for (const p of P) { const dx = p.x - mouse[0], dy = p.y - mouse[1], d = Math.hypot(dx, dy); if (d < 170) { ctx.strokeStyle = `rgba(111,227,255,${(1 - d / 170) * .55})`; ctx.beginPath(); ctx.moveTo(mouse[0], mouse[1]); ctx.lineTo(p.x, p.y); ctx.stroke(); } }
        const g = ctx.createRadialGradient(mouse[0], mouse[1], 0, mouse[0], mouse[1], 120); g.addColorStop(0, 'rgba(253,184,19,.22)'); g.addColorStop(1, 'rgba(253,184,19,0)'); ctx.fillStyle = g; ctx.fillRect(mouse[0] - 120, mouse[1] - 120, 240, 240);
      }
      sparks = sparks.filter(s => (s.t += dt) < s.life);
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; const k = 1 - s.t / s.life; ctx.strokeStyle = `rgba(255,${180 + 60 * k | 0},60,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .04, s.y - s.vy * .04); ctx.stroke(); if (s.ring) { ctx.lineWidth = 1.5; hexPath(s.x, s.y, s.t * 160); ctx.stroke(); } }
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(frame);
    }
    size(); new ResizeObserver(size).observe(hero);
    new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !on) { on = true; last = performance.now(); requestAnimationFrame(frame); } else if (!v) on = false; }, { threshold: .02 }).observe(hero);
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
    hero.addEventListener('pointerleave', () => mouse = null);
    hero.addEventListener('pointerdown', e => {
      if (e.target.closest('a,button')) return; const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      sparks.push({ x, y, vx: 0, vy: 0, t: 0, life: .7, ring: true });
      for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, v = 90 + Math.random() * 260; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: .5 + Math.random() * .6 }); }
    });
  }

  /* ---------- tilt + glare cards ---------- */
  if (fine && !reduce) {
    $$('.bn,.fact,.sc,.kpi,.mi,.cc,.ci').forEach(el => {
      el.classList.add('tilt'); const g = document.createElement('i'); g.className = 'glare'; g.setAttribute('aria-hidden', 'true'); el.appendChild(g);
      let raf = 0;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((x - .5) * 12).toFixed(2) + 'deg'); el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%'); });
      });
      el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('.btn,.play,.tourbtn,.cam-btns button').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); b.style.translate = `${(x * .22).toFixed(1)}px ${(y * .3).toFixed(1)}px`; });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  /* ---------- cursor glow on dark bands ---------- */
  if (fine && !reduce) {
    $$('.band,.band-deep,.hero').forEach(sec => {
      const g = document.createElement('div'); g.className = 'cglow'; g.setAttribute('aria-hidden', 'true'); sec.insertBefore(g, sec.firstChild);
      sec.addEventListener('pointermove', e => { const r = sec.getBoundingClientRect(); g.style.setProperty('--gx', (e.clientX - r.left) + 'px'); g.style.setProperty('--gy', (e.clientY - r.top) + 'px'); g.style.opacity = 1; });
      sec.addEventListener('pointerleave', () => g.style.opacity = 0);
    });
  }

  /* ---------- marquee speed follows scroll velocity ---------- */
  if (!reduce) {
    let lastY = scrollY, v = 0, cur = 1;
    const tracks = $$('.mq-track');
    function loop() {
      const y = scrollY; v = v * .9 + (y - lastY) * .1; lastY = y;
      const target = 1 + Math.min(6, Math.abs(v) * .35), k = target > cur ? .25 : .04; cur += (target - cur) * k;
      if (Math.abs(cur - 1) > .003 || target !== 1) tracks.forEach(t => { const a = t.getAnimations()[0]; if (a) a.updatePlaybackRate(cur); });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- scroll-linked parallax for images tagged [data-par] ---------- */
  const par = $$('[data-par]');
  if (par.length && !reduce) {
    const upd = () => par.forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; el.style.transform = `translateY(${(p * -34).toFixed(1)}px) scale(1.08)`; });
    addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true }); upd();
  }

  /* ---------- portfolio hexes pop in when visible ---------- */
  const pf = $('.pf');
  if (pf) { if (reduce) pf.classList.add('pf-in'); else new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { pf.classList.add('pf-in'); ob.disconnect(); } }, { threshold: .25 }).observe(pf); }

  /* ---------- counters: pop when finished ---------- */
  $$('[data-count]').forEach(el => { const o = new MutationObserver(() => { if (+el.textContent.replace(/\D/g, '') === +el.dataset.count) { el.parentElement.classList.remove('pop'); void el.parentElement.offsetWidth; el.parentElement.classList.add('pop'); o.disconnect(); } }); o.observe(el, { childList: true, characterData: true, subtree: true }); });
})();
