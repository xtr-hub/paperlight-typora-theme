import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_DIR, '../..');
const CACHE_DIR = path.join(TOOL_DIR, '.cache');
const TOOLKIT_DIR = path.join(CACHE_DIR, 'typora-theme-toolkit');
const TOOLKIT_REPO = 'https://github.com/typora/typora-theme-toolkit.git';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function printHelp() {
  console.log(`Paperlight official Typora preview screenshot collector

This tool uses Typora's official theme toolkit html-preview pages.
It does NOT start or control Typora.

Usage:
  node collect.mjs [options]

Options:
  --theme <light,dark>   Only capture the given theme(s). Default: all.
  --shot <name,name>     Only capture the given shot(s). Default: all.
  --config <file>        Shot config. Default: tools/demo-shots/shots.json.
  --out <dir>            Output directory. Default: docs/img/preview.
  --browser <name>       msedge, chrome, or chromium. Default: msedge.
  --headed               Show the browser window (useful for debugging).
  --allow-external       Allow external images/media to load. Default: blocked.
  --update-toolkit       Delete the cached toolkit and clone it again.
  --list                 List themes, pages and shots, then exit.
  --help                 Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    themes: null,
    shots: null,
    config: path.join(TOOL_DIR, 'shots.json'),
    out: path.join(REPO_ROOT, 'docs/img/preview'),
    browser: 'msedge',
    headed: false,
    allowExternal: false,
    updateToolkit: false,
    list: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return value;
    };
    switch (arg) {
      case '--theme':
        options.themes = next().split(',').map((value) => value.trim()).filter(Boolean);
        break;
      case '--shot':
        options.shots = next().split(',').map((value) => value.trim()).filter(Boolean);
        break;
      case '--config':
        options.config = path.resolve(next());
        break;
      case '--out':
        options.out = path.resolve(next());
        break;
      case '--browser':
        options.browser = next();
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--allow-external':
        options.allowExternal = true;
        break;
      case '--update-toolkit':
        options.updateToolkit = true;
        break;
      case '--list':
        options.list = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureToolkit(update) {
  if (update) {
    fs.rmSync(TOOLKIT_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(path.join(TOOLKIT_DIR, 'html-preview/html/lorem.html'))) return;

  ensureDir(CACHE_DIR);
  console.log('Cloning the official Typora theme toolkit...');
  try {
    execFileSync('git', ['clone', '--depth', '1', TOOLKIT_REPO, TOOLKIT_DIR], {
      stdio: 'inherit',
    });
  } catch (error) {
    throw new Error(`Could not clone ${TOOLKIT_REPO}. Install git or clone it to ${TOOLKIT_DIR} manually.`);
  }
}

function safeFile(base, relative) {
  const file = path.resolve(base, `.${path.sep}${relative}`);
  const rel = path.relative(base, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return file;
}

function sendFile(response, file) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const extension = path.extname(file).toLowerCase();
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(response);
}

function createPreviewServer({ themes, pages }) {
  return http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(requestUrl.pathname);
      const themeName = requestUrl.searchParams.get('theme') ?? 'light';

      const pageMatch = pathname.match(/^\/preview\/html\/([^/]+)\.html$/);
      if (pageMatch) {
        const pageName = pageMatch[1];
        const pageFile = pages[pageName];
        if (!pageFile) {
          response.writeHead(404);
          response.end('Unknown preview page');
          return;
        }
        const file = safeFile(TOOLKIT_DIR, pageFile);
        if (!file || !fs.existsSync(file)) {
          response.writeHead(404);
          response.end('Preview page not found');
          return;
        }
        if (!themes[themeName]) {
          response.writeHead(400);
          response.end('Unknown theme');
          return;
        }

        let html = fs.readFileSync(file, 'utf8');
        html = html.replace(
          /href="\.\.\/theme\/test\.css"/g,
          `href="/preview/theme/${encodeURIComponent(themeName)}.css"`,
        );
        if (!html.includes('/preview/theme/')) {
          html = html.replace(
            '</head>',
            `  <link rel="stylesheet" href="/preview/theme/${encodeURIComponent(themeName)}.css">\n</head>`,
          );
        }
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        response.end(html);
        return;
      }

      if (pathname === '/preview/theme/paperlight.css') {
        sendFile(response, path.join(REPO_ROOT, 'paperlight.css'));
        return;
      }

      const themeMatch = pathname.match(/^\/preview\/theme\/([^/]+)\.css$/);
      if (themeMatch) {
        const name = decodeURIComponent(themeMatch[1]);
        const css = themes[name];
        if (!css) {
          response.writeHead(404);
          response.end('Unknown theme');
          return;
        }
        sendFile(response, safeFile(REPO_ROOT, css));
        return;
      }

      if (pathname.startsWith('/preview/theme/paperlight/')) {
        const relative = pathname.slice('/preview/theme/paperlight/'.length);
        sendFile(response, safeFile(path.join(REPO_ROOT, 'paperlight'), relative));
        return;
      }

      if (pathname.startsWith('/preview/theme/default/')) {
        const relative = pathname.slice('/preview/theme/default/'.length);
        sendFile(response, safeFile(path.join(TOOLKIT_DIR, 'html-preview/theme/default'), relative));
        return;
      }

      if (pathname.startsWith('/preview/theme/fonts/')) {
        const relative = pathname.slice('/preview/theme/fonts/'.length);
        sendFile(response, safeFile(path.join(TOOLKIT_DIR, 'html-preview/theme/default/fonts'), relative));
        return;
      }

      response.writeHead(404);
      response.end('Not found');
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function launchBrowser(name, headed) {
  const channel = name === 'chromium' ? undefined : name;
  const options = { headless: !headed };
  if (channel) options.channel = channel;

  try {
    return await chromium.launch(options);
  } catch (error) {
    if (name !== 'msedge' && name !== 'chrome') throw error;
    for (const fallback of ['msedge', 'chrome']) {
      if (fallback === name) continue;
      try {
        return await chromium.launch({ ...options, channel: fallback });
      } catch {
        // Try the next installed browser.
      }
    }
    return chromium.launch({ headless: !headed });
  }
}

function buildPreviewUrl(origin, pageName, themeName) {
  return `${origin}/preview/html/${encodeURIComponent(pageName)}.html?theme=${encodeURIComponent(themeName)}`;
}

async function preparePage(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(150);
  await page.addStyleTag({
    content: `
      content { background-image: none !important; }
      .preview-group { display: flow-root; padding: 24px 48px; }
      img.is-broken { visibility: hidden; }
      pre.md-fences .CodeMirror-line,
      pre.md-fences .CodeMirror-code {
        color: var(--text-color);
      }
      .MathJax_SVG,
      .MathJax_SVG svg {
        color: var(--text-color) !important;
        fill: var(--text-color) !important;
        stroke: var(--text-color) !important;
      }
      #write .task-list-item > input {
        float: left;
        margin-right: 0.5em;
      }
      #write .task-list-item > p {
        display: inline;
      }
    `,
  });
  await page.evaluate(() => {
    for (const image of document.images) {
      if (image.complete && image.naturalWidth === 0) {
        image.classList.add('is-broken');
      } else {
        image.addEventListener('error', () => image.classList.add('is-broken'), { once: true });
      }
    }
  });
  // The toolkit's old MathJax SVG uses namespaced `NS1:href` attributes,
  // which modern Chromium does not resolve. Normalize them to href/xlink:href.
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('svg *')) {
      for (const attribute of [...element.attributes]) {
        if (/:href$/i.test(attribute.name)) {
          const value = attribute.value;
          element.removeAttribute(attribute.name);
          element.setAttribute('href', value);
          element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', value);
        }
      }
    }
  });
}

async function wrapGroup(page, selector) {
  await page.evaluate((groupSelector) => {
    const elements = [...document.querySelectorAll(groupSelector)];
    if (elements.length === 0) return;
    const wrapper = document.createElement('section');
    wrapper.className = 'preview-group';
    elements[0].before(wrapper);
    for (const element of elements) wrapper.appendChild(element);
  }, selector);
}

async function captureShot(page, shot, outputFile) {
  const mode = shot.mode ?? (shot.group || shot.selector ? 'element' : 'viewport');

  if (mode === 'viewport') {
    if (shot.scrollTo) {
      await page.evaluate((selector) => {
        const target = document.querySelector(selector);
        if (target) target.scrollIntoView({ block: 'start' });
      }, shot.scrollTo);
      await page.waitForTimeout(100);
    }
    await page.screenshot({ path: outputFile, animations: 'disabled' });
    return;
  }

  if (mode === 'fullPage') {
    await page.screenshot({ path: outputFile, fullPage: true, animations: 'disabled' });
    return;
  }

  if (shot.group) {
    await wrapGroup(page, shot.group);
    const locator = page.locator('.preview-group').first();
    await locator.waitFor({ state: 'attached', timeout: 10000 });
    await locator.screenshot({ path: outputFile, animations: 'disabled' });
    return;
  }

  if (!shot.selector) throw new Error(`Shot "${shot.name}" needs selector, group, or viewport mode`);
  const locator = page.locator(shot.selector).first();
  await locator.waitFor({ state: 'attached', timeout: 10000 });
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await locator.screenshot({ path: outputFile, animations: 'disabled' });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  ensureToolkit(options.updateToolkit);

  const config = readJson(options.config);
  const themes = config.themes ?? {};
  const pages = config.pages ?? {};
  const allShots = config.shots ?? [];

  if (options.list) {
    console.log('Themes:');
    for (const [name, css] of Object.entries(themes)) console.log(`  ${name} -> ${css}`);
    console.log('Pages:');
    for (const [name, file] of Object.entries(pages)) console.log(`  ${name} -> ${file}`);
    console.log('Shots:');
    for (const shot of allShots) {
      console.log(`  ${shot.name} (${shot.mode ?? 'element'}) page=${shot.page ?? 'lorem'} ${shot.group ?? shot.selector ?? shot.scrollTo ?? ''}`);
    }
    return;
  }

  if (Object.keys(themes).length === 0) throw new Error('No themes configured');
  if (Object.keys(pages).length === 0) throw new Error('No preview pages configured');
  if (allShots.length === 0) throw new Error('No shots configured');

  const selectedThemes = options.themes
    ? Object.entries(themes).filter(([name]) => options.themes.includes(name))
    : Object.entries(themes);
  if (selectedThemes.length === 0) throw new Error(`Unknown theme(s): ${options.themes.join(', ')}`);

  const selectedShots = options.shots
    ? allShots.filter((shot) => options.shots.includes(shot.name))
    : allShots;
  if (selectedShots.length === 0) throw new Error(`Unknown shot(s): ${options.shots.join(', ')}`);

  const viewport = {
    width: config.viewport?.width ?? 1200,
    height: config.viewport?.height ?? 900,
    deviceScaleFactor: config.deviceScaleFactor ?? 2,
  };

  ensureDir(options.out);

  const server = createPreviewServer({ themes, pages });
  const port = await listen(server);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser(options.browser, options.headed);

  try {
    for (const [themeName] of selectedThemes) {
      const themeOutDir = path.join(options.out, themeName);
      ensureDir(themeOutDir);

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        colorScheme: themeName === 'dark' ? 'dark' : 'light',
        locale: 'zh-CN',
      });

      if (!options.allowExternal) {
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url());
          if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
            route.continue();
          } else {
            route.abort();
          }
        });
      }

      for (const shot of selectedShots) {
        if (shot.themes && !shot.themes.includes(themeName)) continue;
        const pageName = shot.page ?? 'lorem';
        if (!pages[pageName]) throw new Error(`Shot "${shot.name}" uses unknown page "${pageName}"`);

        const page = await context.newPage();
        page.on('pageerror', (error) => console.error('pageerror:', error));
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(buildPreviewUrl(origin, pageName, themeName), {
          waitUntil: 'load',
          timeout: 30000,
        });
        await preparePage(page);

        const outputFile = path.join(themeOutDir, `${shot.name}.png`);
        await captureShot(page, shot, outputFile);
        console.log(`captured ${path.relative(REPO_ROOT, outputFile)}`);
        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await closeServer(server);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'typora-theme-toolkit/html-preview',
    viewport,
    themes: Object.fromEntries(selectedThemes),
    shots: selectedShots.map((shot) => ({
      name: shot.name,
      page: shot.page ?? 'lorem',
      mode: shot.mode ?? (shot.group || shot.selector ? 'element' : 'viewport'),
      group: shot.group,
      selector: shot.selector,
    })),
  };
  fs.writeFileSync(path.join(options.out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
