/// <reference types='vitest' />
import path from 'path';

import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tailwindcss from '@tailwindcss/vite';
import customHtmlPlugin from './vite-plugins/html-plugin';

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve' || mode === 'development';

  const AP_TITLE = isDev ? 'Activepieces' : '${AP_APP_TITLE}';

  const AP_FAVICON = isDev
    ? 'https://activepieces.com/favicon.ico'
    : '${AP_FAVICON_URL}';

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/web',
    server: {
      allowedHosts: ['overdiversely-preeruptive-margaretta.ngrok-free.dev'],
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          secure: false,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: {
            Host: '127.0.0.1:4300',
          },
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              if (err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED')) {
                return;
              }
              console.error('[vite] proxy error:', err.message);
            });
          },
        },
      },
      port: 4300,
      host: '0.0.0.0',
    },

    preview: {
      port: 4300,
      host: 'localhost',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@activepieces/shared': path.resolve(
          __dirname,
          '../../packages/shared/src',
        ),
        'ee-embed-sdk': path.resolve(
          __dirname,
          '../../packages/ee/embed-sdk/src',
        ),
        '@activepieces/pieces-framework': path.resolve(
          __dirname,
          '../../packages/pieces/framework/src',
        ),
        '@activepieces/pieces-common': path.resolve(
          __dirname,
          '../../packages/pieces/common/src',
        ),
      },
    },
    optimizeDeps: {
      include: ['@activepieces/shared', '@activepieces/pieces-framework', '@activepieces/pieces-common'],
      esbuildOptions: {
        loader: {
          '.ts': 'ts',
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      customHtmlPlugin({
        title: AP_TITLE,
        icon: AP_FAVICON,
      }),
      ...(isDev
        ? [
            checker({
              typescript: {
                buildMode: true,
                tsconfigPath: './tsconfig.json',
                root: __dirname,
              },
            }),
          ]
        : []),
    ],

    build: {
      outDir: '../../dist/packages/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        onLog(level, log, handler) {
          if (
            log.cause &&
            log.message.includes(`Can't resolve original location of error.`)
          ) {
            return;
          }
          handler(level, log);
        },
      },
    },
  };
});
