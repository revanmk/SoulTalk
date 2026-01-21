import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
    plugins: [react()],
    // Vite automatically exposes VITE_ prefixed env vars via import.meta.env
    // No need to manually define them
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
  };
});
