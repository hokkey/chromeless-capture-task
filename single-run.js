const fs = require('fs');
const chromeLauncher = require('chrome-launcher');
const { Chromeless } = require('chromeless');

// 撮影対象URL
const url = 'https://yahoo.com/';

// 保存先パス
const savePath = './output/';

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
  launchChrome: false,
  viewport: {
    width: 1280,
    height: 800,
    scale: 1
  }
};

(async () => {

  // chrome-launcherでChromeを起動
  const chrome = await chromeLauncher.launch(chromeLauncherOptions);

  // chromelessを初期化
  const chromeless = new Chromeless(chromelessOptions);

  // 保存先がない場合はディレクトリを生成
  try {
    fs.mkdirSync(savePath);
  } catch(e) {
    console.info(e.message);
  }

  // URLへ遷移してtitleを取得
  let title = await chromeless.goto(url).evaluate(() => document.title.replace(/[\/\\?:"*|]/g, '-'));

  // titleが取得できない場合はURLを代わりに使う
  if (!title) {
    console.log(`INFO: Could not get the document.title from "${url}"`);
    title = url.replace(/https:\/\//, '').replace(/\//, '');
  }

  // ウィンドウの高さに合わせてviewportを変更
  const winHeight = await chromeless.evaluate(() => {
    return Math.max(
      document.documentElement["clientHeight"],
      document.body["scrollHeight"],
      document.documentElement["scrollHeight"],
      document.body["offsetHeight"],
      document.documentElement["offsetHeight"]
    );
  });

  if (winHeight > chromelessOptions.viewport.height) {
    console.log(winHeight);
    await chromeless.setViewport({
      height: winHeight,
      width: chromelessOptions.viewport.width
    }).goto(url);
  }

  // スクリーンショットを撮影
  const result = await chromeless.screenshot('html', {
    // 保存パス
    filePath: `${savePath}${title}.png`
  });

  console.info(`${result} was saved successfully.`);

  // chromelessを終了
  await chromeless.end();

  // chromeを終了
  await chrome.kill();

})();
