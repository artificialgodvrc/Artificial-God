/* =========================================================
   実験体の一覧と個別ページを、subjects-data.js から組み立てる。
   ========================================================= */
(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // ■■■□□ のバーを作る
  function bar(n) {
    if (n === null || n === undefined) return '<span class="bar"><i>□□□□□</i></span>';
    var on = '', off = '';
    for (var i = 0; i < 5; i++) { if (i < n) on += '■'; else off += '□'; }
    return '<span class="bar" aria-label="5段階中' + n + '">' + on + '<i>' + off + '</i></span>';
  }
  function nameHtml(s) {
    return s.ruby ? '<ruby>' + esc(s.name) + '<rt>' + esc(s.ruby) + '</rt></ruby>' : esc(s.name);
  }

  /* ---------- 一覧(subject.html) ---------- */
  var list = document.getElementById('subject-list');
  if (list) {
    var html = '';
    SUBJECTS.forEach(function (s) {
      if (s.listed === false) return;
      html += '<a class="subject" href="subject-' + s.entry + '.html">' +
        '<span class="entry-no">' + s.entry + '</span>' +
        '<img class="face" src="img/subject/' + s.img + '.webp" alt="' + esc(s.name) + '" loading="lazy" width="420" height="598">' +
        '<div class="body">' +
          '<span class="code">' + esc(s.code) + '</span><h3>' + nameHtml(s) + '</h3>' +
          '<dl><dt>TYPE</dt><dd>' + esc(s.type) + '</dd>' +
          '<dt>DG.L</dt><dd>' + bar(s.dgl) + '</dd>' +
          '<dt>S.R</dt><dd>' + bar(s.sr) + '</dd>' +
          '<dt>STATUS</dt><dd class="st-active">ACTIVE</dd></dl>' +
          '<span class="more">View more &gt;&gt;</span>' +
        '</div></a>';
    });
    // 「追加予定」の枠は一番最後に出す
    if (SUBJECT_PLACEHOLDER) {
      var p = SUBJECT_PLACEHOLDER;
      html += '<div class="subject">' +
        '<div class="blank" aria-hidden="true">?</div>' +
        '<div class="body">' +
          '<span class="code">' + esc(p.code) + '</span><h3>' + esc(p.name) + '</h3>' +
          '<dl><dt>TYPE</dt><dd>' + esc(p.type) + '</dd>' +
          '<dt>DG.L</dt><dd>' + bar(null) + '</dd>' +
          '<dt>S.R</dt><dd>' + bar(null) + '</dd>' +
          '<dt>STATUS</dt><dd>—</dd></dl>' +
        '</div></div>';
    }
    list.innerHTML = html;
  }

  /* ---------- 個別ページ(subject-XXX.html) ---------- */
  var detail = document.getElementById('subject-detail');
  if (detail) {
    var entry = document.body.getAttribute('data-entry');
    var s = null, idx = -1;
    SUBJECTS.forEach(function (x, i) { if (x.entry === entry) { s = x; idx = i; } });

    if (!s) {
      detail.innerHTML = '<div class="wrap notfound"><h1>NO RECORD</h1>' +
        '<p>該当する実験体は登録されていません。</p>' +
        '<p><a href="subject.html">&lt;&lt; 実験体紹介へ戻る</a></p></div>';
      return;
    }
    document.title = (s.secret ? s.code : s.name) + ' | Artificial God.';

    // 前後の個体(一覧に出ない個体は飛ばす)
    function neighbor(step) {
      for (var i = idx + step; i >= 0 && i < SUBJECTS.length; i += step) {
        if (SUBJECTS[i].listed !== false) return SUBJECTS[i];
      }
      return null;
    }
    var prev = neighbor(-1), next = neighbor(1);
    var card = s.card || s.img;

    var side;
    if (s.secret) {
      side = '<dl><dt>ENTRY</dt><dd>' + s.entry + '</dd><dt>STATUS</dt><dd>—</dd></dl>';
    } else {
      side =
        '<dl>' +
          '<dt>通称</dt><dd>' + esc(s.alias) + '</dd>' +
          '<dt>TYPE</dt><dd>' + esc(s.type) + '</dd>' +
          '<dt>DG.L</dt><dd>' + bar(s.dgl) + '</dd>' +
          '<dt>S.R</dt><dd>' + bar(s.sr) + '</dd>' +
          '<dt>STATUS</dt><dd class="st-active">ACTIVE</dd>' +
        '</dl>' +
        '<details><summary>個体票の内容を文字で読む</summary>' +
          '<p>' + esc(s.profile) + '</p>' +
          '<p>' + esc(s.comment) + '(記入:' + esc(s.sign) + ')</p>' +
        '</details>';
    }

    detail.innerHTML =
      '<div class="wrap">' +
        '<div class="db-head">' +
          '<p class="crumbs"><a href="subject.html">&lt;&lt; 実験体紹介</a></p>' +
          '<h1>SUBJECT DATABASE:' + esc(s.code) + '</h1>' +
          '<div class="db-meta">' +
            '<span>PUBLIC ENTRY: ' + s.entry + '</span>' +
            (s.secret ? '<span class="secret">ACCESS LEVEL:4 SECRET</span>' : '<span>ACCESS LEVEL:0 PUBLIC</span>') +
          '</div>' +
        '</div>' +
        '<div class="detail">' +
          '<img class="card-img" id="card-img" src="img/card/' + card + '.webp" alt="' +
            esc(s.secret ? '個体票 ' + s.code : s.name + 'の個体票') + '" width="905" height="1280">' +
          '<aside>' + side +
            '<div class="pager">' +
              (prev ? '<a href="subject-' + prev.entry + '.html">&lt;&lt; ' + prev.entry + '</a>' : '<span></span>') +
              (next ? '<a href="subject-' + next.entry + '.html">' + next.entry + ' &gt;&gt;</a>' : '<span></span>') +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>';

    /* 欠番ページの画像をクリックしたときの動作は、裏サイトを作るときにここへ足す。 */
  }
})();
