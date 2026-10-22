import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import type { DraftPhoto } from '@/domain/api';

export const LOOK_IMAGES = {
  'golden-hour': require('../../assets/photos/golden-hour.jpg'),
  'direct-flash': require('../../assets/photos/direct-flash.jpg'),
  'soft-studio': require('../../assets/photos/soft-studio.jpg'),
};
export const SAMPLE_IMAGE = require('../../assets/photos/original.jpg');

export async function samplePhoto(): Promise<DraftPhoto> {
  const asset = Asset.fromModule(SAMPLE_IMAGE);
  await asset.downloadAsync();
  return { uri: asset.localUri ?? asset.uri, width: asset.width ?? 1000, height: asset.height ?? 1400, isSample: true };
}

export async function preparePhoto(photo: DraftPhoto) {
  const context = ImageManipulator.manipulate(photo.uri, { maxWidth: 1536, maxHeight: 1536 });
  if (photo.width > 1536 || photo.height > 1536) {
    const ratio = Math.min(1536 / photo.width, 1536 / photo.height);
    context.resize({ width: Math.round(photo.width * ratio), height: Math.round(photo.height * ratio) });
  }
  const rendered = await context.renderAsync();
  try {
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.86, base64: true });
    if (!result.base64) throw new Error('Could not read this photo. Choose another image.');
    return { base64: result.base64, width: result.width, height: result.height };
  } finally { rendered.release(); context.release(); }
}
