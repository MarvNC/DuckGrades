import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function injectDataVersion(): import('vite').Plugin {
  const versionFilePath = join(process.cwd(), 'public/data/current-version.json');

  function readVersion(): string | null {
    try {
      const raw = readFileSync(versionFilePath, 'utf8');
      const parsed = JSON.parse(raw) as { version?: string };
      return typeof parsed.version === 'string' && parsed.version.length > 0
        ? parsed.version
        : null;
    } catch {
      return null;
    }
  }

  return {
    name: 'inject-data-version',
    config() {
      const version = readVersion();
      if (!version) {
        return {};
      }
      return {
        define: {
          'import.meta.env.VITE_DATA_VERSION': JSON.stringify(version),
        },
      };
    },
  };
}

export default defineConfig({
  plugins: [injectDataVersion(), react(), tailwindcss()],
  build: {
    emptyOutDir: false,
    copyPublicDir: false,
  },
});
