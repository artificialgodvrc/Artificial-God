/* =========================================================
   全ページ共通のヘッダー・メニュー・フッターを差し込む。
   メニューの項目を変えたいときは、下の PAGES を書き換える。
   各ページの <body data-page="..."> と key が一致すると、
   メニューのその項目に印が付く。
   ========================================================= */
(function () {
  var PAGES = [
    { key: 'home',        href: './',       label: 'ホーム' },
    { key: 'facility',    href: 'facility',    label: '施設案内' },
    { key: 'experiment',  href: 'experiment',  label: '実験概要' },
    { key: 'subject',     href: 'subject',     label: '実験体紹介' },
    { key: 'researcher',  href: 'researcher',  label: '研究員紹介' },
    { key: 'explanation', href: 'explanation', label: '被験者の方へ' },
    { key: 'recruitment', href: 'recruitment', label: '採用情報' },
    { key: 'news',        href: 'news',        label: 'ニュース' }
  ];
  /* お問い合わせ用のGoogleフォームのURL。ここに貼ると、全ページの「お問い合わせ」が
     そのフォームを新しいタブで開くようになる。空のあいだはホームの案内欄へ移動する。 */
  var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd2eUifyvKQj1dDNGFOwmdyVI3vy39u29S0p3AX-5Q4DRpHOQ/viewform';
  var CONTACT_HREF = FORM_URL || './#contact';
  var CONTACT_ATTR = FORM_URL ? ' target="_blank" rel="noopener"' : '';
  var X_URL = 'https://x.com/AGod_VRC';
  var VRC_URL = 'https://vrchat.com/home/group/grp_e108ace5-7936-4562-9e25-3c4748b66954';
  var YT_URL = 'https://www.youtube.com/@ArtificialGodVRC';
  var current = document.body.getAttribute('data-page');

  function navItems() {
    return PAGES.map(function (p) {
      var cur = p.key === current ? ' aria-current="page"' : '';
      return '<li><a href="' + p.href + '"' + cur + '>' + p.label + '</a></li>';
    }).join('');
  }

  var header = document.getElementById('site-header');
  if (header) {
    header.innerHTML =
      '<div class="util"><div class="wrap">' +
        '<span>ヴァカーレ国立研究開発法人</span>' +
        '<span class="util-right"><time id="clock"></time>' +
        '<a class="contact-link" href="' + CONTACT_HREF + '"' + CONTACT_ATTR + '>お問い合わせ</a></span>' +
      '</div></div>' +
      '<header class="head"><div class="wrap">' +
        '<a class="brand" href="./">' +
          '<img src="img/logo-black.webp" alt="Artificial God. Military Laboratory" width="110" height="77">' +
          '<small>Creatura研究施設</small>' +
        '</a>' +
        '<button class="menu-btn" type="button" id="menu-btn" aria-expanded="false" aria-controls="site-nav">メニュー</button>' +
      '</div></header>' +
      '<nav class="nav" id="site-nav" aria-label="メインメニュー"><ul>' + navItems() + '</ul></nav>';

    /* 宗暦の日時。宗暦の年 = 西暦の年 + 5143(2026年 → 7169年)。1分ごとに更新する。 */
    var clock = document.getElementById('clock');
    function two(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var d = new Date();
      clock.textContent = '宗暦 ' + (d.getFullYear() + 5143) + '.' + (d.getMonth() + 1) + '.' + d.getDate() +
        ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
    }
    tick();
    setInterval(tick, 30000);

    var btn = document.getElementById('menu-btn');
    var nav = document.getElementById('site-nav');
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '閉じる' : 'メニュー';
    });
  }

  var footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML =
      '<footer><div class="wrap">' +
        '<div class="foot">' +
          '<div class="foot-brand">' +
            '<img class="logo" src="img/logo-white.webp" alt="Artificial God." width="120" height="84">' +
            '<p><b>Artificial God. Creatura研究施設</b><br>〒1A-Θ001<br>ヴァカーレ祖国 主庭市 主像前 1-1202</p>' +
          '</div>' +
          '<div>' +
            '<p class="foot-head">Menu</p>' +
            '<ul>' + navItems() + '</ul>' +
          '</div>' +
          '<div>' +
            '<p class="foot-head">Social</p>' +
            '<div class="social">' +
              '<a href="' + X_URL + '" target="_blank" rel="noopener" aria-label="公式X"><img src="img/x.webp" alt="X"></a>' +
              '<a href="' + VRC_URL + '" target="_blank" rel="noopener" aria-label="VRChatグループ"><img class="wide" src="img/vrchat.webp" alt="VRChat"></a>' +
              '<a href="' + YT_URL + '" target="_blank" rel="noopener" aria-label="YouTubeチャンネル"><img class="yt" src="img/youtube.webp" alt="YouTube"></a>' +
            '</div>' +
            '<p class="foot-contact"><a href="' + CONTACT_HREF + '"' + CONTACT_ATTR + '>お問い合わせ</a></p>' +
          '</div>' +
        '</div>' +
        '<div class="fine">' +
          '<span>当ホームページはVRChatイベント「Artificial God.」の公式ホームページです。掲載内容は全てフィクションであり、実在の人物、企業とは一切関係ありません。</span>' +
          '<span>© 7169 Artificial God.</span>' +
        '</div>' +
      '</div></footer>';
  }

  /* ホームの「お問い合わせフォームを開く」ボタン */
  Array.prototype.forEach.call(document.querySelectorAll('[data-form-link]'), function (a) {
    if (FORM_URL) {
      a.href = FORM_URL;
    } else {
      a.removeAttribute('href');
      a.removeAttribute('target');
      a.classList.add('is-off');
      a.textContent = 'フォーム準備中';
    }
  });

  /* YouTubeの埋め込み。最初はサムネイルだけを出し、押されたときに動画を読み込む。 */
  Array.prototype.forEach.call(document.querySelectorAll('[data-yt]'), function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.className = 'yt';
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = 'Creatura素体募集';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      b.parentNode.replaceChild(f, b);
    });
  });
})();
