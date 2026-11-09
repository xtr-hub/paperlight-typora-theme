import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The publish directory has a real index.html at its root. Relative paths
// continue to work under a subpath such as a GitHub Pages project site.
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, '../..');
const outputDir = path.resolve(repoRoot, 'dist');
await mkdir(outputDir, { recursive: true });
for (const file of ['onelight.css', 'onelight-dark.css']) {
  await cp(path.join(repoRoot, file), path.join(outputDir, file));
}
await cp(path.join(repoRoot, 'onelight'), path.join(outputDir, 'onelight'), { recursive: true });

for (const entry of await readdir(toolDir, { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|css|js)$/.test(entry.name)) {
    const source = path.join(toolDir, entry.name);
    const target = path.join(outputDir, entry.name);
    if (entry.name === 'preview.html') {
      // In the repository the preview lives two levels below the theme;
      // the deployable preview and theme entries share the output root.
      const preview = await readFile(source, 'utf8');
      await writeFile(target, preview.replaceAll('../../onelight', './onelight'));
    } else {
      await cp(source, target);
    }
  }
}

console.log(`Static site ready: ${outputDir}`);
