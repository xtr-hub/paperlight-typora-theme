import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the repository layout inside the bundle so relative theme and image
// URLs also work when the site is hosted under a subpath (e.g. GitHub Pages).
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, '../..');
const outputDir = path.resolve(repoRoot, 'dist/theme-configurator');
const toolOutput = path.join(outputDir, 'tools/theme-configurator');

await mkdir(toolOutput, { recursive: true });
for (const file of ['onelight.css', 'onelight-dark.css']) {
  await cp(path.join(repoRoot, file), path.join(outputDir, file));
}
await cp(path.join(repoRoot, 'onelight'), path.join(outputDir, 'onelight'), { recursive: true });

for (const entry of await readdir(toolDir, { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|css|js)$/.test(entry.name)) {
    await cp(path.join(toolDir, entry.name), path.join(toolOutput, entry.name));
  }
}

await writeFile(path.join(outputDir, 'index.html'), `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0; url=./tools/theme-configurator/"><title>OneLight 主题配置</title></head>
<body><p>正在打开 OneLight 主题配置页。<a href="./tools/theme-configurator/">如果没有跳转，请点击这里。</a></p></body></html>\n`);

console.log(`Static site ready: ${outputDir}`);
