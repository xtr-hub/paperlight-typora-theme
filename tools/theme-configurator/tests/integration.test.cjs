const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('../../demo-shots/node_modules/playwright-core');

const root = path.resolve(__dirname, '../../..');
const built = path.join(root, 'dist/theme-configurator');
const edge = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const prefix = '/nested/site/';
const png = fs.readFileSync(path.join(root, 'docs/img/readme/list-normal-1.png'));
let server, browser, base;

before(async () => {
  execFileSync(process.execPath, [path.join(root, 'tools/theme-configurator/build.mjs')], { cwd: root });
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    let relative = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(built, relative);
    if (!file.startsWith(built + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.gif':'image/gif', '.png':'image/png', '.woff2':'font/woff2', '.ttf':'font/ttf' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}${prefix}`;
  browser = await chromium.launch({ executablePath: edge, headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openPage() {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) failed.push(response.url()); });
  await page.goto(base + 'tools/theme-configurator/');
  await page.frameLocator('#preview').locator('#write').waitFor();
  return { context, page, errors, failed };
}

async function installDirectoryMock(page) {
  await page.evaluate(() => {
    const files = window.__files = {
      'onelight.user.css': '/* existing light */\nbody { color: red; }\n',
      'onelight-dark.user.css': '/* existing dark */\nbody { color: blue; }\n',
    };
    window.__failFile = '';
    window.showDirectoryPicker = async () => ({
      name: 'test-themes',
      async getFileHandle(name, options = {}) {
        if (!(name in files) && !options.create) throw new DOMException('Missing', 'NotFoundError');
        if (!(name in files)) files[name] = '';
        return {
          async getFile() { return new File([files[name]], name); },
          async createWritable() {
            if (window.__failFile === name) { window.__failFile = ''; throw new Error('simulated write failure'); }
            let pending = '';
            return { async write(data) { pending = data; }, async close() { files[name] = pending; } };
          },
        };
      },
      async removeEntry(name) { delete files[name]; },
    });
  });
}

test('built site works under a subpath; custom images, coordinates, generated CSS and restored settings agree', async () => {
  const { context, page, errors, failed } = await openPage();
  try {
    await page.locator('#pageBgFile').setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: png });
    await page.locator('#watermarkFile').setInputFiles({ name: 'sticker.png', mimeType: 'image/png', buffer: png });
    await page.locator('#pageBgPosition').selectOption('custom');
    await page.locator('#pageBgX').fill('20');
    await page.locator('#pageBgY').fill('75');
    await page.locator('#pageBgOverlay').fill('35');
    await page.locator('#watermarkAnchor').selectOption('top-left');
    await page.waitForTimeout(500);
    const preview = page.frameLocator('#preview');
    await preview.locator('body').evaluate(el => new Promise((resolve, reject) => {
      const value = getComputedStyle(el).backgroundImage;
      const img = new Image(); img.onload = resolve; img.onerror = () => reject(Error(`Preview image did not decode: ${value.slice(0, 80)}`));
      img.src = value.match(/url\("([^"]+)"\)/)?.[1] || '';
    }));
    const actual = await preview.locator('body').evaluate(el => ({ image: getComputedStyle(el).backgroundImage, position: getComputedStyle(el).backgroundPosition }));
    assert.match(actual.image, /data:image\/png;base64/);
    assert.match(actual.image, /0\.35/);
    assert.equal(actual.position.split(',').at(-1).trim(), '20% 75%');
    await installDirectoryMock(page);
    await page.locator('#chooseThemeDirectory').click();
    await page.locator('#saveTheme').click();
    await page.locator('#status').filter({ hasText: '已保存' }).waitFor();
    const files = await page.evaluate(() => window.__files);
    assert.match(files['onelight.user.css'], /--page-bg-position:\s*20% 75%/);
    assert.match(files['onelight.user.css'], /--page-bg-overlay:\s*35%/);
    assert.match(files['onelight.user.css'], /--watermark-left:\s*22px/);
    assert.match(files['onelight-dark.user.css'], /data:image\/png;base64/);
    for (const theme of ['light', 'dark']) {
      const validation = await context.newPage();
      await validation.goto(base + 'tools/theme-configurator/preview.html');
      await validation.locator('#theme-css').evaluate((link, name) => { link.href = name === 'dark' ? '../../onelight-dark.css' : '../../onelight.css'; }, theme);
      await validation.addStyleTag({ content: files[theme === 'light' ? 'onelight.user.css' : 'onelight-dark.user.css'] });
      const styles = await validation.evaluate(() => {
        const body = getComputedStyle(document.body);
        const sticker = getComputedStyle(document.querySelector('content'), '::after');
        return { image: body.backgroundImage, position: body.backgroundPosition, sticker: sticker.backgroundImage, left: sticker.left, top: sticker.top };
      });
      assert.match(styles.image, /data:image\/png;base64/);
      assert.match(styles.image, /0\.35/);
      assert.equal(styles.position.split(',').at(-1).trim(), '20% 75%');
      assert.match(styles.sticker, /data:image\/png;base64/);
      assert.equal(styles.left, '22px');
      assert.equal(styles.top, '38px');
      await validation.close();
    }
    await page.reload();
    await page.locator('#status').filter({ hasText: '恢复' }).waitFor();
    assert.equal(await page.locator('#pageBgPosition').inputValue(), 'custom');
    assert.equal(await page.locator('#pageBgX').inputValue(), '20');
    assert.equal(await page.locator('#pageBgOverlay').inputValue(), '35');
    assert.equal(await page.locator('#watermarkAnchor').inputValue(), 'top-left');
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
  } finally { await context.close(); }
});

test('saving preserves unrelated CSS, replaces generated block and rolls back after a second-file failure', async () => {
  const { context, page } = await openPage();
  try {
    await installDirectoryMock(page);
    await page.locator('#chooseThemeDirectory').click();
    await page.locator('#saveTheme').click();
    await page.locator('#status').filter({ hasText: '已保存' }).waitFor();
    await page.locator('#accentColor').fill('#123456');
    await page.locator('#saveTheme').click();
    await page.waitForFunction(() => window.__files['onelight.user.css'].includes('#123456'));
    const saved = await page.evaluate(() => ({ ...window.__files }));
    assert.match(saved['onelight.user.css'], /existing light/);
    assert.match(saved['onelight-dark.user.css'], /existing dark/);
    assert.equal((saved['onelight.user.css'].match(/BEGIN OneLight configurator/g) || []).length, 1);
    await page.locator('#accentColor').fill('#aabbcc');
    await page.evaluate(() => { window.__failFile = 'onelight-dark.user.css'; });
    await page.locator('#saveTheme').click();
    await page.locator('#status').filter({ hasText: '保存失败' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__files), saved);
  } finally { await context.close(); }
});

test('invalid imported configuration is rejected without changing current settings', async () => {
  const { context, page } = await openPage();
  try {
    await page.locator('#accentColor').fill('#123456');
    await page.locator('#importConfig').setInputFiles({ name:'broken.json', mimeType:'application/json', buffer: Buffer.from('{"version":1,"settings":{"accentColor":"not-a-color"}}') });
    await page.locator('#status').filter({ hasText: '导入失败' }).waitFor();
    assert.equal(await page.locator('#accentColor').inputValue(), '#123456');
  } finally { await context.close(); }
});
