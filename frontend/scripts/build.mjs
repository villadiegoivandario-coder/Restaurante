import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(frontendDir, 'dist');

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const file of ['index.html', 'pos.html', 'manifest.webmanifest', 'sw.js']) {
  await cp(path.join(frontendDir, file), path.join(distDir, file));
}

for (const directory of ['assets', 'css', 'js']) {
  await cp(path.join(frontendDir, directory), path.join(distDir, directory), {
    recursive: true,
  });
}

for (const directory of ['css', 'js']) {
  const extension = directory === 'css' ? '.css' : '.js';
  const entries = await readdir(path.join(distDir, directory), { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name) !== extension) continue;

    const filePath = path.join(distDir, directory, entry.name);
    const source = await readFile(filePath, 'utf8');
    const result = await transform(source, {
      loader: directory === 'css' ? 'css' : 'js',
      minifySyntax: true,
      minifyWhitespace: true,
      minifyIdentifiers: false,
    });
    await writeFile(filePath, result.code);
  }
}

console.log(`Web build created at ${distDir}`);
