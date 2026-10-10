/* Движение. Без этого файла страница остаётся цельной: пять сцен идут обычными экранами. */
(function () {
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || !window.gsap || !window.ScrollTrigger) { root.classList.remove('js-wait'); return; }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  var clamp = gsap.utils.clamp(0, 1);
  var smooth = function (t) { t = clamp(t); return t * t * (3 - 2 * t); };

  /* Плавная прокрутка — один движок на сайт */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ anchors: true, lerp: 0.11 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ── Путь груза: всё на экране выводится из одной цифры — насколько прокручено ── */
  function route() {
    var track = document.querySelector('.route');
    var scenes = gsap.utils.toArray('[data-scene]');
    var N = scenes.length;
    if (!track || !N) return;
    var MOVE = 0.4; // доля шага, за которую следующий кадр выезжает поверх текущего
    var parts = scenes.map(function (s, k) {
      s.style.zIndex = k + 1;
      return { el: s, media: s.querySelector('.scene__media'), img: s.querySelector('img'), text: s.querySelector('.scene__text') };
    });
    var marks = gsap.utils.toArray('.rail li:not(.rail__line)');
    var fill = document.querySelector('.rail__line i');
    var seam = document.querySelector('.seam');
    track.style.setProperty('--scenes', N);
    root.classList.add('js-route');

    function reveal(u, k) { return k === 0 ? 1 : clamp((u - (k - MOVE)) / MOVE); }

    function draw(p) {
      var u = p * N;
      var here = Math.min(N - 1, Math.floor(u + MOVE * 0.55));
      for (var k = 0; k < N; k++) {
        var r = reveal(u, k), next = k < N - 1 ? reveal(u, k + 1) : 0;
        var on = r > 0 && next < 1;
        parts[k].el.classList.toggle('is-on', on);
        parts[k].el.toggleAttribute('inert', !on || k !== here);
        if (!on) continue;
        var e = smooth(r);
        var dwell = clamp(u - k + MOVE);                       // сколько кадр уже «прожил»
        parts[k].el.style.clipPath = r < 1 ? 'inset(0 0 0 ' + ((1 - e) * 100).toFixed(2) + '%)' : 'none'; // кромка открывает и фото, и текст
        parts[k].img.style.transform = 'translate3d(' + ((1 - e) * 9).toFixed(2) + '%,0,0) scale(' + (1.14 - dwell * 0.07).toFixed(4) + ')';
        // Текст стоит на месте: кромка сама «переписывает» одно слово в другое
      }
      marks.forEach(function (m, k) { m.classList.toggle('is-here', k === here); });
      if (seam) {
        var kk = Math.min(N - 1, Math.floor(u + MOVE)), rr = kk > 0 ? reveal(u, kk) : 1;
        seam.style.opacity = rr > 0 && rr < 1 ? 1 : 0;
        seam.style.transform = 'translate3d(' + ((1 - smooth(rr)) * innerWidth).toFixed(1) + 'px,0,0)';
      }
      if (fill) fill.style.transform = 'scaleX(' + clamp((u + MOVE * 0.2) / N).toFixed(4) + ')';
    }

    ScrollTrigger.create({
      trigger: track, start: 'top top', end: 'bottom bottom',
      onUpdate: function (st) { draw(st.progress); },
      onRefresh: function (st) { draw(st.progress); }
    });
    draw(0);
  }

  /* ── Первый экран ── */
  function hero() {
    var title = document.querySelector('.hero__title');
    var img = document.querySelector('.hero__media img');
    var rest = gsap.utils.toArray('.hero__kicker, .hero__foot, .hero__scroll, .top');
    gsap.set(rest, { autoAlpha: 0, y: 14 });
    gsap.fromTo(img, { scale: 1.22 }, { scale: 1.04, duration: 2.6, ease: 'expo.out' });
    SplitText.create(title, {
      type: 'lines', mask: 'lines', linesClass: 'l', autoSplit: true,
      onSplit: function (self) {
        root.classList.remove('js-wait');
        return gsap.from(self.lines, { yPercent: 108, duration: 1.25, ease: 'expo.out', stagger: 0.11, delay: 0.15 });
      }
    });
    gsap.to(rest, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.85 });

    gsap.to('.hero__media', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__body', { y: -70, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 25%', scrub: true } });
  }

  /* ── Главная мысль: слова проявляются по мере чтения ── */
  function say() {
    var el = document.querySelector('[data-words]');
    if (!el) return;
    SplitText.create(el, {
      type: 'words', wordsClass: 'w', autoSplit: true, aria: 'auto',
      onSplit: function (self) {
        return gsap.to(self.words, { opacity: 1, ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 52%', scrub: true } });
      }
    });
  }

  /* ── Направления: строки появляются, фото идёт за курсором ── */
  function dirs() {
    gsap.from('.dirs__list li', { y: 28, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07,
      scrollTrigger: { trigger: '.dirs__list', start: 'top 82%' } });
    var peek = document.querySelector('.dirs__peek');
    var list = document.querySelector('.dirs__list');
    if (!peek || !list || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var pic = peek.querySelector('img');
    var toX = gsap.quickTo(peek, 'x', { duration: 0.5, ease: 'power3' });
    var toY = gsap.quickTo(peek, 'y', { duration: 0.5, ease: 'power3' });
    list.addEventListener('pointermove', function (e) { toX(e.clientX + 28); toY(e.clientY - peek.offsetHeight / 2); });
    list.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('pointerenter', function () {
        pic.src = a.dataset.img;
        gsap.to(peek, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
        gsap.fromTo(pic, { scale: 1.18 }, { scale: 1, duration: 0.7, ease: 'power3.out', overwrite: true });
      });
    });
    list.addEventListener('pointerleave', function () { gsap.to(peek, { autoAlpha: 0, scale: 0.94, duration: 0.25, overwrite: 'auto' }); });
  }

  /* ── Контакты ── */
  function contact() {
    var title = document.querySelector('.contact__title');
    gsap.fromTo('.contact__media img', { yPercent: -10, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    SplitText.create(title, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: function (self) {
        return gsap.from(self.lines, { yPercent: 108, duration: 1.1, ease: 'expo.out', stagger: 0.1,
          scrollTrigger: { trigger: title, start: 'top 82%' } });
      }
    });
    gsap.from('.contact__ways > *, .contact__note', { y: 22, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: '.contact__ways', start: 'top 90%' } });
  }

  /* ── Шапка: уходит при движении вниз, возвращается при движении вверх ── */
  function top() {
    var bar = document.querySelector('.top'), track = document.querySelector('.route');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (st) {
      var y = st.scroll();
      bar.classList.toggle('is-away', st.direction === 1 && y > innerHeight * 0.6);
      bar.classList.toggle('is-solid', track.getBoundingClientRect().bottom < innerHeight + 2);
    } });
    bar.addEventListener('focusin', function () { bar.classList.remove('is-away'); });
  }

  function start() {
    route(); hero(); say(); dirs(); contact(); top();
    ScrollTrigger.refresh();
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start, start);
  window.addEventListener('pageshow', function () { ScrollTrigger.refresh(); });
})();
