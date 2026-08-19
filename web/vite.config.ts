import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
// ...

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 82,
    proxy: {
      '/api': 'http://localhost:83',
      '/uploads': 'http://localhost:83',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});