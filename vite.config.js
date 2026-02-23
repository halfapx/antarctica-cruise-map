import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    force: true,
    include: ['maplibre-gl/dist/maplibre-gl-csp-dev.js']
  }
});
