import path from 'node:path';
import { fileURLToPath } from 'node:url';

import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const duneSrc = path.resolve(root, '../../packages/dune-charts/src');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: {
      // Hot-reload package source instead of stale dist
      '@suveshmoza/dune-charts/styles.css': path.join(duneSrc, 'styles.css'),
      '@suveshmoza/dune-charts': path.join(duneSrc, 'index.ts'),
    },
  },
  server: {
    watch: {
      ignored: ['!**/packages/dune-charts/src/**'],
    },
  },
});
