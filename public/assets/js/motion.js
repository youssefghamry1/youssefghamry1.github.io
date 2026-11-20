/* Youssef Ghamry — site motion layer (no dependencies).
 * Adds: heading mask reveal, scroll reveal with stagger, magnetic + fill buttons,
 * hide-on-scroll header, card spotlight + image zoom.
 * Safe by design: content is never changed, everything stays visible if this file fails,
 * and nothing runs for visitors who ask their system for reduced motion.
 * To switch it off, delete the loader at the end of main.js. */
(() => {
  if (window.__ygMotion) return;
  window.__ygMotion = true;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const EASE = 'cubic-bezier(.16,1,.3,1)';

  /* ---------- styles (kept here so the site's Tailwind build is untouched) ---------- */
  const css = `
  .ym-mask{display:block;overflow:hidden;padding:.12em 0 .18em;margin:-.12em 0 -.18em}
  .ym-mask>.ym-line{display:block;transform:translateY(105%);transition:transform 1.1s ${EASE}}
  .ym-mask.ym-in>.ym-line{transform:none}
  .ym-r{opacity:0;translate:0 28px;transition:opacity .9s ${EASE},translate .9s ${EASE} !important;transition-delay:var(--ym-d,0s) !important}
  .ym-r.ym-in{opacity:1;translate:0 0}
  .ym-fx{position:relative;overflow:hidden;isolation:isolate}
  .ym-fx>.ym-fill{position:absolute;z-index:-1;left:var(--fx-x,50%);top:var(--fx-y,50%);width:var(--fx-d,0);height:var(--fx-d,0);
    border-radius:50%;transform:translate(-50%,-50%) scale(0);transition:transform .55s ${EASE};pointer-events:none;
    background:rgba(255,255,255,.22)}
  .btn-ghost-gold.ym-fx>.ym-fill{background:rgba(198,161,91,.22)}
  .ym-fx.ym-on>.ym-fill{transform:translate(-50%,-50%) scale(1)}
  header.ym-hdr{transition:translate .5s cubic-bezier(.7,0,.2,1),background-color .3s,box-shadow .3s}
  header.ym-hdr.ym-hide{translate:0 -110%}
  .interactive-card .ym-spot{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s;
    background:radial-gradient(420px circle at var(--sx,50%) var(--sy,50%),rgba(229,199,139,.10),transparent 60%)}
  .interactive-card:hover .ym-spot{opacity:1}
  html.light .interactive-card .ym-spot{background:radial-gradient(420px circle at var(--sx,50%) var(--sy,50%),rgba(198,161,91,.14),transparent 60%)}
  @media print{.ym-r{opacity:1!important;translate:none!important}.ym-mask>.ym-line{transform:none!important}}
  .interactive-card img{transition:transform 1.1s ${EASE}}
  .interactive-card:hover img{transform:scale(1.04)}
  `;
  const style = document.createElement('style');
  style.id = 'yg-motion-css';
  style.textContent = css;
  document.head.appendChild(style);

  const vh = () => window.innerHeight;
  const inViewNow = el => {
    const r = el.getBoundingClientRect();
    return r.top < vh() && r.bottom > 0;
  };

  /* ---------- 1. headings slide up from behind a mask ---------- */
  const headings = $$('main h1, main h2, section h1, section h2').filter(h =>
    !h.closest('[data-reveal], header, footer, nav, dialog, [role="dialog"], .hidden') && h.textContent.trim());
  const maskObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('ym-in');
      maskObs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  headings.forEach(h => {
    if (inViewNow(h)) return; // already on screen: leave as is, no flicker
    const d = getComputedStyle(h).display;
    if (d.includes('flex') || d.includes('grid')) return; // icon + text headings keep their layout
    const mask = document.createElement('span');
    mask.className = 'ym-mask';
    const line = document.createElement('span');
    line.className = 'ym-line';
    while (h.firstChild) line.appendChild(h.firstChild);
    mask.appendChild(line);
    h.appendChild(mask);
    maskObs.observe(mask);
  });

  /* ---------- 2. blocks fade up as they enter, siblings one after another ---------- */
  const blockSel = '.glass-panel, .glass-panel-elevated, .glass-panel-gold, .interactive-card, section p, section ul, section ol, section .btn-gold, section .btn-emerald, section .btn-ghost-gold';
  const blocks = $$(blockSel).filter(el =>
    !el.closest('header, footer, nav, dialog, [role="dialog"], [data-reveal], .hidden, #mobile-nav-drawer') &&
    !el.parentElement.closest(blockSel) &&       // animate the outer block only
    !el.closest('.ym-mask'));

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('ym-in');
      revealObs.unobserve(el);
      // hand the element back to its own styles (hover lift etc.) once it has arrived
      setTimeout(() => { el.classList.remove('ym-r', 'ym-in'); el.style.removeProperty('--ym-d'); }, 1600);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

  const groupCount = new Map();
  blocks.forEach(el => {
    if (inViewNow(el)) return;
    const p = el.parentElement;
    const i = groupCount.get(p) || 0;
    groupCount.set(p, i + 1);
    el.style.setProperty('--ym-d', `${Math.min(i, 5) * 0.08}s`);
    el.classList.add('ym-r');
    revealObs.observe(el);
  });

  /* ---------- 3. buttons: magnetic pull + a fill that grows from the pointer ---------- */
  if (fine) {
    $$('.btn-gold, .btn-emerald, .btn-ghost-gold').forEach(btn => {
      if (btn.dataset.ymFx) return;
      btn.dataset.ymFx = '1';
      btn.classList.add('ym-fx');
      const fill = document.createElement('span');
      fill.className = 'ym-fill';
      fill.setAttribute('aria-hidden', 'true');
      btn.prepend(fill);
      const at = e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        btn.style.setProperty('--fx-x', `${x}px`);
        btn.style.setProperty('--fx-y', `${y}px`);
        btn.style.setProperty('--fx-d', `${2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y))}px`);
      };
      btn.addEventListener('pointerenter', e => { at(e); btn.classList.add('ym-on'); });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = Math.max(-8, Math.min(8, (e.clientX - r.left - r.width / 2) * 0.2));
        const dy = Math.max(-6, Math.min(6, (e.clientY - r.top - r.height / 2) * 0.3));
        btn.style.translate = `${dx}px ${dy}px`;
      });
      btn.addEventListener('pointerleave', e => {
        at(e);
        btn.classList.remove('ym-on');
        btn.style.translate = '';
      });
    });

    /* ---------- 4. cards: soft light that follows the pointer ---------- */
    $$('.interactive-card').forEach(card => {
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      const spot = document.createElement('span');
      spot.className = 'ym-spot';
      spot.setAttribute('aria-hidden', 'true');
      card.appendChild(spot);
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--sx', `${e.clientX - r.left}px`);
        card.style.setProperty('--sy', `${e.clientY - r.top}px`);
      }, { passive: true });
    });
  }

  /* ---------- 5. header hides on the way down, comes back on the way up ---------- */
  const header = document.querySelector('body > header, header.sticky');
  if (header) {
    header.classList.add('ym-hdr');
    const drawer = document.getElementById('mobile-nav-drawer');
    let lastY = scrollY, ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      const menuOpen = drawer && !drawer.classList.contains('hidden');
      const focusInside = header.contains(document.activeElement) && document.activeElement !== document.body;
      if (menuOpen || focusInside || y < 140 || y < lastY - 4) header.classList.remove('ym-hide');
      else if (y > lastY + 4) header.classList.add('ym-hide');
      if (Math.abs(y - lastY) > 4) lastY = y;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('ym-hide'));
  }
})();
