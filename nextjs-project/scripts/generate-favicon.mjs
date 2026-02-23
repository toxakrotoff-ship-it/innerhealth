/**
 * Generates favicon and app icons from Inner Health logo.
 * Downloads the black logo, inverts to white, outputs to app/.
 * Run: node scripts/generate-favicon.mjs
 */

import sharp from 'sharp';
import { writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_URL = 'https://static.tildacdn.com/tild6362-3538-4666-b766-303836613634/INNER_HEALTH_black_2.png';
const APP_DIR = join(__dirname, '..', 'src', 'app');
const TMP_DIR = join(__dirname, '..');

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function toWhiteLogo(buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .negate({ alpha: false }) // black -> white, keep transparency
    .toBuffer();
}

async function main() {
  console.log('Fetching logo...');
  const raw = await fetchImage(LOGO_URL);
  console.log('Converting to white...');
  const whitePng = await toWhiteLogo(raw);

  const sizes = [
    { name: 'icon', size: 32 },
    { name: 'apple-icon', size: 180 },
  ];

  // Padding ~12% so the logo doesn’t touch edges (looks cleaner)
  const paddingRatio = 0.88;

  for (const { name, size } of sizes) {
    const outPath = join(APP_DIR, `${name}.png`);
    const inner = Math.round(size * paddingRatio);
    const padded = await sharp(whitePng)
      .resize(inner, inner)
      .extend({
        top: Math.floor((size - inner) / 2),
        bottom: size - inner - Math.floor((size - inner) / 2),
        left: Math.floor((size - inner) / 2),
        right: size - inner - Math.floor((size - inner) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    await sharp(padded).resize(size, size).png().toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }

  // favicon.ico (multi-size 16+32) with same padding
  const ts = Date.now();
  const icon16Path = join(TMP_DIR, `favicon-${ts}-16.png`);
  const icon32Path = join(TMP_DIR, `favicon-${ts}-32.png`);
  const size16 = 16;
  const size32 = 32;
  const inner16 = Math.round(size16 * paddingRatio);
  const inner32 = Math.round(size32 * paddingRatio);
  const pad = (s, inner) => ({
    top: Math.floor((s - inner) / 2),
    bottom: s - inner - Math.floor((s - inner) / 2),
    left: Math.floor((s - inner) / 2),
    right: s - inner - Math.floor((s - inner) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  await sharp(whitePng).resize(inner16, inner16).extend(pad(size16, inner16)).png().toFile(icon16Path);
  await sharp(whitePng).resize(inner32, inner32).extend(pad(size32, inner32)).png().toFile(icon32Path);
  const ico = await pngToIco([icon16Path, icon32Path]);
  const faviconPath = join(APP_DIR, 'favicon.ico');
  await writeFile(faviconPath, ico);
  await unlink(icon16Path).catch(() => {});
  await unlink(icon32Path).catch(() => {});
  console.log(`Wrote ${faviconPath}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
