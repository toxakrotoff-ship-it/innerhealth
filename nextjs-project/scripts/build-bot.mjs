import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

await build({
  absWorkingDir: projectRoot,
  entryPoints: ['scripts/telegram-bot.ts', 'scripts/max-bot.ts'],
  outdir: 'dist-bot',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  packages: 'external',
  tsconfig: path.join(projectRoot, 'tsconfig.json'),
  alias: {
    '@': path.join(projectRoot, 'src'),
  },
  logLevel: 'info',
});
