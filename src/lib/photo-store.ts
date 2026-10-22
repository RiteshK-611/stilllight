import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const folder = () => {
  const directory = new Directory(Paths.document, 'stilllight');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
};

export async function writePhoto(name: string, base64: string): Promise<string> {
  const file = new File(folder(), `${name}.jpg`);
  file.create({ overwrite: true });
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  await file.write(bytes);
  return file.uri;
}
export async function readPhoto(uri: string): Promise<string> { return new File(uri).base64(); }
export async function resolvePhoto(uri: string): Promise<string> { return uri; }
export async function deletePhoto(uri: string): Promise<void> {
  if (!uri.startsWith(folder().uri)) return;
  const file = new File(uri); if (file.exists) file.delete();
}
export async function clearPhotos(): Promise<void> { const directory = folder(); directory.delete(); }

export async function exportPhoto(uri: string): Promise<void> {
  const permissions = await requestPermissionsAsync(true, ['photo']);
  if (!permissions.granted) throw new Error('Allow photo-library access in your device settings to save this image. You can also use Share.');
  await Asset.create(uri);
}
export async function sharePhoto(uri: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available on this device. Use Save photo instead.');
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share your Stilllight photo' });
}
