import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

// Sito statico multi-pagina (nessun framework): Vite serve gli .html e i file in src/.
export default defineConfig({
  root: '.',
  server: { open: true, port: 5173 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        ecosistema: resolve(root, 'ecosistema.html'),
        obiettivo: resolve(root, 'obiettivo-fondo.html'),
        motore: resolve(root, 'motore-mappa.html')
      }
    }
  }
});
