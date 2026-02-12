import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rmSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.argv.includes('--production');
const outDir = resolve(__dirname, '../public/workers');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(__dirname, '../src/workers/metricsWorker.ts')],
  bundle: true,
  outfile: resolve(outDir, 'metricsWorker.js'),
  format: 'iife',
  target: 'es2020',
  minify: isProduction,
  sourcemap: !isProduction,
});

console.log('Worker built successfully.');
