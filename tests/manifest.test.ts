import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Manifest V3 Configuration', () => {
  it('should have a valid manifest.json with required MV3 fields and icon assets', () => {
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('PromptForge AI - Professional Coding Prompt Generator');
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');

    // Verify icons exist on disk
    for (const size of ['16', '48', '128']) {
      const iconFile = path.resolve(__dirname, `../public/icons/icon-${size}.png`);
      expect(fs.existsSync(iconFile), `Missing icon-${size}.png`).toBe(true);
    }
  });

  it('should have all required artifacts in dist if build is run', () => {
    const distPath = path.resolve(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
      const distManifest = path.resolve(distPath, 'manifest.json');
      expect(fs.existsSync(distManifest)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(distManifest, 'utf-8'));
      expect(manifest.background.service_worker).toBe('src/background/service-worker.js');

      expect(fs.existsSync(path.resolve(distPath, 'src/background/service-worker.js'))).toBe(true);
      expect(fs.existsSync(path.resolve(distPath, 'src/sidepanel/index.html'))).toBe(true);
      expect(fs.existsSync(path.resolve(distPath, 'src/content/content-script.js'))).toBe(true);
      expect(fs.existsSync(path.resolve(distPath, 'src/content/content.css'))).toBe(true);
      for (const size of ['16', '48', '128']) {
        expect(fs.existsSync(path.resolve(distPath, `icons/icon-${size}.png`))).toBe(true);
      }
    }
  });
});
