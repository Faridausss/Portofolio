'use strict';

    // ─── THEME ───────────────────────────────────────
    (function () {
      const html = document.documentElement;
      const stored = localStorage.getItem('portfolio-theme') || 'dark';
      html.setAttribute('data-theme', stored);

      function getIcon(theme) {
        return theme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
      }

      function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
        document.querySelectorAll('.theme-toggle').forEach(btn => {
          btn.innerHTML = getIcon(theme);
          btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        });
      }

      // Set initial icon
      document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.innerHTML = getIcon(stored);
      });

      document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const current = html.getAttribute('data-theme');
          applyTheme(current === 'dark' ? 'light' : 'dark');
        });
      });
    })();

    // ─── MOBILE MENU ─────────────────────────────────
    (function () {
      const hamburger = document.getElementById('navHamburger');
      const mobileMenu = document.getElementById('navMobile');

      hamburger.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen);
      });

      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('open');
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
          mobileMenu.classList.remove('open');
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    })();

    // ─── NAVBAR SCROLL BEHAVIOR ───────────────────────
    (function () {
      const navbar = document.getElementById('navbar');
      let lastY = 0;

      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        navbar.classList.toggle('scrolled', y > 50);
        lastY = y;
      }, { passive: true });
    })();

    // ─── ACTIVE NAV LINK ─────────────────────────────
    (function () {
      const sections = document.querySelectorAll('section[id]');
      const navLinks = document.querySelectorAll('.nav-links a');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
              link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });

      sections.forEach(section => observer.observe(section));
    })();

    // ─── SCROLL REVEAL SYSTEM ─────────────────────────
    // Bidirectional: enter viewport → add .visible (CSS plays forward),
    // leave viewport → remove .visible (the same CSS transition plays backward).
    // Two observers form a small hysteresis band so edge jitter never flickers:
    //  • SHOW once the element's top edge is ~12% of the screen above the bottom
    //  • HIDE when it drops back below ~3% from the bottom (reverse is still on screen)
    //    or leaves ~10% past the top (already out of sight)
    // Groups ([data-stagger]) reveal their direct .reveal children in sequence;
    // sequences ([data-reveal-seq]) just get .visible and let CSS time the parts;
    // anything inside [data-reveal-once] (the hero) enters once and stays put.
    (function () {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

      // Stagger delays for grouped children
      document.querySelectorAll('[data-stagger]').forEach(group => {
        const step = parseFloat(group.dataset.stagger) || 80;
        const base = parseFloat(group.dataset.staggerBase) || 0;
        Array.from(group.children)
          .filter(c => c.classList.contains('reveal'))
          .forEach((child, i) => child.style.setProperty('--rd', (base + i * step) + 'ms'));
      });

      // Observed targets: standalone .reveal, group containers, sequences
      const targets = Array.from(document.querySelectorAll('.reveal, [data-stagger], [data-reveal-seq]'))
        .filter(el => !(el.classList.contains('reveal') &&
                        el.parentElement && el.parentElement.hasAttribute('data-stagger')));

      function setState(el, on) {
        el.classList.toggle('visible', on);
        if (el.hasAttribute('data-stagger')) {
          el.querySelectorAll(':scope > .reveal').forEach(c => c.classList.toggle('visible', on));
        }
      }

      // Reduced motion / no IntersectionObserver: show everything, no movement
      if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        targets.forEach(el => setState(el, true));
        return;
      }

      const showObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          setState(entry.target, true);
          if (entry.target.closest('[data-reveal-once]')) {
            showObserver.unobserve(entry.target);
            hideObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });

      const hideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) setState(entry.target, false);
        });
      }, { rootMargin: '10% 0px -3% 0px', threshold: 0 });

      // Wait a frame so the hidden start state is painted before animating in
      requestAnimationFrame(() => requestAnimationFrame(() => {
        targets.forEach(el => {
          showObserver.observe(el);
          if (!el.closest('[data-reveal-once]')) hideObserver.observe(el);
        });
      }));
    })();

    // ─── PROJECT HORIZONTAL SCROLL ────────────────────
    // Vertical scroll progress drives a pinned horizontal track.
    // Desktop / landscape tablet only; everything else keeps the vertical list.
    (function () {
      const section = document.getElementById('projects');
      const wrapper = document.getElementById('projectsScrollWrapper');
      const sticky  = document.getElementById('projectsSticky');
      const track   = document.getElementById('projectsTrack');
      if (!section || !wrapper || !sticky || !track) return;

      const cards   = Array.from(track.querySelectorAll('.cs-card'));
      const dots    = Array.from(sticky.querySelectorAll('.pp-dot'));
      const fills   = Array.from(sticky.querySelectorAll('.pp-line-fill'));
      const current = document.getElementById('ppCurrent');
      const n = cards.length;
      if (n < 2) return;

      const sizeQuery   = window.matchMedia('(min-width: 900px) and (min-height: 600px)');
      const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

      // Scroll budget (in viewport heights)
      const HOLD  = 0.22;  // stable hold on first / last project
      const SEG   = 1.1;   // scroll distance for each project → project move
      const DWELL = 0.22;  // share of each move spent resting at either end

      let active = false, ticking = false;
      let vh = 0, step = 0, wrapTop = 0, range = 0, lastPos = -1, lastIdx = -1;

      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

      // Measured on resize/load only — never inside the scroll handler
      function measure() {
        vh = window.innerHeight;
        range = vh * HOLD * 2 + vh * SEG * (n - 1);
        wrapper.style.height = (vh + range) + 'px';
        step = cards[1].offsetLeft - cards[0].offsetLeft;
        wrapTop = wrapper.getBoundingClientRect().top + window.scrollY;
      }

      // scrollY → continuous position 0 … n-1, with a calm dwell at each project
      function positionFromScroll() {
        const y   = clamp(window.scrollY - wrapTop, 0, range);
        const raw = clamp((y - vh * HOLD) / (vh * SEG), 0, n - 1);
        const i   = Math.min(Math.floor(raw), n - 2);
        const f   = raw - i;
        const e   = smoother(clamp((f - DWELL) / (1 - 2 * DWELL), 0, 1));
        return i + e;
      }

      function render(pos) {
        track.style.transform = 'translate3d(' + (-pos * step).toFixed(2) + 'px,0,0)';

        cards.forEach((card, i) => {
          const d = Math.abs(i - pos);
          const x = clamp((d - 0.08) / 0.84, 0, 1);
          const t = 1 - x * x * (3 - 2 * x);               // 1 when centred → 0 when a full step away
          card.style.opacity = Math.min(1, t * 1.5).toFixed(3);
          card.style.scale = (0.96 + 0.04 * t).toFixed(4);
          card.style.setProperty('--t', t.toFixed(3));
          card.style.pointerEvents = t > 0.5 ? '' : 'none';
        });

        fills.forEach((fill, k) => {
          fill.style.transform = 'scaleX(' + clamp(pos - k, 0, 1).toFixed(3) + ')';
        });

        const idx = Math.round(pos);
        if (idx !== lastIdx) {
          lastIdx = idx;
          dots.forEach((dot, k) => dot.classList.toggle('pp-dot--active', k <= idx));
          if (current) current.textContent = String(idx + 1).padStart(2, '0');
        }
      }

      function update() {
        ticking = false;
        if (!active) return;
        const pos = positionFromScroll();
        if (Math.abs(pos - lastPos) < 0.0005) return;
        lastPos = pos;
        render(pos);
      }

      function onScroll() {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      }

      function overflows() {
        return cards.some(card => {
          const c = card.querySelector('.cs-content');
          return c && c.scrollHeight > c.clientHeight + 2;
        });
      }

      function enable() {
        section.classList.add('projects-hscroll');
        active = true;
        measure();
        // Overflow guard: compact once; if it still doesn't fit, fall back to the vertical list
        if (overflows()) {
          section.classList.add('is-compact');
          measure();
          if (overflows()) { disable(); return; }
        }
        lastPos = -1; lastIdx = -1;
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
      }

      function disable() {
        window.removeEventListener('scroll', onScroll);
        active = false;
        section.classList.remove('projects-hscroll', 'is-compact');
        wrapper.style.height = '';
        track.style.transform = '';
        cards.forEach(card => {
          card.style.opacity = '';
          card.style.scale = '';
          card.style.pointerEvents = '';
          card.style.removeProperty('--t');
        });
        fills.forEach(fill => { fill.style.transform = ''; });
      }

      function evaluate() {
        if (active) disable();
        if (sizeQuery.matches && !reduceQuery.matches) enable();
      }

      // Re-evaluate on resize (debounced), orientation, motion preference, fonts/images
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(evaluate, 150);
      });
      [sizeQuery, reduceQuery].forEach(q => {
        if (q.addEventListener) q.addEventListener('change', evaluate);
      });
      window.addEventListener('load', evaluate);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(evaluate);

      // Page height can shift as content above settles — refresh only the cached offset
      if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
          if (!active) return;
          wrapTop = wrapper.getBoundingClientRect().top + window.scrollY;
        }).observe(document.body);
      }

      evaluate();
    })();

    // ─── BACK TO TOP ──────────────────────────────────
    (function () {
      const btn = document.getElementById('backToTop');

      window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
      }, { passive: true });

      btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    })();

    // ─── SMOOTH ANCHOR SCROLLING ──────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = 90;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });

    // ─── PREMIUM MOTION LAYER ─────────────────────────
    // Progress bar, headline word reveal, background parallax, spotlight, magnetic buttons, photo depth.
    (function () {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

      // 1) Scroll progress bar
      const bar = document.createElement('div');
      bar.className = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);

      // 2) Hero headline: split into words, rise out of a mask
      const h1 = document.querySelector('.hero-headline');
      if (h1) {
        h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
        let i = 0;
        const walk = (node) => {
          Array.from(node.childNodes).forEach(n => {
            if (n.nodeType === 3) {
              const frag = document.createDocumentFragment();
              n.textContent.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
                const inner = document.createElement('span'); inner.className = 'wi';
                inner.style.setProperty('--i', i++); inner.textContent = part;
                w.appendChild(inner); frag.appendChild(w);
              });
              node.replaceChild(frag, n);
            } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
          });
        };
        walk(h1);
        requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add('hl-in')));
      }

      // 3) Scroll-driven: progress bar + gentle parallax (one rAF-throttled handler)
      const orbs = Array.from(document.querySelectorAll('.bg-orb'));
      let ticking = false;
      function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const y = window.scrollY;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
          orbs.forEach((o, k) => o.style.setProperty('translate', '0 ' + (y * (k ? -0.06 : 0.1)).toFixed(1) + 'px'));
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      if (!fine) return;

      // 4) Cursor spotlight inside cards
      document.querySelectorAll('.skill-card, .contact-method, .trait-item, .tech-item').forEach(el => {
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });

      // 5) Magnetic buttons
      document.querySelectorAll('.btn-primary, .btn-secondary, .btn-contact-nav').forEach(btn => {
        btn.addEventListener('pointermove', e => {
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
          btn.style.setProperty('translate', dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px');
        });
        btn.addEventListener('pointerleave', () => btn.style.removeProperty('translate'));
      });

      // 6) Photo depth: image drifts opposite to the pointer inside the frame
      document.querySelectorAll('.profile-frame, .about-avatar').forEach(frame => {
        const img = frame.querySelector('img');
        if (!img) return;
        frame.addEventListener('pointermove', e => {
          const r = frame.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          img.style.setProperty('translate', (-px * 14).toFixed(1) + 'px ' + (-py * 14).toFixed(1) + 'px');
        });
        frame.addEventListener('pointerleave', () => img.style.removeProperty('translate'));
      });
    })();

    // ─── PROJECT CARD CURSOR INTERACTION ──────────────
// Spotlight + subtle pull (maks. 5px). Hanya menulis CSS variable
// (--sx/--sy/--cx/--cy) dan class di .cs-card; track tidak disentuh.
(function () {
  const section = document.getElementById('projects');
  if (!section) return;

  const fine   = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MAX_SHIFT = 5;      // px, jarak tarikan maksimum
  const FOLLOW = 0.14;      // kehalusan pergerakan card
  const SPOT_FOLLOW = 0.2;  // kehalusan spotlight
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  section.querySelectorAll('.cs-card').forEach(card => {
    let hovering = false, snap = false, raf = 0;
    let mx = 0, my = 0, x = 0, y = 0, sx = 0, sy = 0;

    function frame() {
      raf = 0;
      const r = card.getBoundingClientRect();
      const k = card.offsetWidth ? r.width / card.offsetWidth : 1;

      // Pengaman: card bergeser saat scroll horizontal -> cursor bisa keluar tanpa event
      if (hovering && (mx < r.left || mx > r.right || my < r.top || my > r.bottom)) {
        hovering = false;
        card.classList.remove('cx-hover');
      }

      let tx = 0, ty = 0;
      if (hovering) {
        const cx = r.left + r.width / 2 - x * k;   // pusat tanpa offset tarikan
        const cy = r.top + r.height / 2 - y * k;
        tx = clamp((mx - cx) / (r.width / 2), -1, 1) * MAX_SHIFT;
        ty = clamp((my - cy) / (r.height / 2), -1, 1) * MAX_SHIFT;

        const lx = (mx - r.left) / k, ly = (my - r.top) / k;
        if (snap) { sx = lx; sy = ly; snap = false; }
        else { sx += (lx - sx) * SPOT_FOLLOW; sy += (ly - sy) * SPOT_FOLLOW; }
        card.style.setProperty('--sx', sx.toFixed(1) + 'px');
        card.style.setProperty('--sy', sy.toFixed(1) + 'px');
      }

      x += (tx - x) * FOLLOW;
      y += (ty - y) * FOLLOW;
      card.style.setProperty('--cx', x.toFixed(2) + 'px');
      card.style.setProperty('--cy', y.toFixed(2) + 'px');

      if (hovering || Math.abs(x) > 0.02 || Math.abs(y) > 0.02) {
        raf = requestAnimationFrame(frame);
      } else {
        x = y = 0;
        card.classList.remove('cx-live');
        card.style.removeProperty('--cx');
        card.style.removeProperty('--cy');
      }
    }

    card.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || !fine.matches || reduce.matches) return;
      hovering = true; snap = true;
      mx = e.clientX; my = e.clientY;
      card.classList.add('cx-live', 'cx-hover');
      if (!raf) raf = requestAnimationFrame(frame);
    });

    card.addEventListener('pointermove', e => {
      if (!hovering) return;
      mx = e.clientX; my = e.clientY;
    });

    card.addEventListener('pointerleave', () => {
      if (!hovering) return;
      hovering = false;
      card.classList.remove('cx-hover');
      if (!raf) raf = requestAnimationFrame(frame);
    });
    });
    })();