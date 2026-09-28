import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Carimba o service worker com a data do build para que cada deploy troque o cache offline.
const versionarServiceWorker = {
  name: 'versionar-service-worker',
  apply: 'build',
  writeBundle({ dir }) {
    const arquivo = resolve(dir, 'sw.js');
    const versao = new Date().toISOString().replace(/\D/g, '');
    writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replace('__VERSAO__', versao));
  },
};

export default defineConfig({
  plugins: [versionarServiceWorker],
  // O SDK do Firestore com cache offline é grande (~190 kB compactado); fica guardado pelo service worker.
  build: { chunkSizeWarningLimit: 800 },
});
