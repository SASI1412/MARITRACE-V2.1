import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      'maplibre-gl': 'maplibre-gl/dist/maplibre-gl.js'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl']
  }
});
