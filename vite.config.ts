import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react() as any,
    {
      name: 'extension-packaging-plugin',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }

        // Copy and transform manifest.json (.ts -> .js)
        const manifestSrc = resolve(__dirname, 'manifest.json');
        const manifestDist = resolve(distDir, 'manifest.json');
        if (fs.existsSync(manifestSrc)) {
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

        // Copy content script CSS to dist/src/content/content.css
        const contentCssSrc = resolve(__dirname, 'src/content/content.css');
        const contentCssDistDir = resolve(distDir, 'src/content');
        const contentCssDist = resolve(contentCssDistDir, 'content.css');
        if (fs.existsSync(contentCssSrc)) {
          if (!fs.existsSync(contentCssDistDir)) {
            fs.mkdirSync(contentCssDistDir, { recursive: true });
          }
          fs.copyFileSync(contentCssSrc, contentCssDist);
        }

        // Ensure icons directory in dist
        const iconsSrcDir = resolve(__dirname, 'public/icons');
        const iconsDistDir = resolve(distDir, 'icons');
        if (fs.existsSync(iconsSrcDir)) {
          if (!fs.existsSync(iconsDistDir)) {
            fs.mkdirSync(iconsDistDir, { recursive: true });
          }
          const iconFiles = fs.readdirSync(iconsSrcDir);
          for (const iconFile of iconFiles) {
            fs.copyFileSync(resolve(iconsSrcDir, iconFile), resolve(iconsDistDir, iconFile));
          }
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
