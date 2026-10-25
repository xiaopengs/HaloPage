import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  preview: {
    port: 5180,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:3000', changeOrigin: true },
    },
  },
});
