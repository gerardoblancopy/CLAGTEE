import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isServerlessPort = process.env.PORT === '3002' || process.argv.some(arg => arg.includes('3002')) || Boolean(process.env.VERCEL);
    return {
      appType: 'spa',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: isServerlessPort ? undefined : {
            '/api': {
                target: env.VITE_API_URL || 'https://clagtee2026.org',
                changeOrigin: true,
                secure: false,
            },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
