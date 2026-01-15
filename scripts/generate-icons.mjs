import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');

const sizes = [16, 48, 128];

async function generateIcons() {
  const svgPath = join(iconsDir, 'icon.svg');
  const svgBuffer = readFileSync(svgPath);

  for (const size of sizes) {
    const pngPath = join(iconsDir, `icon-${size}.png`);

    await sharp(svgBuffer, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(pngPath);

    console.log(`Generated ${pngPath}`);
  }
}

generateIcons().catch(console.error);
