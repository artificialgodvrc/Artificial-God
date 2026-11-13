/* =========================================================
   スクロールに合わせて、要所をふわっと浮き上がらせる。
   対象は下の TARGETS に並べたもの。動きを止めたいときは
   各ページの <script src="js/motion.js"> を消せばよい。
   ========================================================= */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var TARGETS = [
    '.sec-head', '.lead', '.quote', '.closed', '.works article', '.process figure', '.process .arrow',
    '.power', '.links a', '.flow li', '.rule', '.cards article', '.ban li', '.notices > div',
    '.two > div', 'table.spec', '.subject', '.person', '.dept-name', '.team-name', '.contact', '.intro p'
  ].join(',');

  var els = Array.prototype.slice.call(document.querySelectorAll(TARGETS));
  // 入れ子になっているもの(.two の中の表など)は外側だけ動かす
  els = els.filter(function (el) {
    return !els.some(function (other) { return other !== el && other.contains(el); });
  });

  els.forEach(function (el) {
    // 同じ親の中で並んでいるものは、少しずつ遅らせて順番に出す
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return els.indexOf(c) !== -1; });
    var i = sibs.indexOf(el);
    el.style.setProperty('--d', Math.min(i, 6) * 0.09 + 's');
    el.classList.add('rv');
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach(function (el) { io.observe(el); });
})();
