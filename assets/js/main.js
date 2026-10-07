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

  function setUpLightbox() {
    var images = document.querySelectorAll('img[data-zoom]');
    if (!images.length) return;

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

    function open(img) {
      opener = img;
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

  /* ---------- Blue Box tab viewer ---------- */

  function setUpTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (viewer) {
      var tabs = Array.prototype.slice.call(viewer.querySelectorAll('[role="tab"]'));
      var img = viewer.querySelector('[data-tab-image]');
      var note = viewer.querySelector('[data-tab-note]');

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
    setUpTabs();
    setUpStepper();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
