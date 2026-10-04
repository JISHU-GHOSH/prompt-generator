import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-plugin',
      closeBundle() {
        const manifestSrc = resolve(__dirname, 'manifest.json');
        const manifestDist = resolve(__dirname, 'dist/manifest.json');
        if (fs.existsSync(manifestSrc)) {
          if (!fs.existsSync(resolve(__dirname, 'dist'))) {
            fs.mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
          }
          fs.copyFileSync(manifestSrc, manifestDist);
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'src/background/service-worker.js';
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/content-script.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
