import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// `base: './'` keeps every asset path relative, so the build works from any
// sub-folder (GitHub Pages project sites, itch.io, a plain static host...).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor/index.html'),
        creator: resolve(__dirname, 'secret-creations/index.html'),
      },
    },
  },
});
