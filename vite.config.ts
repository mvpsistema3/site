import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3011,
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: ['dev-site.grupogot.com'],
      },
      plugins: [react()],
      // SECURITY: API keys removidas do bundle do cliente (V-011).
      // Se necessário, acessar via Edge Function no backend.
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
