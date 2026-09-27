// Copies the Vite build (dist/) to the repository root so GitHub Pages
// "Deploy from a branch" serves a ready-to-play site. Levels are not part of
// the build: the site fetches them from levels/ at runtime.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
if (!existsSync(dist)) throw new Error('dist/ not found — run vite build first');

rmSync(resolve(root, 'assets'), { recursive: true, force: true });
cpSync(resolve(dist, 'assets'), resolve(root, 'assets'), { recursive: true });
cpSync(resolve(dist, 'index.html'), resolve(root, 'index.html'));
for (const page of ['editor', 'secret-creations']) {
  mkdirSync(resolve(root, page), { recursive: true });
  cpSync(resolve(dist, page, 'index.html'), resolve(root, page, 'index.html'));
}
// tell GitHub Pages not to run Jekyll over the site
writeFileSync(resolve(root, '.nojekyll'), '');
console.log('Published build to repository root (index.html, editor/, secret-creations/, assets/).');
