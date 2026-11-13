import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// V2: en desarrollo, las llamadas a /api se redirigen al backend Express
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
});
