import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderDemo } from '../src/image.ts';
import { LOOKS } from '../../src/domain/looks.ts';

const root = fileURLToPath(new URL('../../assets/', import.meta.url));
await mkdir(`${root}/photos`, { recursive: true });
await mkdir(`${root}/fonts`, { recursive: true });

const photoUrl = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=88';
const response = await fetch(photoUrl);
if (!response.ok) throw new Error('Could not download the licensed sample photo.');
const original = await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1000, 1400, { fit: 'cover', position: 'attention' }).jpeg({ quality: 88 }).toBuffer();
await writeFile(`${root}/photos/original.jpg`, original);
for (const look of LOOKS) {
  const image = await renderDemo(original, look.id);
  await writeFile(`${root}/photos/${look.id}.jpg`, image);
}

for (const face of ['Regular', 'Italic']) {
  const font = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-${face}.ttf`);
  if (!font.ok) throw new Error(`Could not download the ${face} font.`);
  await writeFile(`${root}/fonts/InstrumentSerif-${face}.ttf`, Buffer.from(await font.arrayBuffer()));
}
const license = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/OFL.txt');
if (license.ok) await writeFile(`${root}/fonts/OFL.txt`, await license.text());

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#F6F2EA"/><circle cx="512" cy="512" r="246" fill="none" stroke="#26251F" stroke-width="24"/><circle cx="512" cy="512" r="128" fill="#C34D36"/><g stroke="#26251F" stroke-width="24" stroke-linecap="round"><path d="M512 178v68M512 778v68M178 512h68M778 512h68M276 276l48 48M700 700l48 48M276 748l48-48M700 324l48-48"/></g></svg>`;
await sharp(Buffer.from(icon)).png().toFile(`${root}/images/stilllight-icon.png`);
await sharp(Buffer.from(icon)).resize(64, 64).png().toFile(`${root}/images/stilllight-favicon.png`);
console.log('Prepared sample photos, OFL fonts, and original app artwork. No AI requests were made.');
