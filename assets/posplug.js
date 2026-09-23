/* PosPlug. The one script for posplug.in. The page is complete without it:
   this adds the live feeds, the scroll-driven setup demo, tabs, the expanding
   units and form validation. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- header: progress bar + UTC clock ---------- */
  const prog = $('.top__prog');
  const utc = $('[data-utc]');
  const tickUtc = () => { if (utc) utc.textContent = 'UTC ' + new Date().toISOString().slice(11, 19); };
  tickUtc(); setInterval(tickUtc, 1000);

  /* ---------- hero: scrambled label ---------- */
  const scr = $('[data-scramble]');
  if (scr && !rm) {
    const text = scr.textContent, chars = '!<>-_/[]{}=+*^?#01', total = 26;
    let f = 0;
    const run = () => {
      scr.textContent = text.split('').map((c, i) => c === ' ' || i < (f / total) * text.length ? c : chars[Math.floor(Math.random() * chars.length)]).join('');
      if (f++ < total) setTimeout(run, 32); else scr.textContent = text;
    };
    run();
  }

  /* ---------- hero: crosshair ---------- */
  const board = $('[data-board]');
  const chV = $('[data-cross-v]'), chH = $('[data-cross-h]'), chT = $('[data-cross-txt]');
  if (board && !rm) {
    board.addEventListener('mousemove', e => {
      const r = board.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      chV.style.opacity = 1; chV.style.transform = `translateX(${x}px)`;
      chH.style.opacity = 1; chH.style.transform = `translateY(${y}px)`;
      chT.textContent = `X ${pad(Math.round(x), 4)} · Y ${pad(Math.round(y), 4)}`;
    });
    board.addEventListener('mouseleave', () => { chV.style.opacity = 0; chH.style.opacity = 0; });
  }

  /* ---------- hero: pulses travelling along the patch cables ---------- */
  const svg = $('[data-hero]');
  if (svg) {
    const NS = 'http://www.w3.org/2000/svg';
    const inL = $('[data-pulses]', svg), outL = $('[data-pulses-out]', svg);
    const pulses = [];
    const mk = (layer, sz) => { const c = document.createElementNS(NS, 'rect'); c.setAttribute('width', sz); c.setAttribute('height', sz); c.setAttribute('fill', '#FF4F12'); layer.appendChild(c); return c; };
    $$('[data-cable]', svg).forEach((p, i) => {
      const L = p.getTotalLength();
      for (let k = 0; k < 2; k++) pulses.push({ p, L, c: mk(inL, 7), sz: 7, off: (i * 0.17 + k * 0.5) % 1, speed: 0.00018 + (i % 3) * 0.00004 });
    });
    const out = $('[data-out]', svg);
    if (out) { const L = out.getTotalLength(); for (let k = 0; k < 4; k++) pulses.push({ p: out, L, c: mk(outL, 12), sz: 12, off: k / 4, speed: 0.00045 }); }
    const place = ts => { for (const q of pulses) { const pt = q.p.getPointAtLength(((ts * q.speed + q.off) % 1) * q.L); q.c.setAttribute('x', pt.x - q.sz / 2); q.c.setAttribute('y', pt.y - q.sz / 2); } };
    if (rm) place(0);
    else {
      let vis = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(svg);
      const tick = ts => { if (vis) place(ts); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  }

  /* ---------- live feeds: event bus + webhooks ---------- */
  const flash = el => {
    if (rm || !el || !el.firstElementChild || !el.firstElementChild.animate) return;
    el.firstElementChild.animate([{ opacity: 0, transform: 'translateX(-12px)', background: 'rgba(255,79,18,0.25)' }, { opacity: 1, transform: 'none', background: 'transparent' }], { duration: 480, easing: 'steps(6)' });
  };
  const now = () => new Date().toTimeString().slice(0, 8);
  const rid = () => Math.random().toString(36).slice(2, 8);
  let seq = 0;
  const stream = $('[data-stream]');
  const core = svg && $('[data-core]', svg);
  const pushEvent = () => {
    if (document.hidden || !stream) return;
    const T = ['order.created', 'payment.captured', 'item.updated', 'order.updated'];
    const P = ['cloud_pos_a', 'tablet_pos_b', 'kiosk_pos_c', 'legacy_pos_d', 'retail_pos_e', 'handheld_pos_f'];
    const t = T[seq % 4], pos = P[(seq * 5 + 1) % 6]; seq++;
    const id = rid(), amt = 900 + Math.floor(Math.random() * 5000);
    const lines = t.startsWith('order') ? [`"id": "ord_${id}"`, '"location_id": "loc_8f2k"', `"total": ${amt}`, `"pos": "${pos}"`]
      : t === 'payment.captured' ? [`"id": "pay_${id}"`, '"method": "card"', `"amount": ${amt}`, `"pos": "${pos}"`]
      : [`"id": "itm_${id}"`, '"name": "Smash burger"', '"price": 1250', `"pos": "${pos}"`];
    const ev = document.createElement('div');
    ev.className = 'ev';
    ev.innerHTML = `<div class="ev__head"><b>${t}</b><span>${now()}</span></div>` + lines.map(l => `<div class="ev__line">${esc(l)}</div>`).join('');
    stream.prepend(ev);
    while (stream.children.length > 5) stream.lastElementChild.remove();
    flash(stream);
    if (core && core.animate && !rm) core.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: 180 });
  };
  const hooks = $('[data-hooks]');
  const pushHook = () => {
    if (document.hidden || !hooks) return;
    const T = ['order.created', 'payment.captured', 'item.updated', 'order.updated', 'location.synced'];
    const L = ['loc_8f2k', 'loc_3m1q', 'loc_9xa7', 'loc_1p0d'];
    const n = Math.floor(Math.random() * 1000);
    const row = document.createElement('div');
    row.className = 'hook';
    row.innerHTML = `<span>${now()}</span><span><b>${T[n % 5]}</b> · ${L[n % 4]}</span><span>200</span>`;
    hooks.prepend(row);
    while (hooks.children.length > 6) hooks.lastElementChild.remove();
    flash(hooks);
  };
  setInterval(pushEvent, 1900);
  setInterval(pushHook, 2300);

  /* ---------- 02: scroll-driven 30-minute setup ---------- */
  const STEPS = [
    { n: '01', name: 'Pick POS', min: 1, caption: 'Search the list, or just type its name.' },
    { n: '02', name: 'Connect', min: 3, caption: 'Sign in with OAuth, or paste an API key.' },
    { n: '03', name: 'Discover', min: 5, caption: 'Watch real sample data roll in.' },
    { n: '04', name: 'Review AI mapping', min: 10, caption: 'The AI did the mapping. You confirm the flagged ones.' },
    { n: '05', name: 'Test', min: 5, caption: 'One click. A real test order, end to end.' },
    { n: '06', name: 'Go live', min: 3, caption: "Pick locations. Hit go live. That's it." }
  ];
  const STARTS = [0, 1, 4, 9, 19, 24];
  const demo = $('[data-demo]');
  const state = $('[data-demo-state]');
  const clock = $('[data-clock]');
  const stepBtns = $$('[data-step]');
  const segs = $$('[data-segs] i');
  const ticks = $$('[data-ticks] i');
  const panels = $$('[data-panel]');
  const curN = $('[data-cur-n]'), curMin = $('[data-cur-min]'), curName = $('[data-cur-name]'), curCap = $('[data-cur-cap]');
  let cur = { step: -1, done: null, mins: -1 };
  const fmt = sec => { sec = Math.max(0, Math.round(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); };
  const render = (step, done, mins) => {
    if (step !== cur.step || done !== cur.done) {
      stepBtns.forEach((b, i) => {
        const nowI = i === step && !done;
        b.classList.toggle('is-now', nowI);
        b.classList.toggle('is-past', i < step || done);
        if (nowI) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      segs.forEach((s, i) => { s.classList.toggle('is-past', i < step || done); s.classList.toggle('is-now', i === step && !done); });
      const show = done ? 5 : step;
      panels.forEach((p, i) => p.classList.toggle('is-on', i === show));
      state.classList.toggle('is-done', done);
      const st = STEPS[step];
      curN.textContent = st.n; curMin.textContent = st.min; curName.textContent = st.name; curCap.textContent = st.caption;
    }
    if (mins !== cur.mins || done !== cur.done) ticks.forEach((t, i) => t.classList.toggle('is-on', i < mins));
    cur = { step, done, mins };
  };
  const updateScroll = () => {
    const h = document.documentElement, max = h.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    if (!demo) return;
    const r = demo.getBoundingClientRect(), total = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / (total || 1)));
    const done = p >= 0.9;
    const f = Math.min(0.99999, p / 0.9) * 6, i = Math.min(5, Math.floor(f)), frac = f - i;
    const elapsed = done ? 1620 : (STARTS[i] + frac * STEPS[i].min) * 60;
    clock.textContent = fmt(elapsed);
    render(i, done, done ? 27 : Math.floor(elapsed / 60));
  };
  let raf = 0;
  const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; updateScroll(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  stepBtns.forEach((b, i) => b.addEventListener('click', () => {
    const top = demo.getBoundingClientRect().top + scrollY, total = demo.offsetHeight - innerHeight;
    scrollTo({ top: top + ((i + 0.3) / 6) * 0.9 * total, behavior: rm ? 'auto' : 'smooth' });
  }));
  updateScroll();

  /* ---------- 02: confirm flagged AI mappings ---------- */
  $$('[data-confirm]').forEach(btn => btn.addEventListener('click', () => {
    const badge = btn.parentElement.querySelector('[data-badge]');
    badge.textContent = btn.dataset.confirm + ' OK';
    badge.classList.remove('badge--ask');
    btn.remove();
  }));

  /* ---------- 03: expanding units (hover, focus or tap) ---------- */
  const units = $$('[data-unit]');
  const open = u => units.forEach(x => { const on = x === u; x.classList.toggle('is-open', on); x.setAttribute('aria-expanded', on); });
  units.forEach(u => {
    u.addEventListener('mouseenter', () => open(u));
    u.addEventListener('focus', () => open(u));
    u.addEventListener('click', () => open(u));
    u.addEventListener('mouseleave', () => open(null));
    u.addEventListener('blur', () => open(null));
    u.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(u.classList.contains('is-open') ? null : u); } });
  });

  /* ---------- 04: code tabs ---------- */
  const tabs = $$('[data-tab]');
  const pick = t => tabs.forEach(x => {
    const on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    document.getElementById('code-' + x.dataset.tab).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length]; pick(n); n.focus();
    });
  });

  /* ---------- 09: plug animation ---------- */
  const plug = $('[data-plug]');
  if (plug) {
    if (rm || !('IntersectionObserver' in window)) plug.classList.add('is-plugged');
    else {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { setTimeout(() => plug.classList.add('is-plugged'), 250); io.disconnect(); }
      }), { threshold: 0.3 });
      io.observe(plug);
    }
  }

  /* ---------- 09: early-access form ----------
     There is no signup backend yet (POSplugin/website issue "Early access
     backend"). A valid form opens a prefilled email to contact@posplug.in;
     the page says so instead of pretending the request was stored. */
  const form = $('[data-form]');
  if (form) {
    const F = ['email', 'company', 'pos'];
    const touched = {};
    const input = k => form.elements[k];
    const validate = () => {
      const e = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input('email').value.trim())) e.email = 'That email looks off. Try again?';
      if (!input('company').value.trim()) e.company = 'Which company is this for?';
      if (!input('pos').value.trim()) e.pos = 'Name at least one POS. Rough is fine.';
      return e;
    };
    const show = errs => F.forEach(k => {
      const bad = !!(touched[k] && errs[k]), msg = $('#e-' + k);
      input(k).setAttribute('aria-invalid', bad);
      msg.hidden = !bad; msg.textContent = bad ? '! ' + errs[k] : '';
    });
    F.forEach(k => {
      input(k).addEventListener('blur', () => { touched[k] = true; show(validate()); });
      input(k).addEventListener('input', () => { if (touched[k]) show(validate()); });
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      F.forEach(k => { touched[k] = true; });
      const errs = validate();
      show(errs);
      const first = F.find(k => errs[k]);
      if (first) { input(first).focus(); return; }
      const v = k => input(k).value.trim();
      const body = `Work email: ${v('email')}\nCompany: ${v('company')}\nPOS systems we need: ${v('pos')}\n`;
      location.href = 'mailto:contact@posplug.in?subject=' + encodeURIComponent('PosPlug early access: ' + v('company')) + '&body=' + encodeURIComponent(body);
      $('[data-done-email]').textContent = v('email');
      form.hidden = true;
      $('[data-done]').hidden = false;
    });
  }

  /* ---------- scroll reveal, below the fold only ---------- */
  if (!rm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.remove('reveal-pending', 'line-pending');
      io.unobserve(e.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal],[data-line]').forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight * 0.9) return;
      const d = parseInt(el.getAttribute('data-reveal'), 10) || 0;
      if (el.hasAttribute('data-line')) { el.style.transition = 'transform 1.2s cubic-bezier(.8,0,.2,1)'; el.classList.add('line-pending'); }
      else { el.style.transition = `opacity .6s steps(4) ${d}ms, transform .7s cubic-bezier(.2,.7,.2,1) ${d}ms`; el.classList.add('reveal-pending'); }
      io.observe(el);
    });
  }
})();
