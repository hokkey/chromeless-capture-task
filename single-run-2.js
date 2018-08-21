const fs = require('fs');
const chromeLauncher = require('chrome-launcher');
const { Chromeless } = require('chromeless');

const UA = {
  CHROME: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
  IPHONE_SAFARI: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
};


// 撮影対象URL
const url = {
  href: 'https://yahoo.co.jp/',

  // タイムアウト
  timeout: 10000,

  // 保存先
  outputDir: 'output/yahoo/',

  // 実行の度に別のディレクトリへ保存する
  useIncrementalMode: true,

  // ファイル名にtitle要素の文字列を使用する
  useTitleAsFileName: true,

  // ファイル名プレフィックス
  fileNamePrefix: 'output_',

  // ファイル名サフィックス
  fileNameSuffix: '_screenshot',

  // 撮影したいviewportとUAの種類
  deviceEnvironments: [
    {
      // 環境名・ファイル保存時にも使用
      name: '1080p',

      // viewport
      width: 1920,
      height: 1080,
      scale: 1,
      mobile: false,

      // UserAgent
      userAgent: UA.CHROME,

      // 撮影対象となる要素セレクタ
      screenshotSelector: 'html',

      // ViewportサイズをWindowに合わせて拡大する
      useViewportExpanding: true,
    },
    {
      name: 'xga',
      width: 1024,
      height: 768,
      scale: 1,
      mobile: false,
      userAgent: UA.CHROME,
      screenshotSelector: 'html',
      useViewportExpanding: true,
    },
    {
      name: 'mobile',
      width: 520,
      height: 720,
      scale: 1,
      mobile: true,
      userAgent: UA.IPHONE_SAFARI,
      screenshotSelector: 'html',
      useViewportExpanding: true,
    }
  ],
};


// chrome-launcherの設定
const chromeLauncherOptions = {
  port: 9222,
  chromeFlags: [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars'
  ]
};

// chromelessの設定
const chromelessOptions = {
  launchChrome: false
};

(async () => {

  // chrome-launcherでChromeを起動
  const chrome = await chromeLauncher.launch(chromeLauncherOptions);

  // chromelessを初期化
  const chromeless = new Chromeless(chromelessOptions);

  // 保存先がない場合はディレクトリを生成
  try {
    fs.mkdirSync(url.outputDir);
  }
  catch(e) {
    console.info(e.message);
  }

  // スクリーンショットを複数の画面サイズで撮影
  for (const viewport of url.deviceEnvironments) {

    // ページを表示して高さを検査
    const pageInfo = await chromeless
      .setUserAgent(viewport.userAgent)
      .setViewport(viewport)
      .goto(url.href, url.timeout)
      .evaluate(() => {
        return {
          title: document.title,
          winHeight: Math.max(
            document.documentElement["clientHeight"],
            document.body["scrollHeight"],
            document.documentElement["scrollHeight"],
            document.body["offsetHeight"],
            document.documentElement["offsetHeight"]
          ),
          error: null
        };
      })
      .catch(reason => {
        return { title: '', winHeight: 0, error: reason };
      })
    ;

    // ページ取得失敗時はcontinue
    if (pageInfo.error) {
      console.error(pageInfo.error);
      continue;
    }

    // ファイル名にtitleを利用しない場合は空文字列にする
    if (!url.useTitleAsFileName) {
      pageInfo.title = '';
    }

    // ファイル名にプレフィックスとサフィックスを結合する
    pageInfo.title = url.fileNamePrefix + pageInfo.title + url.fileNameSuffix;

    // titleが空文字列の場合はURLを代わりに使う
    if (!pageInfo.title) {
      pageInfo.title = url.href.replace(/https?:\/\//, '');
    }

    // ウィンドウの高さに合わせてviewportを変更
    if (viewport.useViewportExpanding && pageInfo.winHeight > viewport.height) {
      await chromeless
        .setViewport({
          height: pageInfo.winHeight,
          width: viewport.width
        })
      ;
    }

    // titleをファイル名として利用できる文字列に加工
    const fileName =
      `${url.outputDir}${pageInfo.title.replace(/[\/\\?:"*|]/g, '-')}_${viewport.name}.png`
    ;


    // スクリーンショットを保存
    await chromeless
      .screenshot(viewport.screenshotSelector, { filePath: fileName })
      .catch((reason => {
        console.error(reason);
      }))
      .then((result) => {
        if (result) console.info(`Saved "${result}" successfully.`);
      })
    ;
  }

  // chromelessを終了
  await chromeless.end();

  // chromeを終了
  await chrome.kill();

})();
