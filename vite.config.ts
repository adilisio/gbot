import { defineConfig } from 'vite';

// Served from GitHub Pages at https://adilisio.github.io/gbot/
export default defineConfig({
  base: '/gbot/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
