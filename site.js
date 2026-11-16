// C & J site behaviour: mobile menu, mobile action bar, ZIP check, inquiry steps.
// No framework; every feature degrades to working HTML without this file.
(function () {
  'use strict';

  // ZIP codes served.
  var ZIPS = {
    '76247': 'Northlake', '76226': 'Northlake and Argyle', '76262': 'Trophy Club, Roanoke and Northlake',
    '75022': 'Flower Mound', '75028': 'Flower Mound', '75077': 'Flower Mound and Highland Village',
    '76248': 'Keller', '76244': 'Keller and north Fort Worth', '76092': 'Southlake', '76034': 'Colleyville'
  };

  // Mobile menu
  var menuBtn = document.querySelector('[data-menu-btn]');
  var mobileNav = document.querySelector('[data-mobile-nav]');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = mobileNav.getAttribute('data-open') === 'true';
      mobileNav.setAttribute('data-open', String(!open));
      menuBtn.setAttribute('aria-expanded', String(!open));
    });
  }

  // Mobile action bar: shown once the hero actions scroll out of view.
  var bar = document.querySelector('[data-action-bar]');
  var heroActions = document.querySelector('[data-hero-actions]');
  if (bar) {
    if (heroActions && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        bar.setAttribute('data-show', String(!entries[0].isIntersecting));
      }).observe(heroActions);
    } else {
      bar.setAttribute('data-show', 'true');
    }
  }

  // ZIP check
  document.querySelectorAll('[data-zip-form]').forEach(function (form) {
    var input = form.querySelector('input');
    var out = form.querySelector('[data-zip-result]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var zip = (input.value || '').replace(/\D/g, '').slice(0, 5);
      if (zip.length !== 5) {
        out.setAttribute('data-state', 'no');
        out.innerHTML = '<span class="dot" aria-hidden="true"></span><span>Enter a 5-digit ZIP code.</span>';
        return;
      }
      var town = ZIPS[zip];
      if (town) {
        out.setAttribute('data-state', 'yes');
        out.innerHTML = '<span class="dot" aria-hidden="true"></span><span><strong>Yes, we work in ' + town + ' (' + zip + ').</strong> ' +
          '<a href="' + (form.getAttribute('data-contact') || '/contact/') + '?zip=' + zip + '">Request a consultation</a> and we will pick up from here.</span>';
      } else {
        out.setAttribute('data-state', 'no');
        out.innerHTML = '<span class="dot" aria-hidden="true"></span><span><strong>' + zip + ' is outside our usual area.</strong> ' +
          'Call us anyway and we will tell you honestly whether we can help.</span>';
      }
    });
  });

  // Inquiry: three steps, contact details last, ZIP carried over from the checker.
  var inq = document.querySelector('[data-inquiry]');
  if (inq) {
    var steps = Array.prototype.slice.call(inq.querySelectorAll('[data-step]'));
    var bar2 = inq.querySelector('[data-progress]');
    var label = inq.querySelector('[data-step-label]');
    var back = inq.querySelector('[data-back]');
    var next = inq.querySelector('[data-next]');
    var submit = inq.querySelector('[data-submit]');
    var err = inq.querySelector('[data-error]');
    var done = document.querySelector('[data-done]');
    var i = 0;
    var params = new URLSearchParams(location.search);
    var zipParam = params.get('zip');
    if (zipParam && /^\d{5}$/.test(zipParam)) { var z = inq.querySelector('#zip'); if (z) z.value = zipParam; }
    // Project picked on the homepage card (or a project link): preselect it.
    var projParam = params.get('project');
    var picked = false;
    if (projParam) {
      inq.querySelectorAll('input[name="project"]').forEach(function (r) { if (r.value === projParam) { r.checked = true; picked = true; } });
    }

    function show(n) {
      i = n;
      steps.forEach(function (s, k) { s.hidden = k !== n; });
      bar2.style.width = ((n + 1) / steps.length * 100) + '%';
      label.textContent = 'Step ' + (n + 1) + ' of ' + steps.length;
      back.hidden = n === 0;
      next.hidden = n === steps.length - 1;
      submit.hidden = n !== steps.length - 1;
      err.textContent = '';
      var first = steps[n].querySelector('legend, h2');
      if (first && n > 0) { first.setAttribute('tabindex', '-1'); first.focus(); }
    }
    function valid(n) {
      var fields = steps[n].querySelectorAll('[required]');
      for (var k = 0; k < fields.length; k++) {
        var f = fields[k];
        if (f.type === 'radio') {
          if (!steps[n].querySelector('input[name="' + f.name + '"]:checked')) { err.textContent = 'Choose one option to continue.'; return false; }
        } else if (!f.checkValidity()) {
          err.textContent = f.getAttribute('data-msg') || 'Please complete this field.';
          f.focus();
          return false;
        }
      }
      return true;
    }
    next.addEventListener('click', function () { if (valid(i)) show(i + 1); });
    back.addEventListener('click', function () { show(i - 1); });
    inq.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid(i)) return;
      // Sends the request to the form service.
      inq.hidden = true;
      if (done) { done.hidden = false; done.focus(); }
    });
    // Step 2: say plainly when a ZIP is outside the usual area (it can still be sent).
    var zipField = inq.querySelector('#zip'), zipNote = inq.querySelector('[data-zip-note]');
    var checkZip = function () {
      if (!zipField || !zipNote) return;
      var v = zipField.value.replace(/\D/g, '');
      zipNote.textContent = v.length === 5 && !ZIPS[v] ? v + ' is outside our usual area. Send the request anyway and we will tell you honestly whether we can help.' : '';
    };
    if (zipField) { zipField.addEventListener('input', checkZip); checkZip(); }
    // Both answers from the homepage card: open on step 2 so nothing is asked twice.
    show(picked && zipParam && /^\d{5}$/.test(zipParam) ? 1 : 0);
  }

  // Homepage v2: the consultation card answers "do you come to me?" as the ZIP is typed.
  var card = document.querySelector('[data-consult]');
  if (card) {
    var cz = card.querySelector('input[name="zip"]');
    var where = card.querySelector('[data-consult-where]');
    var whereText = card.querySelector('[data-consult-where-text]');
    var idle = whereText.textContent;
    cz.addEventListener('input', function () {
      var v = cz.value.replace(/\D/g, '').slice(0, 5);
      if (v !== cz.value) cz.value = v;
      if (v.length < 5) { where.setAttribute('data-state', 'idle'); whereText.textContent = idle; return; }
      if (ZIPS[v]) { where.setAttribute('data-state', 'yes'); whereText.textContent = 'Yes, we work in ' + ZIPS[v] + ' (' + v + ')'; }
      else { where.setAttribute('data-state', 'no'); whereText.textContent = v + ' is outside our usual area. Call and we will tell you honestly.'; }
    });
    whereText.setAttribute('aria-live', 'polite');
  }

  // Review rail arrows
  var rail = document.querySelector('[data-rail]');
  if (rail) {
    var step = function (dir) { var c = rail.querySelector('figure'); rail.scrollBy({ left: dir * (c ? c.offsetWidth + 20 : 300), behavior: 'smooth' }); };
    var p = document.querySelector('[data-rail-prev]'), n = document.querySelector('[data-rail-next]');
    if (p) p.addEventListener('click', function () { step(-1); });
    if (n) n.addEventListener('click', function () { step(1); });
  }

  // Announcement bar: dismiss for this visit
  var ann = document.querySelector('[data-announce]');
  if (ann) {
    var hide = function () { ann.remove(); document.body.classList.add('no-announce'); };
    try { if (sessionStorage.getItem('cj-announce') === 'off') hide(); } catch (e) {}
    var x = ann.querySelector('[data-announce-close]');
    if (x) x.addEventListener('click', function () { hide(); try { sessionStorage.setItem('cj-announce', 'off'); } catch (e) {} });
  }
})();

// Header: transparent over the hero photo, solid paper once the page scrolls.
(function () {
  var header = document.querySelector('.header');
  if (!header || document.body.classList.contains('page-inner')) return;
  var set = function () { header.classList.toggle('is-solid', window.scrollY > 60); };
  set();
  window.addEventListener('scroll', set, { passive: true });
  var btn = document.querySelector('[data-menu-btn]');
  if (btn) btn.addEventListener('click', function () { if (btn.getAttribute('aria-expanded') === 'true') header.classList.add('is-solid'); else set(); });
})();
