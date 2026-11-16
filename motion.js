// C & J motion pass: photo unveil, gallery lightbox, before/after slider, process line.
// Everything here is an enhancement: without this file the page shows every photo and step.
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Unveil
  var items = Array.prototype.slice.call(document.querySelectorAll('.unveil'));
  var onIn = [];
  // A clipped element never reports as intersecting, so this checks positions on scroll instead.
  if (reduce) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var pending = items.slice(), queued = false;
    var check = function () {
      queued = false;
      var h = window.innerHeight, w = window.innerWidth;
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < h * 0.9 && r.bottom > 0 && r.left < w && r.right > 0) {
          el.classList.add('is-in');
          onIn.forEach(function (fn) { fn(el); });
          return false;
        }
        return true;
      });
      if (!pending.length) { window.removeEventListener('scroll', ask, true); window.removeEventListener('resize', ask); }
    };
    var ask = function () { if (!queued) { queued = true; requestAnimationFrame(check); } };
    window.addEventListener('scroll', ask, { passive: true, capture: true });
    window.addEventListener('resize', ask);
    window.addEventListener('beforeprint', function () { pending.forEach(function (el) { el.classList.add('is-in'); }); });
    setTimeout(check, 0);
  }

  // Before / after
  document.querySelectorAll('[data-ba]').forEach(function (ba) {
    var range = ba.querySelector('[data-ba-range]');
    var set = function (v) { v = Math.max(0, Math.min(100, v)); ba.style.setProperty('--pos', v + '%'); return v; };
    var touched = false;
    range.addEventListener('input', function () { touched = true; set(+range.value); });
    var block = ba.parentNode;
    block.querySelectorAll('[data-ba-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        touched = true;
        var from = +range.value, to = +b.getAttribute('data-ba-set'), t0 = null;
        if (reduce) { range.value = set(to); return; }
        var step = function (t) { if (t0 === null) t0 = t; var k = Math.min(1, (t - t0) / 500); k = 1 - Math.pow(1 - k, 3); range.value = set(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    });
    // One gentle nudge when it first appears, so people see it moves.
    onIn.push(function (el) {
      if (el !== ba || reduce) return;
      var keys = [50, 66, 38, 50], dur = 1700, t0 = null;
      var step = function (t) {
        if (touched) return;
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur) * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(p)), f = p - i;
        f = f * f * (3 - 2 * f);
        range.value = set(keys[i] + (keys[i + 1] - keys[i]) * f);
        if (p < keys.length - 1) requestAnimationFrame(step);
      };
      setTimeout(function () { requestAnimationFrame(step); }, 900);
    });
  });

  // Lightbox
  var lb = document.querySelector('[data-lightbox]');
  var shots = Array.prototype.slice.call(document.querySelectorAll('[data-shot]'));
  if (lb && shots.length && typeof lb.showModal === 'function') {
    var img = lb.querySelector('[data-lb-img]'), title = lb.querySelector('[data-lb-title]'), count = lb.querySelector('[data-lb-count]');
    var cur = 0, opener = null;
    var show = function (n) {
      cur = (n + shots.length) % shots.length;
      var s = shots[cur];
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      img.src = s.getAttribute('data-full'); img.alt = s.getAttribute('data-alt') || '';
      title.textContent = s.getAttribute('data-title') || '';
      count.textContent = 'Photo ' + (cur + 1) + ' of ' + shots.length;
    };
    shots.forEach(function (s, n) { s.addEventListener('click', function () { opener = s; show(n); lb.showModal(); }); });
    lb.querySelector('[data-lb-close]').addEventListener('click', function () { lb.close(); });
    lb.querySelector('[data-lb-prev]').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('[data-lb-next]').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('close', function () { if (opener) opener.focus(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1); });
    var stage = lb.querySelector('.lightbox__stage'), x0 = null;
    stage.addEventListener('click', function (e) { if (e.target === stage) lb.close(); });
    stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 48) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  }

  // Process line
  var tl = document.querySelector('[data-timeline]');
  if (tl && !reduce) {
    var lis = Array.prototype.slice.call(tl.children), ticking = false;
    var paint = function () {
      ticking = false;
      var y = window.innerHeight * 0.62;
      lis.forEach(function (li) {
        var r = li.getBoundingClientRect();
        li.classList.toggle('is-on', r.top + 12 < y);
        var seg = (y - (r.top + 28)) / Math.max(1, r.height - 30);
        li.style.setProperty('--seg', Math.round(Math.max(0, Math.min(1, seg)) * 100) + '%');
      });
    };
    var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    paint();
  }
})();
