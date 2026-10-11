/*
  Shiva Shanker Bantu, UX portfolio. Shared script for every page.
  Loaded without defer in <head> so <site-header> and <site-footer> render
  as the parser reaches them, with no flash. Everything else waits for the DOM.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'theme';
  var RESUME = 'assets/Shiva_Shanker_Bantu_Resume.pdf';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Theme ---------- */

  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function setTheme(theme, remember) {
    root.setAttribute('data-theme', theme);
    if (remember) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage blocked */ }
    }
  }

  // Follow the system setting until the visitor picks a theme themselves.
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var onSystemChange = function (e) {
    var saved = storedTheme();
    if (saved !== 'light' && saved !== 'dark') setTheme(e.matches ? 'dark' : 'light', false);
  };
  if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);

  // Keep other open tabs in step.
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) setTheme(e.newValue, false);
  });

  /* ---------- Shared header and footer ---------- */

  var ICON_THEME = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6"></circle><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"></path></svg>';
  var ICON_MENU = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 5h11M2.5 8h11M2.5 11h11"></path></svg>';

  function headerHTML(isHome) {
    var home = isHome ? '' : 'index.html';
    return '' +
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header">' +
        '<div class="site-header__inner">' +
          '<a class="brand" href="' + (isHome ? '#top' : 'index.html') + '">Shiva Shanker Bantu</a>' +
          '<nav class="nav" aria-label="Main">' +
            '<button class="theme-toggle" type="button" aria-label="Switch between light and dark theme">' +
              ICON_THEME + '<span class="tl-dark">Dark</span><span class="tl-light">Light</span>' +
            '</button>' +
            '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Menu">' + ICON_MENU + '</button>' +
            '<div class="nav-menu" id="nav-menu">' +
              '<a href="' + home + '#work">Work</a>' +
              '<a href="' + home + '#about">About</a>' +
              '<a href="' + home + '#contact">Contact</a>' +
              '<a class="btn-resume" href="' + RESUME + '" target="_blank" rel="noopener">Resume</a>' +
            '</div>' +
          '</nav>' +
        '</div>' +
      '</header>';
  }

  function footerHTML() {
    return '<footer class="wrap site-footer"><span>Shiva Shanker Bantu, 2026</span><span>Designed in Figma, built with Claude Code</span></footer>';
  }

  function define(name, render) {
    if (!window.customElements || customElements.get(name)) return;
    customElements.define(name, class extends HTMLElement {
      connectedCallback() {
        if (!this.hasChildNodes()) this.innerHTML = render(this);
      }
    });
  }
  define('site-header', function (el) { return headerHTML(el.hasAttribute('home')); });
  define('site-footer', footerHTML);

  /* ---------- Scroll reveal ---------- */

  // Sections and their direct children rise in; children of [data-stagger] rows go one by one.
  var canReveal = !reduceMotion.matches && 'IntersectionObserver' in window;
  if (canReveal) root.classList.add('reveal-ready');

  function setUpReveal() {
    if (!canReveal) return;
    var targets = [];
    document.querySelectorAll('main > section:not(.cover):not(.hero)').forEach(function (section) {
      Array.prototype.forEach.call(section.children, function (child) {
        if (child.getAttribute('aria-hidden') === 'true') return;
        if (child.hasAttribute('data-stagger')) {
          Array.prototype.forEach.call(child.children, function (item, i) {
            item.style.setProperty('--reveal-delay', (i % 4) * 90 + 'ms');
            targets.push(item);
          });
        } else {
          targets.push(child);
        }
      });
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    var fold = window.innerHeight;
    targets.forEach(function (el) {
      // Already on screen at load: leave it alone rather than hide and re-show it.
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  /* ---------- Header controls ---------- */

  function setUpHeader() {
    var toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
      });
    }

    var menuButton = document.querySelector('.menu-toggle');
    var menu = document.getElementById('nav-menu');
    if (!menuButton || !menu) return;

    function setMenu(open) {
      menu.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
    }
    menuButton.addEventListener('click', function () {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        menuButton.focus();
      }
    });
  }

  /* ---------- Lightbox ---------- */

  // Set by setUpLightbox; other components (the coverflow) call it to open an image.
  var openLightbox = null;

  function setUpLightbox() {
    var images = document.querySelectorAll('img[data-zoom]');
    if (!images.length && !document.querySelector('[data-coverflow]')) return;

    var dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Enlarged screenshot');
    dialog.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">' +
        '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"></path></svg>' +
      '</button>' +
      '<div class="lightbox__stage"><img class="lightbox__img" alt=""></div>';
    document.body.appendChild(dialog);

    var closeButton = dialog.querySelector('.lightbox__close');
    var big = dialog.querySelector('.lightbox__img');
    var opener = null;

    // returnTo: element to focus again on close (defaults to the image itself)
    function open(img, returnTo) {
      opener = returnTo || img;
      var w = +img.getAttribute('width') || img.naturalWidth || 1;
      var h = +img.getAttribute('height') || img.naturalHeight || 1;
      dialog.classList.toggle('is-tall', h / w > 1.6);
      big.src = img.getAttribute('data-full') || img.currentSrc || img.src;
      big.alt = img.alt;
      big.width = w;
      big.height = h;
      root.classList.add('lightbox-open');
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
      dialog.scrollTop = 0;
      closeButton.focus();
    }

    function close() {
      if (dialog.close) dialog.close(); else dialog.removeAttribute('open');
    }

    dialog.addEventListener('close', function () {
      root.classList.remove('lightbox-open');
      big.removeAttribute('src');
      if (opener) opener.focus();
    });
    closeButton.addEventListener('click', close);
    // A click anywhere except the image itself closes.
    dialog.addEventListener('click', function (e) {
      if (e.target !== big) close();
    });
    // The close button is the only control inside, so Tab stays on it.
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        closeButton.focus();
      }
    });

    openLightbox = open;

    images.forEach(function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge image: ' + img.alt);
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(img);
        }
      });
    });
  }

  /* ---------- Coverflow carousel (Accenture "Inside the portal") ---------- */

  // The current screen sits in front with its neighbours scaled down behind it on both sides.
  // Arrows, dots, a click on a side screen, swipe and the left/right keys move it; a click on the
  // front screen opens it in the lightbox. The caption follows the current screen.
  function setUpCoverflow() {
    document.querySelectorAll('[data-coverflow]').forEach(function (cf) {
      var track = cf.querySelector('.coverflow__track');
      var slides = Array.prototype.slice.call(track.querySelectorAll('.coverflow__slide'));
      var dots = cf.querySelector('.coverflow__dots');
      var title = cf.querySelector('.coverflow__title');
      var note = cf.querySelector('.coverflow__note');
      var n = slides.length;
      var cur = 0;
      var swiped = false;

      slides.forEach(function (slide, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'coverflow__dot';
        dot.setAttribute('aria-label', 'Show ' + slide.getAttribute('data-title'));
        dot.addEventListener('click', function () { go(i); });
        dots.appendChild(dot);

        slide.addEventListener('click', function () {
          if (swiped) return;
          if (i === cur && openLightbox) openLightbox(slide.querySelector('img'), slide);
          else go(i);
        });
      });

      function layout() {
        slides.forEach(function (slide, i) {
          var o = i - cur;
          if (o > n / 2) o -= n;
          if (o < -n / 2) o += n;
          var ab = Math.abs(o);
          // ab: 0 = front, 1 = neighbour, 2 = next one out, 3+ = hidden behind
          var scale = ab < 3 ? [1, 0.78, 0.6][ab] : 0.5;
          var shift = ab < 3 ? [0, 46, 78][ab] : 90;
          slide.style.transform = 'translate(-50%, -50%) translateX(' + (o < 0 ? -shift : shift) + '%) scale(' + scale + ')';
          slide.style.zIndex = 10 - ab;
          slide.style.opacity = ab > 2 ? 0 : 1;
          slide.style.filter = ab ? 'brightness(' + (ab === 1 ? 0.92 : 0.85) + ') saturate(.9)' : 'none';
          slide.style.pointerEvents = ab > 2 ? 'none' : 'auto';
          slide.tabIndex = ab === 0 ? 0 : -1;
          slide.classList.toggle('is-front', ab === 0);
          slide.setAttribute('aria-hidden', String(ab > 2));
          slide.setAttribute('aria-label', (ab === 0 ? 'Enlarge: ' : 'Show: ') + slide.getAttribute('data-title'));
        });
        Array.prototype.forEach.call(dots.children, function (d, i) { d.setAttribute('aria-current', String(i === cur)); });
        title.textContent = slides[cur].getAttribute('data-title');
        // The description is optional (Glassreview and Bluebox website captions are titles only)
        if (note) note.textContent = slides[cur].getAttribute('data-note') || '';
      }

      function go(i) {
        var hadFocus = track.contains(document.activeElement) && document.activeElement !== track;
        cur = (i + n) % n;
        layout();
        if (hadFocus) slides[cur].focus({ preventScroll: true });
      }

      cf.querySelectorAll('[data-go]').forEach(function (b) {
        b.addEventListener('click', function () { go(cur + Number(b.getAttribute('data-go'))); });
      });
      track.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      });

      // Swipe: a horizontal drag of 40px or more changes the screen (vertical scrolling is left alone).
      var startX = null;
      track.addEventListener('pointerdown', function (e) { if (e.isPrimary) startX = e.clientX; });
      track.addEventListener('pointerup', function (e) {
        if (startX !== null && Math.abs(e.clientX - startX) > 40) {
          swiped = true;
          go(cur + (e.clientX < startX ? 1 : -1));
          setTimeout(function () { swiped = false; }, 0);
        }
        startX = null;
      });
      track.addEventListener('pointercancel', function () { startX = null; });

      layout();
    });
  }

  /* ---------- Process line illustration (Blue Box and Urban Dental) ---------- */

  // One continuous 3px line through five step points in a 1000 x 220 box (line at y = 110), shown trimmed to y 24-200 where the shapes are.
  // Points sit at x = 230, 410, 580, 750, 910 so the opening tangle has room. Each step's character
  // is the segment leading into its point: Discover a large tangle of overlapping loops across the
  // line; Define four curves that fan out from the Discover point, are widest a third of the way along and close into the Define point; Ideate a
  // split into one curve swinging up and one swinging down that rejoin before the point; Design one
  // smooth wave; Test a straight run ending in an open arrowhead at the last point.
  // del and dur (seconds) draw the segments in order over about 1.6s.
  var PROCESS_POINTS = [230, 410, 580, 750, 910];
  var PROCESS_SEGMENTS = [
    { del: 0, dur: 0.5, paths: [
      'M0 110 L26 110 C42 110 48 52 92 42 C138 32 170 72 158 112 C146 154 92 178 66 148 C40 118 74 74 120 72 C168 70 204 106 190 146 C176 186 122 190 108 162 C94 134 126 94 166 92 C202 90 214 110 230 110'
    ] },
    { del: 0.5, dur: 0.3, paths: [
      'M230 110 L410 110',
      'M230 110 C255 77 305 77 410 110',
      'M230 110 C255 143 305 143 410 110',
      'M230 110 C255 43 305 43 410 110',
      'M230 110 C255 177 305 177 410 110'
    ] },
    { del: 0.8, dur: 0.3, paths: [
      'M410 110 C440 110 452 52 496 52 C540 52 540 110 560 110 L580 110',
      'M410 110 C430 110 444 168 494 168 C536 168 548 110 560 110'
    ] },
    { del: 1.1, dur: 0.25, paths: [
      'M580 110 C628 46 702 174 750 110'
    ] },
    { del: 1.35, dur: 0.25, paths: [
      'M750 110 L910 110',
      'head:M888 94 L910 110 L888 126'
    ] }
  ];
  var PROCESS_DOT_TIMES = [0.5, 0.8, 1.1, 1.35, 1.6];

  function processSVG(vertical, label) {
    var shapes = '';
    PROCESS_SEGMENTS.forEach(function (seg) {
      seg.paths.forEach(function (p) {
        var head = p.indexOf('head:') === 0;
        var d = head ? p.slice(5) : p;
        var del = head ? seg.del + seg.dur - 0.08 : seg.del;
        var dur = head ? 0.12 : seg.dur;
        shapes += '<path class="pl-seg" pathLength="1" d="' + d + '" style="--del:' + del + 's;--dur:' + dur + 's"></path>';
      });
    });
    PROCESS_POINTS.forEach(function (x, i) {
      shapes += '<circle class="pl-dot" cx="' + x + '" cy="110" r="5" style="--del:' + PROCESS_DOT_TIMES[i] + 's"></circle>';
    });
    // The vertical version turns the same drawing a quarter turn so the line runs downwards.
    var g = vertical ? '<g transform="translate(220 0) rotate(90)">' + shapes + '</g>' : shapes;
    return '<svg class="process-line__art process-line__art--' + (vertical ? 'v' : 'h') + '" viewBox="' +
      (vertical ? '20 0 176 1000' : '0 24 1000 176') + '" role="img" aria-label="' + label + '" focusable="false">' + g + '</svg>';
  }

  function setUpProcessLines() {
    var lines = document.querySelectorAll('[data-process-line]');
    if (!lines.length) return;
    var animate = !reduceMotion.matches && 'IntersectionObserver' in window;
    var observer = animate ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 }) : null;

    lines.forEach(function (line) {
      var names = Array.prototype.map.call(line.querySelectorAll('.process-line__name'), function (n) { return n.textContent; });
      var label = 'Process in ' + names.length + ' steps: ' + names.join(', ');
      line.insertAdjacentHTML('afterbegin', processSVG(false, label) + processSVG(true, label));

      // Keep the line 3px and the dots 10px on screen whatever size the drawing is shown at.
      var arts = line.querySelectorAll('.process-line__art');
      var size = function () {
        Array.prototype.forEach.call(arts, function (svg) {
          var w = svg.getBoundingClientRect().width;
          if (!w) return;
          var units = svg.classList.contains('process-line__art--v') ? 176 : 1000;
          var unit = units / w; // drawing units per screen pixel
          svg.style.setProperty('--pl-sw', (3 * unit).toFixed(3));
          Array.prototype.forEach.call(svg.querySelectorAll('.pl-dot'), function (dot) { dot.setAttribute('r', (5 * unit).toFixed(2)); });
        });
      };
      size();
      if ('ResizeObserver' in window) new ResizeObserver(size).observe(line);
      else window.addEventListener('resize', size);

      if (animate) {
        line.classList.add('is-armed');
        observer.observe(line);
      }
    });
  }

  /* ---------- Hero quick-guide chat (home page) ---------- */

  function setUpHeroChat() {
  var root = document.querySelector('[data-chatdemo]'); if (!root) return;
  var body = root.querySelector('.cd__body'), ask = root.querySelector('.cd__ask'), menu = root.querySelector('.cd__menu');
  var opts = Array.prototype.slice.call(root.querySelectorAll('.cd__opt'));
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GREET = "Hi! I'm a quick guide to Shiva's work. Tap the bar below to ask me something.";
  var A = [
    ['Enterprise web apps, mobile apps and AI chat assistants, from research through to launch.', 'See the work', '#work'],
    ['Start with the deployment portal at Accenture: a concept redesign with an AI chat assistant built in.', 'Open the case study', 'accenture.html'],
    ['Yes. It covers his experience, the products he has worked on and the tools he uses.', 'Open the resume (PDF)', 'assets/Shiva_Shanker_Bantu_Resume.pdf', true],
    ['Email is the best way: shiva.bantu8272@gmail.com', 'Get in touch', '#contact']
  ];
  var busy = true, greeted = false;
  function el(cls, txt) { var d = document.createElement('div'); d.className = cls; if (txt) d.textContent = txt; return d; }
  function type(node, text, done) {
    if (RM) { node.textContent = text; done(); return; }
    var i = 0; (function step() { i += 2; node.textContent = text.slice(0, i); if (i < text.length) setTimeout(step, 18); else done(); })();
  }
  function bot(text, cta) {
    var t = el('cd__msg cd__msg--bot'); t.innerHTML = '<span class="cd__typing"><i></i><i></i><i></i></span>'; body.appendChild(t);
    setTimeout(function () {
      type(t, text, function () {
        if (cta) { var a = document.createElement('a'); a.className = 'cd__cta'; a.href = cta[1]; if (cta[2]) { a.target = '_blank'; a.rel = 'noopener'; } a.textContent = cta[0] + ' \u2192'; body.appendChild(a); }
        busy = false; ask.disabled = false;
        if (!greeted) { greeted = true; ask.classList.add('is-nudge'); }
      });
    }, RM ? 0 : 650);
  }
  function openMenu() { menu.hidden = false; ask.setAttribute('aria-expanded', 'true'); ask.classList.remove('is-nudge'); opts[0].focus(); }
  function closeMenu(refocus) { if (menu.hidden) return; menu.hidden = true; ask.setAttribute('aria-expanded', 'false'); if (refocus) ask.focus(); }
  ask.addEventListener('click', function () { if (busy) return; menu.hidden ? openMenu() : closeMenu(); });
  opts.forEach(function (o, i) {
    o.addEventListener('click', function () {
      closeMenu(); busy = true; ask.disabled = true; o.classList.add('is-asked');
      body.innerHTML = ''; body.appendChild(el('cd__msg cd__msg--me', o.textContent));
      var a = A[+o.dataset.q]; bot(a[0], [a[1], a[2], a[3]]);
    });
    o.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i + opts.length - 1) % opts.length].focus(); }
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) closeMenu(); });
  ask.disabled = true;
  setTimeout(function () { bot(GREET); }, RM ? 0 : 700);
  }

  /* ---------- Blue Box tab viewer ---------- */

  function setUpTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (viewer) {
      var tabs = Array.prototype.slice.call(viewer.querySelectorAll('[role="tab"]'));
      var img = viewer.querySelector('[data-tab-image]');
      var note = viewer.querySelector('[data-tab-note]');
      // Optional: a number and title that change with the tab (Urban Dental)
      var num = viewer.querySelector('[data-tab-n]');
      var title = viewer.querySelector('[data-tab-title]');

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
        });
        img.src = tab.getAttribute('data-src');
        img.alt = tab.getAttribute('data-alt');
        img.width = +tab.getAttribute('data-w');
        img.height = +tab.getAttribute('data-h');
        img.setAttribute('aria-label', 'Enlarge image: ' + img.alt);
        note.textContent = tab.getAttribute('data-note');
        if (num) num.textContent = tab.getAttribute('data-n');
        if (title) title.textContent = tab.textContent;
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            select(next, true);
          }
        });
      });
    });
  }

  /* ---------- Accenture stepper ---------- */

  function setUpStepper() {
    document.querySelectorAll('[data-stepper]').forEach(function (stepper) {
      var steps = Array.prototype.slice.call(stepper.querySelectorAll('.step'));
      var kicker = stepper.querySelector('[data-step-kicker]');
      var label = stepper.querySelector('[data-step-label]');
      var note = stepper.querySelector('[data-step-note]');

      function select(index) {
        steps.forEach(function (s, i) {
          if (i === index) s.setAttribute('aria-current', 'step');
          else s.removeAttribute('aria-current');
          s.classList.toggle('is-passed', i <= index);
        });
        var s = steps[index];
        kicker.textContent = 'State ' + (index + 1) + ' of ' + steps.length;
        label.textContent = s.getAttribute('data-label');
        note.textContent = s.getAttribute('data-note');
      }

      steps.forEach(function (s, i) {
        s.addEventListener('click', function () { select(i); });
      });
    });
  }

  /* ---------- Sideways phone rows ---------- */

  // On phones, groups of app screens become a row that scrolls sideways (CSS).
  // While a row actually overflows, make it a focusable, labelled region so arrow keys can scroll it.
  function setUpCarousels() {
    var rows = document.querySelectorAll('[data-carousel]');
    if (!rows.length) return;
    function update() {
      rows.forEach(function (row) {
        if (row.scrollWidth > row.clientWidth + 1) {
          row.tabIndex = 0;
          row.setAttribute('role', 'region');
          row.setAttribute('aria-label', row.getAttribute('data-carousel') + ', scrolls sideways');
        } else {
          row.removeAttribute('tabindex');
          row.removeAttribute('role');
          row.removeAttribute('aria-label');
        }
      });
    }
    update();
    window.addEventListener('resize', update);
  }

  function init() {
    setUpHeader();
    setUpCarousels();
    setUpReveal();
    setUpLightbox();
    setUpCoverflow();
    setUpProcessLines();
    setUpHeroChat();
    setUpTabs();
    setUpStepper();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
