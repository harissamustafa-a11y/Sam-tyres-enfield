// Sam's Tyres & MOT: parallax, reveal-on-enter, nav state and hero video control.
(() => {
  document.body.classList.remove('no-js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const video = document.getElementById('hero-video');
  const nav = document.getElementById('nav');

  // Hero video loops muted. Reduced motion holds the poster frame instead.
  if (reduce.matches) video.pause();

  // Pause the video whenever the hero is off screen to save battery and CPU.
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([e]) => {
    nav.classList.toggle('is-solid', !e.isIntersecting || e.intersectionRatio < 0.9);
    if (reduce.matches) return;
    if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
  }, { threshold: [0, 0.9] }).observe(hero);

  // Reveal blocks as they enter the viewport.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Parallax: each [data-depth] layer is shifted by depth x its section's distance from
  // the viewport centre. Transform-only, and the rAF loop runs only while a layered
  // section is on screen. Reduced motion leaves every layer static.
  const layers = [...document.querySelectorAll('[data-depth]')].map((el) => ({
    el, depth: parseFloat(el.dataset.depth), host: el.closest('section'),
  }));
  const visible = new Set();
  let running = false;
  let lastY = null, lastW = 0;
  const frame = () => {
    if (!visible.size || reduce.matches) { running = false; lastY = null; return; }
    // Only touch the DOM when the page has actually moved or resized.
    if (window.scrollY === lastY && window.innerWidth === lastW) { requestAnimationFrame(frame); return; }
    lastY = window.scrollY; lastW = window.innerWidth;
    const vh = window.innerHeight;
    // Gentler depth on small screens keeps mobile motion comfortable.
    const scale = window.innerWidth < 760 ? 0.6 : 1;
    for (const l of layers) {
      if (!visible.has(l.host)) continue;
      const r = l.host.getBoundingClientRect();
      const offset = r.top + r.height / 2 - vh / 2;
      l.el.style.transform = `translate3d(0, ${(-offset * l.depth * scale).toFixed(2)}px, 0)`;
    }
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running && !reduce.matches) { running = true; requestAnimationFrame(frame); } };
  const hosts = new Set(layers.map((l) => l.host));
  const pio = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    start();
  });
  hosts.forEach((h) => pio.observe(h));
  reduce.addEventListener('change', () => {
    if (reduce.matches) { layers.forEach((l) => (l.el.style.transform = '')); video.pause(); }
    else { video.play().catch(() => {}); start(); }
  });

  // Reviews: deal the static list into 1-3 columns that scroll upward in a seamless loop.
  // Each column holds its cards twice and moves by -50%, at a steady pixel speed.
  // Without JS, or with reduced motion, the reviews stay a static grid.
  const tcols = document.getElementById('tcols');
  const cards = [...tcols.querySelectorAll('.tcard')];
  const list = tcols.querySelector('.tlist');
  const colsFor = () => (window.innerWidth >= 1080 ? 3 : window.innerWidth >= 768 ? 2 : 1);
  let built = 0;
  const buildReviews = () => {
    const n = reduce.matches ? 0 : colsFor();
    if (n === built) return;
    built = n;
    tcols.replaceChildren();
    tcols.classList.toggle('is-marquee', n > 0);
    if (!n) { cards.forEach((c) => list.append(c)); tcols.append(list); return; }
    for (let c = 0; c < n; c++) {
      const col = document.createElement('div'); col.className = 'tcol';
      const track = document.createElement('div'); track.className = 'tcol__track';
      const set = document.createElement('div'); set.className = 'tcol__set';
      cards.filter((_, i) => i % n === c).forEach((card) => set.append(card));
      track.append(set); col.append(track); tcols.append(col);
      requestAnimationFrame(() => {
        // A short column is topped up with repeat cards until it fills the window,
        // otherwise a gap would show as it loops. Repeats are hidden from assistive tech.
        const mine = [...set.children];
        for (let k = 0; set.offsetHeight < tcols.clientHeight + 24 && k < 20; k++) {
          const extra = mine[k % mine.length].cloneNode(true);
          extra.setAttribute('aria-hidden', 'true'); extra.inert = true;
          set.append(extra);
        }
        const copy = set.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); copy.inert = true;
        track.append(copy);
        // ~28px/s, nudged per column so they drift out of step.
        track.style.setProperty('--dur', `${(set.offsetHeight / (28 - c * 3)).toFixed(1)}s`);
      });
    }
  };
  buildReviews();
  window.addEventListener('resize', buildReviews, { passive: true });
  reduce.addEventListener('change', buildReviews);

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
