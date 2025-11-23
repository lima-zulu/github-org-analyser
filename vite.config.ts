/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Brotli compression (best compression, modern browsers)
    viteCompression({
      algorithm: 'brotliCompress',
      threshold: 1024,
    }),
    // Gzip fallback for older browsers
    viteCompression({
      algorithm: 'gzip',
      threshold: 1024,
    }),
    // Bundle visualizer - generates stats.html after build
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
