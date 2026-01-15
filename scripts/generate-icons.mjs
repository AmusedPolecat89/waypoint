import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'icons');

const sizes = [16, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    const svgPath = join(publicDir, `icon-${size}.svg`);
    const pngPath = join(publicDir, `icon-${size}.png`);

    const svgBuffer = readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);

    console.log(`Generated ${pngPath}`);
  }
}

generateIcons().catch(console.error);
