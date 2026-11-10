import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = (process.env.API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
const destino = join(raiz, 'public', 'config.js');

mkdirSync(dirname(destino), { recursive: true });

writeFileSync(
  destino,
  `window.__DOALINK_CONFIG__ = ${JSON.stringify({ apiUrl }, null, 2)};\n`,
  'utf8'
);

console.log(`[CONFIG] API_URL=${apiUrl}`);
