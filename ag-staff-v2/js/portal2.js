/* =========================================================
   職員用ポータル 第2版(端末風)。
   ・認証コードから鍵を作って js/portal-data.js を復号する(コード自体はどこにも書かれていない)
   ・認証に成功すると起動ログを流してから画面を出す
   ・(今は止めてある)接続してから13分たつと、一度だけ「異常検知」の警告を出す演出
   演出の秒数などは、下の SETTINGS で変えられる。
   ========================================================= */
(function () {
  var SETTINGS = {
    alertAfterSec: null,      // 異常検知の警告を出すまでの秒数。使うときは 13 * 60 にする(null で無効)
    bootLineMs: 140,          // 起動ログ1行ごとの間隔(ミリ秒)
    // 実施予定:第一回の日付(西暦)から隔週で数えて、次の1回だけを出す。
    // 表サイトのニュースは告知日で、実施はその翌週。第一回=2026年10月7日(宗暦7169.10.07)、第四回=11月18日。
    firstSession: [2026, 10, 7],
    intervalDays: 14,
    sessionTime: '22:00'
  };
  var KEY = 'ag-portal';
  var data = null, started = 0, failures = 0, alerted = false;
  var app = document.getElementById('app');
  var gate = document.getElementById('gate');
  var log = document.getElementById('gate-log');
  var input = document.getElementById('pw');

  /* ---------- 復号 ---------- */
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
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function remember(code) { try { sessionStorage.setItem(KEY, norm(code)); } catch (e) {} }
  function forget() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  /* ---------- 認証画面のログ表示 ---------- */
  function say(lines, done) {
    var i = 0;
    (function next() {
      if (i >= lines.length) { if (done) done(); return; }
      var l = lines[i++], p = document.createElement('div');
      p.className = l[0]; p.textContent = l[1];
      log.appendChild(p);
      setTimeout(next, SETTINGS.bootLineMs);
    })();
  }
  function enter(code, quick) {
    input.disabled = true; gate.querySelector('button').disabled = true;
    log.textContent = '';
    if (!quick) say([['', '> 照合中...']]);
    decrypt(code).then(function (d) {
      data = d; remember(code);
      var boot = [
        ['ok', '[ OK ] 職員認証            照合完了'],
        ['ok', '[ OK ] 記録保管サーバ      接続'],
        ['ok', '[ OK ] 文書インデックス    ' + d.docs.length + ' 件'],
        ['', '> ようこそ。']
      ];
      if (quick) open(); else say(boot, function () { setTimeout(open, 500); });
    }).catch(function () {
      forget();
      failures++;
      input.disabled = false; gate.querySelector('button').disabled = false; input.value = ''; input.focus();
      if (quick) { log.textContent = ''; return; }
      var lines = [['ng', '[FAIL] 認証に失敗しました (' + failures + ')']];
      // 3回以上失敗すると、記録されたかのような表示を足す(実際には何も記録しない)
      if (failures >= 3) lines.push(['ng', '> この試行は記録されました。'], ['', '> 端末情報を保存しています...']);
      log.textContent = ''; say(lines);
    });
  }
  function open() {
    gate.hidden = true; app.hidden = false;
    started = Date.now();
    route();
    setInterval(tick, 1000);
  }
  document.getElementById('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value) return;
    if (!window.crypto || !crypto.subtle) { log.textContent = '> この端末では認証できません。'; return; }
    enter(input.value, false);
  });
  try { var saved = sessionStorage.getItem(KEY); if (saved) enter(saved, true); } catch (e) {}
  input.focus();

  /* ---------- 時計・接続時間・異常検知 ---------- */
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var now = new Date(), sec = Math.floor((Date.now() - started) / 1000);
    var c = document.getElementById('clock');
    if (c) c.textContent = (now.getFullYear() + 5143) + '.' + two(now.getMonth() + 1) + '.' + two(now.getDate()) + ' ' + two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds());
    var s = document.getElementById('session');
    if (s) s.textContent = two(Math.floor(sec / 3600)) + ':' + two(Math.floor(sec / 60) % 60) + ':' + two(sec % 60);
    if (SETTINGS.alertAfterSec && !alerted && sec >= SETTINGS.alertAfterSec) { alerted = true; alarm(); }
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

  /* ---------- 画面の組み立て ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function docById(id) { for (var i = 0; i < data.docs.length; i++) if (data.docs[i].id === id) return data.docs[i]; return null; }
  function byCat(cats) { return data.docs.filter(function (d) { return cats.indexOf(d.cat) !== -1; }); }
  var FILE = { '通達': 'notice', '報告': 'notice', '実験記録': 'report', '概要': 'document', '規定': 'document' };
  function pathOf(d) { return '/archive/' + FILE[d.cat] + '/' + d.id + '.doc'; }
  function shortTitle(d) { return d.cat === '実験記録' ? '実験記録報告書 ' + d.date : d.title; }

  function table(docs, withSnip) {
    if (!docs.length) return '<p class="empty">-- 該当なし --</p>';
    return '<table class="tbl"><tr><th>DATE</th><th>ID</th><th>TYPE</th><th>TITLE</th></tr>' +
      docs.map(function (d) {
        return '<tr class="row"><td class="n">' + (d.date || '----.--.--') + '</td><td class="n">' + (d.docid || '-') + '</td><td class="n">' + d.cat +
          '</td><td class="t"><a href="#doc-' + d.id + '">' + esc(shortTitle(d)) + '</a></td></tr>' +
          (withSnip && d._snip ? '<tr><td></td><td colspan="3" class="snip">' + d._snip + '</td></tr>' : '');
      }).join('') + '</table>';
  }

  function frame(cur, inner) {
    function a(h, label, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '><a href="#' + h + '"' + (cur === h ? ' aria-current="page"' : '') + '>' + label + '</a></li>'; }
    return '<div class="term">' +
      '<div class="bar"><a href="#home" title="ポータルのホームへ">AG-ARCHIVE // STAFF TERMINAL</a><span>宗暦 <time id="clock"></time></span></div>' +
      '<nav class="tree" aria-label="ディレクトリ"><p>DIRECTORY</p><ul>' +
        a('home', 'ホーム') +
        a('notice', '通達 (' + byCat(['通達', '報告']).length + ')') +
        a('report', '実験記録 (' + byCat(['実験記録']).length + ')') +
        a('doc-overview', '対話実験概要') +
        a('doc-regulation', '施設規定') +
        a('search', '文書検索') +
        '<li><button type="button" class="lock" data-denied="subject">実験体情報</button></li>' +
        '<li><button type="button" class="lock" data-denied="system">システム管理</button></li>' +
        '<li class="sp"></li><li><button type="button" data-logout>ログアウト</button></li>' +
      '</ul></nav>' +
      '<main class="view fade-in" id="view">' + inner + '</main>' +
    '</div>' +
    '<div class="status"><span>SESSION <span id="session">00:00:00</span></span><span>ACCESS LV.4</span>' +
      '<span class="push">LAST UPDATE ' + data.home.updated + ' / 本端末の情報の持ち出しを禁ずる</span></div>';
  }

  /* 次の対話実験(今日以降でいちばん近い回)を計算する */
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

  function viewHome() {
    var h = data.home;
    return '<h2 class="h">SYSTEM</h2><div class="sysg">' +
        h.system.map(function (s) { return '<div><span>' + s + '</span><b data-sys="' + s + '">正常</b></div>'; }).join('') + '</div>' +
      '<h2 class="h">NOTICE</h2>' + table(byCat(['通達', '報告'])) +
      '<h2 class="h">SCHEDULE</h2>' +
        [nextSession()].map(function (s) {
          // 見出しと値を1行ずつ並べる(スマホでも「対象」「場所」などの見出しが消えないように)
          return '<div class="sched"><p class="sched-t"><span class="n">' + s.date + '</span>' + s.name + '</p><dl>' +
            h.schedule_detail.map(function (x) {
              return '<dt>' + x[0] + '</dt><dd>' + (x[0] === '時間' ? SETTINGS.sessionTime : x[1]) + '</dd>';
            }).join('') + '</dl></div>';
        }).join('');
  }
  function viewList(title, cats, lead) {
    return '<h2 class="h">' + title + '</h2>' + (lead ? '<p style="margin-bottom:14px">' + lead + '</p>' : '') + table(byCat(cats));
  }
  function viewDoc(d) {
    var i = data.docs.indexOf(d), same = data.docs.filter(function (x) { return FILE[x.cat] === FILE[d.cat]; });
    var k = same.indexOf(d), prev = same[k - 1], next = same[k + 1];
    return '<p class="path">' + pathOf(d) + '</p>' +
      '<dl class="dhead">' +
        '<dt>TITLE</dt><dd class="title">' + esc(d.title) + '</dd>' +
        '<dt>TYPE</dt><dd>' + d.cat + '</dd>' +
        (d.date ? '<dt>DATE</dt><dd>' + d.date + '</dd>' : '') +
        (d.docid ? '<dt>ID</dt><dd>' + d.docid + '</dd>' : '') +
        '<dt>ACCESS</dt><dd>LV.4 SECRET</dd>' +
      '</dl>' +
      '<div class="doc">' + d.html.replace(/<table/g, '<div class="table-x"><table').replace(/<\/table>/g, '</table></div>') + '</div>' +
      '<div class="nav2"><span>' + (prev ? '<a href="#doc-' + prev.id + '">&lt; ' + esc(shortTitle(prev)).slice(0, 18) + '</a>' : '') + '</span>' +
        '<span>' + (next ? '<a href="#doc-' + next.id + '">' + esc(shortTitle(next)).slice(0, 18) + ' &gt;</a>' : '') + '</span></div>';
  }

  /* ---------- 検索 ---------- */
  // 1文字ずつ変換し、文字数が変わる変換はしない(一致位置がずれないように)
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
  var lastQuery = '';
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
  function viewSearch() {
    var r = search(lastQuery);
    return '<h2 class="h">SEARCH</h2>' +
      '<form class="grep" id="grep"><span>archive&gt; grep</span><input id="q" type="search" value="' + esc(lastQuery) + '" placeholder="調べたい言葉を入力" autocomplete="off" spellcheck="false" aria-label="文書内検索"></form>' +
      '<p class="hitinfo" id="hitinfo">' + r.info + '</p><div id="hits">' + table(r.docs, true) + '</div>';
  }

  /* どの画面からでもポータルのホームへ戻れるよう、上に道しるべを出す */
  var SECTION = { notice: ['notice', '通達'], report: ['report', '実験記録'], document: null };
  function crumbs(h, d) {
    var parts = ['<a href="#home">ホーム</a>'];
    if (d) {
      var sec = SECTION[FILE[d.cat]];
      if (sec) parts.push('<a href="#' + sec[0] + '">' + sec[1] + '</a>');
      parts.push(esc(shortTitle(d)).slice(0, 24));
    } else {
      parts.push({ notice: '通達', report: '実験記録', search: '文書検索' }[h] || '');
    }
    return '<p class="crumbs">' + parts.join(' / ') + '</p>';
  }

  /* ---------- 画面の切り替え ---------- */
  var denied = '';
  function route() {
    if (!data) return;
    var h = (location.hash || '#home').slice(1), inner;
    var d = h.indexOf('doc-') === 0 ? docById(h.slice(4)) : null;
    if (d) inner = viewDoc(d);
    else if (h === 'notice') inner = viewList('NOTICE', ['通達', '報告']);
    else if (h === 'report') inner = viewList('REPORT', ['実験記録'], '実験終了後すみやかに報告書を作成し、情報漏洩に細心の注意を払って提出すること。');
    else if (h === 'search') inner = viewSearch();
    else { h = 'home'; inner = viewHome(); }
    if (denied) {
      inner = '<div class="denied">ACCESS DENIED : ' + ({ subject: '実験体情報', system: 'システム管理' }[denied] || '') + '<span>権限レベルが不足しています(要求 LV.5 / 現在 LV.4)。</span></div>' + inner;
      denied = '';
    }
    if (h !== 'home') inner = crumbs(h, d) + inner;
    app.innerHTML = frame(h, inner);
    tick();
    window.scrollTo(0, 0);
    if (h === 'search') { var q = document.getElementById('q'); if (q) q.focus(); }
  }
  window.addEventListener('hashchange', route);

  app.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-denied')) { denied = t.getAttribute('data-denied'); route(); }
    else if (t.hasAttribute('data-logout')) { forget(); location.href = './'; }
  });
  // 打つたびに絞り込む
  app.addEventListener('input', function (e) {
    if (e.target.id !== 'q') return;
    lastQuery = e.target.value;
    var r = search(lastQuery);
    document.getElementById('hitinfo').textContent = r.info;
    document.getElementById('hits').innerHTML = table(r.docs, true);
  });
  app.addEventListener('submit', function (e) { if (e.target.id === 'grep') e.preventDefault(); });
})();
