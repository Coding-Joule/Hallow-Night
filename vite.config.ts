import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Page sources live in web/. `npm run build` writes to dist/, then
 * scripts/publish-build.mjs copies the result to the repository root so
 * GitHub Pages ("Deploy from a branch") can serve it directly.
 * Levels are plain JSON in levels/ and are fetched at runtime.
 */
const levelsDir = resolve(__dirname, 'levels');

/** Dev server: serve /levels/* straight from the repository's levels/ folder. */
function serveLevels(): Plugin {
  return {
    name: 'serve-levels',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        if (!url.startsWith('/levels/')) return next();
        const file = resolve(levelsDir, '.' + url.slice('/levels'.length));
        if (!file.startsWith(levelsDir) || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          return res.end('not found');
        }
        res.setHeader('Content-Type', 'application/json');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, 'web'),
  base: './',
  publicDir: false,
  plugins: [serveLevels()],
  // pages in web/ load their scripts as /src/… from the repository's src/
  resolve: { alias: [{ find: /^\/src\//, replacement: resolve(__dirname, 'src') + '/' }] },
  server: { fs: { allow: [__dirname] } },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'web/index.html'),
        editor: resolve(__dirname, 'web/editor/index.html'),
        creator: resolve(__dirname, 'web/secret-creations/index.html'),
      },
    },
  },
});
