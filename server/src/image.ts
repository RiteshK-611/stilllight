import sharp from 'sharp';
import type { LookId } from '../../src/domain/looks.ts';
import { HttpError } from './errors.ts';

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;

export async function normalizeImage(base64: unknown): Promise<Buffer> {
  if (typeof base64 !== 'string' || base64.length < 16) {
    throw new HttpError(400, 'Choose a valid JPEG, PNG, or WebP photo.', 'INVALID_IMAGE');
  }
  if (base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4) {
    throw new HttpError(413, 'Choose a photo smaller than 6 MB.', 'IMAGE_TOO_LARGE');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new HttpError(400, 'This photo could not be read. Choose a JPEG, PNG, or WebP image.', 'INVALID_IMAGE');
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'This photo is too large.', 'IMAGE_TOO_LARGE');
  try {
    const image = sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
      throw new Error('Unsupported format');
    }
    // Sharp strips EXIF by default. No original photo is written to disk.
    return await image.rotate().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  } catch {
    throw new HttpError(400, 'This photo could not be read. Try a different JPEG, PNG, or WebP image.', 'INVALID_IMAGE');
  }
}

export async function renderDemo(input: Buffer, lookId: LookId): Promise<Buffer> {
  let image = sharp(input);
  if (lookId === 'golden-hour') {
    image = image.modulate({ brightness: 1.06, saturation: 1.05 }).recomb([[1.07, 0.02, 0], [0.01, 1.01, 0], [0, 0, 0.91]]).linear(0.96, 5);
  } else if (lookId === 'direct-flash') {
    image = image.modulate({ brightness: 1.08, saturation: 0.82 }).linear(1.13, -12).sharpen({ sigma: 0.5 });
  } else {
    image = image.modulate({ brightness: 1.04, saturation: 0.87 }).linear(0.94, 9);
  }
  // These are deterministic color/exposure effects, not generative relighting.
  return image.jpeg({ quality: 92 }).toBuffer();
}
