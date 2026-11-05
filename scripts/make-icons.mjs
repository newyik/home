import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));

const targets = [
  ['public/icons/apple-touch-icon.png', 180],
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/maskable-512.png', 512],
  ['public/icons/icon-1024.png', 1024],
];

for (const [target, size] of targets) {
  let image = sharp(svg, { density: 384 }).resize(size, size, { fit: 'cover' });
  if (target.includes('apple-touch') || target.includes('maskable')) {
    image = image.flatten({ background: '#df5833' });
  }
  await image.png({ compressionLevel: 9 }).toFile(path.resolve(process.cwd(), target));
  console.log(`wrote ${target} (${size}px)`);
}
