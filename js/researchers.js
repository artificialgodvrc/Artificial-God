/* =========================================================
   研究員紹介を researchers-data.js から組み立てる。
   ========================================================= */
(function () {
  var root = document.getElementById('researcher-list');
  if (!root) return;
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function person(p) {
    var h = '<article class="person">' +
      '<img class="photo" src="img/staff/' + p.photo + '.webp" alt="' + esc(p.name) + '" loading="lazy" width="281" height="500">' +
      '<div>' +
        '<h4>' + esc(p.name) + '</h4>' +
        '<div class="en">' + esc(p.en) + '</div>' +
        '<div class="role">' + esc(p.title) + '</div>';
    if (p.soon) {
      h += '<p class="comment">Coming soon</p>';
    } else {
      h += '<div class="chips">' + p.fields.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
        '<p class="comment' + (p.hiddenComment ? ' invisible-ink' : '') + '">' + esc(p.comment) + '</p>' +
        '<details><summary>経歴</summary><dl class="career">' +
          p.career.map(function (c) { return '<dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd>'; }).join('') +
        '</dl></details>' +
        '<div class="meta"><span>STAFF ID: ' + esc(p.id) + '</span><span>STATUS <b>ACTIVE</b></span></div>';
    }
    return h + '</div></article>';
  }
  function team(t) {
    return '<h3 class="team-name">' + esc(t.name) + '</h3>' +
      '<div class="staff">' + t.people.map(person).join('') + '</div>';
  }
  root.innerHTML = DEPARTMENTS.map(function (d) {
    var teams = d.row
      ? '<div class="team-row">' + d.teams.map(function (t) { return '<div>' + team(t) + '</div>'; }).join('') + '</div>'
      : d.teams.map(team).join('');
    return '<div class="dept' + (d.lone ? ' lone' : '') + '" style="--dept:' + d.color + '">' +
      (d.name ? '<h2 class="dept-name">' + esc(d.name) + '</h2>' : '') + teams + '</div>';
  }).join('');
})();
