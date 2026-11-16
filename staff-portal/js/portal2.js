/* =========================================================
   職員用ポータル 第2版(端末風)・複数ページ版。
   ・index.html で認証 → 復号した中身をこのタブの中だけに保存 → ほかのページはそれを読む
   ・ページ: home / notice / report / archive(文書アーカイブ=検索) / document(文書の表示)
   ・認証コード自体はどこにも書かれていない・保存もしない
   演出の秒数などは、下の SETTINGS で変えられる。
   ========================================================= */
(function () {
  var SETTINGS = {
    alertAfterSec: null,      // 異常検知の警告を出すまでの秒数。使うときは 13 * 60 にする(null で無効)
    bootLineMs: 70,            // 起動ログ1行ごとの間隔(ミリ秒)
    // 実施予定:第一回の日付(西暦)から隔週で数えて、次の1回だけを出す。第一回=2026年10月7日
    firstSession: [2026, 10, 7],
    intervalDays: 14,
    sessionTime: '22:00'
  };
  var K_DATA = 'ag-portal-data', K_START = 'ag-portal-start', K_ALERT = 'ag-portal-alerted';
  var page = document.body.getAttribute('data-page');
  var app = document.getElementById('app');
  var data = null;

  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function drop(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  function revoked() { try { return localStorage.getItem('ag-revoked') === '1'; } catch (e) { return false; } }
  function forget() { drop(K_DATA); drop(K_START); drop(K_ALERT); }

  /* ---------- 復号(認証ページだけ) ---------- */
  function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function norm(s) { return String(s).normalize('NFKC').trim().toLowerCase(); }
  function decrypt(code) {
    var d = PORTAL_DATA;
    return crypto.subtle.importKey('raw', new TextEncoder().encode(norm(code)), 'PBKDF2', false, ['deriveKey'])
      .then(function (k) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(d.salt), iterations: d.iter, hash: 'SHA-256' },
          k, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(d.iv) }, key, b64(d.ct)); })
      .then(function (buf) { return new TextDecoder().decode(buf); });
  }

  /* ---------- 認証ページ ---------- */
  if (page === 'gate') {
    var gate = document.getElementById('gate'), log = document.getElementById('gate-log'), input = document.getElementById('pw');
    var failures = 0, say = function (lines, done) {
      var i = 0;
      (function next() {
        if (i >= lines.length) { if (done) done(); return; }
        var l = lines[i++], p = document.createElement('div');
        p.className = l[0]; p.textContent = l[1]; log.appendChild(p);
        setTimeout(next, l[2] || SETTINGS.bootLineMs);
      })();
    };
    if (/[?&]reset=1/.test(location.search)) { try { localStorage.removeItem('ag-revoked'); } catch (e) {} forget(); }   // 確認用:無効化を解除
    if (revoked()) forget();
    if (load(K_DATA)) { location.replace('home'); return; }   // すでに認証済みならそのままホームへ
    document.getElementById('gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input.value) return;
      if (!window.crypto || !crypto.subtle) { log.textContent = '> この端末では認証できません。'; return; }
      var btn = gate.querySelector('button');
      input.disabled = true; btn.disabled = true; log.textContent = '';
      var t0 = Date.now(), wait = 2500;   // 「...」がゆっくり増える時間。この間は照合の結果を見せない
      var l1 = document.createElement('div'); l1.className = 'wn'; l1.textContent = '> 認証コードを受信しました。'; log.appendChild(l1);
      var l2 = document.createElement('div'); l2.className = 'wn'; l2.textContent = '> 職員データベースと照合中 '; log.appendChild(l2);
      var dots = 0, dt = setInterval(function () { if (dots < 8) { l2.textContent += '.'; dots++; } else clearInterval(dt); }, 300);
      var hold = function (ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, (ms || wait) - (Date.now() - t0))); }); };   // 失敗は早めに返す
      if (revoked()) {   // 最終ページを見た端末は、もう入れない
        hold().then(function () {
          clearInterval(dt); log.textContent = '';
          say([['ng', '[FAIL] このアカウントは無効化されました'], ['ng', '> 理由:不正アクセス事案への関与'], ['wn', '> 次回特別対話実験への参加をお待ちしています。']]);
          input.value = ''; input.disabled = false; btn.disabled = false;
        });
        return;
      }
      decrypt(input.value).then(function (text) { return hold().then(function () { return text; }); }, function (err) { return hold(1300).then(function () { throw err; }); }).then(function (text) {
        var d = JSON.parse(text);
        store(K_DATA, text); store(K_START, String(Date.now())); drop(K_ALERT);
        say([
          ['ok', '[ OK ] 職員認証            照合完了'],
          ['lv', '[ -- ] 権限レベル          LV.4 SECRET'],
          ['ok', '[ OK ] 記録保管サーバ      接続'],
          ['ok', '[ OK ] 文書インデックス    ' + d.docs.length + ' 件'],
          ['wn', '[WARN] 本端末の情報の持ち出しは禁止されています'],
          ['hi', '> ようこそ。']
        ], function () { setTimeout(function () { location.href = 'home'; }, 700); });
      }).catch(function () {
        failures++;
        input.disabled = false; btn.disabled = false; input.value = ''; input.focus();
        var lines = [['ng', '[FAIL] 認証に失敗しました (' + failures + ')']];
        if (failures >= 3) lines.push(['ng', '> この試行は記録されました。'], ['wn', '> 端末情報を保存しています...']);   // 表示のみ。実際には何も記録しない
        log.textContent = ''; say(lines);
      });
    });
    input.focus();
    return;
  }

  /* ---------- ここから認証後のページ ---------- */
  if (revoked()) { forget(); location.replace('./'); return; }
  var raw = load(K_DATA);
  if (!raw) { location.replace('./'); return; }       // 認証を通っていなければ入口へ
  try { data = JSON.parse(raw); } catch (e) { forget(); location.replace('./'); return; }

  var started = +load(K_START) || Date.now();
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    if (window.AG_FREEZE) return;
    var now = new Date(), sec = Math.floor((Date.now() - started) / 1000);
    var c = document.getElementById('clock');
    if (c) c.textContent = (now.getFullYear() + 5143) + '.' + two(now.getMonth() + 1) + '.' + two(now.getDate()) + ' ' + two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds());
    var s = document.getElementById('session');
    if (s) s.textContent = two(Math.floor(sec / 3600)) + ':' + two(Math.floor(sec / 60) % 60) + ':' + two(sec % 60);
    if (SETTINGS.alertAfterSec && !load(K_ALERT) && sec >= SETTINGS.alertAfterSec) { store(K_ALERT, '1'); alarm(); }
  }
  function alarm() {
    var a = document.createElement('div');
    a.className = 'alert'; a.setAttribute('role', 'alert');
    a.textContent = 'ALERT : 実験体区域監視にて異常を検知しました';
    document.body.appendChild(a);
    var st = document.querySelector('[data-sys="実験体区域監視"]');
    if (st) { st.textContent = '異常'; st.className = 'ng'; }
    setTimeout(function () {
      a.remove();
      var st2 = document.querySelector('[data-sys="実験体区域監視"]');
      if (st2) { st2.textContent = '正常'; st2.className = ''; }
    }, 4500);
  }

  /* ---------- 共通の部品 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function docById(id) { for (var i = 0; i < data.docs.length; i++) if (data.docs[i].id === id) return data.docs[i]; return null; }
  function byCat(cats) { return data.docs.filter(function (d) { return cats.indexOf(d.cat) !== -1; }); }
  function firstOf(cat) { return data.docs.filter(function (d) { return d.cat === cat; })[0]; }
  var FILE = { '通達': 'notice', '報告': 'notice', '実験記録': 'report', '概要': 'document', '規定': 'document' };
  function pathOf(d) { return '/archive/' + FILE[d.cat] + '/' + d.id + '.doc'; }
  function shortTitle(d) { return d.cat === '実験記録' ? '実験記録報告書 ' + d.date : d.title; }
  function docHref(d, q) { return 'document?id=' + encodeURIComponent(d.id) + (q ? '&q=' + encodeURIComponent(q) : ''); }

  function table(docs, withSnip, q) {
    if (!docs.length) return '<p class="empty">-- 該当なし --</p>';
    return '<table class="tbl"><tr><th>DATE</th><th>ID</th><th>TYPE</th><th>TITLE</th></tr>' +
      docs.map(function (d) {
        return '<tr class="row"><td class="n">' + (d.date || '----.--.--') + '</td><td class="n">' + (d.docid || '-') + '</td><td class="n">' + d.cat +
          '</td><td class="t"><a href="' + docHref(d, q) + '">' + esc(shortTitle(d)) + '</a></td></tr>' +
          (withSnip && d._snip ? '<tr><td></td><td colspan="3" class="snip">' + d._snip + '</td></tr>' : '');
      }).join('') + '</table>';
  }

  var q0 = new URLSearchParams(location.search).get('q') || '';
  /* 上のメニュー。1項目=1ページ。 */
  function frame(cur, inner) {
    var ov = firstOf('概要'), rg = firstOf('規定');
    function a(key, href, label) { return '<a href="' + href + '"' + (cur === key ? ' aria-current="page"' : '') + '>[' + label + ']</a>'; }
    return '<div class="wrap"><header class="top"><a href="home">Artificial God. / STAFF PORTAL</a><span class="lv">ACCESS LEVEL :4 SECRET</span></header>' +
      '<nav class="menu" aria-label="メニュー">' +
        a('home', 'home', 'ホーム') + a('notice', 'notice', '通達') + a('report', 'report', '実験記録') +
        (ov ? a('doc-' + ov.id, docHref(ov), '対話実験概要') : '') + (rg ? a('doc-' + rg.id, docHref(rg), '施設規定') : '') +
        a('archive', 'archive', '文書アーカイブ') +
        '<button type="button" class="lock" data-denied="subject">[実験体情報]</button>' +
        '<button type="button" class="lock" data-denied="system">[システム管理]</button>' +
        '<button type="button" data-logout>[ログアウト]</button></nav>' +
      '<form class="gsearch" id="gsearch" action="archive" method="get" role="search"><label for="gq">文書検索 &gt;</label>' +
        '<input id="gq" name="q" type="search" value="' + esc(q0) + '" placeholder="調べたい言葉を入力して Enter" autocomplete="off" spellcheck="false">' +
        '<button type="submit">[検索]</button></form>' +
      '<main id="view">' + inner + '</main>' +
      '<footer class="foot"><div>最終更新: ' + data.home.updated + '　/　宗暦 <time id="clock"></time>　/　SESSION <span id="session">00:00:00</span></div>' +
      '<p class="warn">本ページに掲載された情報の持ち出しを禁ずる。</p></footer></div>';
  }

  /* 道しるべ(どのページからもホームへ戻れる) */
  function crumbs(parts) {
    return '<p class="crumbs"><a href="home">ホーム</a> / ' + parts.join(' / ') + '</p>';
  }

  /* 次の対話実験(今日以降でいちばん近い回) */
  function kanji(n) {
    var d = '〇一二三四五六七八九';
    if (n < 10) return d[n];
    return (n >= 20 ? d[Math.floor(n / 10)] : '') + '十' + (n % 10 ? d[n % 10] : '');
  }
  function nextSession() {
    var f = SETTINGS.firstSession, t = SETTINGS.sessionTime.split(':');
    var d = new Date(f[0], f[1] - 1, f[2], +t[0], +t[1]), now = new Date(), n = 1;
    while (d < now) { d.setDate(d.getDate() + SETTINGS.intervalDays); n++; }
    return { date: (d.getFullYear() + 5143) + '.' + two(d.getMonth() + 1) + '.' + two(d.getDate()), name: '第' + kanji(n) + '回対話実験' };
  }

  /* ---------- 各ページの中身 ---------- */
  function viewHome() {
    var h = data.home;
    return '<h2 class="h">SYSTEM INFOMATION</h2><div class="sysg">' +
        h.system.map(function (s) { return '<div><span>' + s + '</span><b data-sys="' + s + '">正常</b></div>'; }).join('') + '</div>' +
      '<h2 class="h">NOTICE</h2>' + table(byCat(['通達', '報告'])) +
      '<p class="more"><a href="notice">通達の一覧へ &gt;</a></p>' +
      '<h2 class="h">SCHEDULE</h2>' +
        [nextSession()].map(function (s) {
          return '<div class="sched"><p class="sched-t"><span class="n">' + s.date + '</span>' + s.name + '</p><dl>' +
            h.schedule_detail.map(function (x) {
              return '<dt>' + x[0] + '</dt><dd>' + (x[0] === '時間' ? SETTINGS.sessionTime : x[1]) + '</dd>';
            }).join('') + '</dl></div>';
        }).join('') +
      '<p class="more"><a href="archive">文書アーカイブを開く &gt;</a></p>';
  }
  function viewList(title, label, cats, lead) {
    return crumbs([label]) + '<h2 class="h">' + title + '</h2>' + (lead ? '<p style="margin-bottom:14px">' + lead + '</p>' : '') + table(byCat(cats));
  }
  function viewDoc(d, q) {
    var same = data.docs.filter(function (x) { return FILE[x.cat] === FILE[d.cat]; });
    var k = same.indexOf(d), prev = same[k - 1], next = same[k + 1];
    var sec = { notice: ['notice', '通達'], report: ['report', '実験記録'] }[FILE[d.cat]];
    var parts = [];
    if (sec) parts.push('<a href="' + sec[0] + '">' + sec[1] + '</a>');
    parts.push(esc(shortTitle(d)).slice(0, 24));
    return crumbs(parts) + '<p class="path">' + pathOf(d) + '</p>' +
      '<dl class="dhead">' +
        '<dt>TITLE</dt><dd class="title">' + esc(d.title) + '</dd>' +
        '<dt>TYPE</dt><dd>' + d.cat + '</dd>' +
        (d.date ? '<dt>DATE</dt><dd>' + d.date + '</dd>' : '') +
        (d.docid ? '<dt>ID</dt><dd>' + d.docid + '</dd>' : '') +
        '<dt>ACCESS</dt><dd>LV.4 SECRET</dd>' +
      '</dl>' +
      '<div class="doc" id="doc">' + d.html.replace(/<table/g, '<div class="table-x"><table').replace(/<\/table>/g, '</table></div>') + '</div>' +
      '<div class="nav2"><span>' + (prev ? '<a href="' + docHref(prev) + '">&lt; ' + esc(shortTitle(prev)).slice(0, 18) + '</a>' : '') + '</span>' +
        '<span>' + (next ? '<a href="' + docHref(next) + '">' + esc(shortTitle(next)).slice(0, 18) + ' &gt;</a>' : '') + '</span></div>' +
      '<p class="more"><a href="archive' + (q ? '?q=' + encodeURIComponent(q) : '') + '">&lt; 文書アーカイブへ戻る</a></p>';
  }

  /* 検索:1文字ずつ変換し、文字数が変わる変換はしない(一致位置がずれないように) */
  function fold(s) {
    return Array.from(String(s)).map(function (c) {
      var n = c.normalize('NFKC');
      if (n.length !== c.length) n = c;
      n = n.toLowerCase();
      if (n.length !== c.length) n = c;
      return n.replace(/[ァ-ヶ]/, function (k) { return String.fromCharCode(k.charCodeAt(0) - 0x60); });
    }).join('');
  }
  function prep(d) {
    if (!d._t) { var t = document.createElement('div'); t.innerHTML = d.html.replace(/</g, ' <'); d._t = (d.title + ' ' + (d.docid || '') + ' ' + d.date + ' ' + t.textContent).replace(/\s+/g, ' '); d._f = fold(d._t); }
    return d;
  }
  function search(q) {
    var f = fold(q).trim();
    var docs = data.docs.map(prep);
    if (!f) { docs.forEach(function (d) { d._snip = ''; }); return { info: '> ' + docs.length + ' 件のファイル', docs: docs }; }
    var hits = docs.filter(function (d) { return d._f.indexOf(f) !== -1; });
    hits.forEach(function (d) {
      var i = d._f.indexOf(f), s = Math.max(0, i - 28), e = Math.min(d._t.length, i + f.length + 44);
      d._snip = (s > 0 ? '…' : '') + esc(d._t.slice(s, i)) + '<mark>' + esc(d._t.slice(i, i + f.length)) + '</mark>' + esc(d._t.slice(i + f.length, e)) + (e < d._t.length ? '…' : '');
    });
    return { info: hits.length ? '> ' + hits.length + ' 件が一致' : '> 一致するファイルはありません', docs: hits };
  }
  function remember(k, v) { try { var a = JSON.parse(sessionStorage.getItem(k) || '[]'); if (a.indexOf(v) === -1) { a.push(v); sessionStorage.setItem(k, JSON.stringify(a.slice(-8))); } } catch (e) {} }
  function viewArchive(q) {
    var r = search(q), t = fold(q).trim();
    if (t) remember('ag-search-log', q.trim());
    return crumbs(['文書アーカイブ']) + '<h2 class="h">' + (t ? 'SEARCH RESULT' : 'DOCUMENT ARCHIVE') + '</h2>' +
      (t ? '<p class="lead">「' + esc(q.trim()) + '」の検索結果</p>' : '<p class="lead">保管されている文書の一覧です。上の検索欄に言葉を入力して、Enter で検索できます。</p>') +
      '<p class="hitinfo">' + r.info + '</p>' + table(r.docs, true, q);
  }

  /* 文書ページで、検索した言葉に印を付ける */
  function highlight(q) {
    var f = fold(q).trim(), root = document.getElementById('doc');
    if (!f || !root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue, ft = fold(text), i = ft.indexOf(f);
      if (i === -1) return;
      var frag = document.createDocumentFragment(), pos = 0;
      while (i !== -1) {
        frag.appendChild(document.createTextNode(text.slice(pos, i)));
        var m = document.createElement('mark'); m.textContent = text.slice(i, i + f.length); frag.appendChild(m);
        pos = i + f.length; i = ft.indexOf(f, pos);
      }
      frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
    var first = root.querySelector('mark');
    if (first) first.scrollIntoView({ block: 'center' });
  }

  /* ---------- 描画 ---------- */
  var params = new URLSearchParams(location.search), cur = page, inner, d = null, q = params.get('q') || '';
  if (page === 'document') {
    d = docById(params.get('id') || '');
    if (d) { cur = 'doc-' + d.id; inner = viewDoc(d, q); remember('ag-opened', d.id); }
    else inner = crumbs(['文書']) + '<p class="empty">-- 該当する文書がありません --</p>';
  } else if (page === 'notice') inner = viewList('NOTICE', '通達', ['通達', '報告']);
  else if (page === 'report') inner = viewList('REPORT', '実験記録', ['実験記録'], '実験終了後すみやかに報告書を作成し、情報漏洩に細心の注意を払って提出すること。');
  else if (page === 'archive') inner = viewArchive(q);
  else if (page === 'final') inner = '<div id="final-root"></div>';
  else inner = viewHome();

  var denied = '';
  try { denied = sessionStorage.getItem('ag-denied') || ''; sessionStorage.removeItem('ag-denied'); } catch (e) {}
  if (denied) inner = '<div class="denied">ACCESS DENIED : ' + ({ subject: '実験体情報', system: 'システム管理' }[denied] || '') + '<span>権限レベルが不足しています(要求 LV.5 / 現在 LV.4)。</span></div>' + inner;

  app.innerHTML = frame(cur, inner);
  app.hidden = false;
  tick(); setInterval(tick, 1000);
  if (page === 'document' && q) highlight(q);

  app.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-denied')) { try { sessionStorage.setItem('ag-denied', t.getAttribute('data-denied')); } catch (er) {} location.reload(); }
    else if (t.hasAttribute('data-logout')) { forget(); location.href = './'; }
  });
})();
