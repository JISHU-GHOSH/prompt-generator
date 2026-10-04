import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react() as any,
    {
      name: 'copy-manifest-plugin',
      closeBundle() {
        const manifestSrc = resolve(__dirname, 'manifest.json');
        const manifestDist = resolve(__dirname, 'dist/manifest.json');
        if (fs.existsSync(manifestSrc)) {
          if (!fs.existsSync(resolve(__dirname, 'dist'))) {
            fs.mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
          }
          const raw = fs.readFileSync(manifestSrc, 'utf-8');
          const manifest = JSON.parse(raw);
          if (manifest.background && typeof manifest.background.service_worker === 'string') {
            manifest.background.service_worker = manifest.background.service_worker.replace(/\.ts$/, '.js');
          }
          if (Array.isArray(manifest.content_scripts)) {
            manifest.content_scripts = manifest.content_scripts.map((cs: { js?: string[] }) => {
              if (Array.isArray(cs.js)) {
                return {
                  ...cs,
                  js: cs.js.map((script: string) => script.replace(/\.ts$/, '.js')),
                };
              }
              return cs;
            });
          }
          fs.writeFileSync(manifestDist, JSON.stringify(manifest, null, 2));
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
