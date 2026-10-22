let database: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('stilllight-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(new Error('Photo storage is unavailable in this browser.')); };
  });
  return database;
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('photos', mode);
    const request = action(tx.objectStore('photos'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(new Error('Could not save your photo. Check available browser storage.'));
  });
}
export async function writePhoto(name: string, base64: string): Promise<string> {
  await transaction('readwrite', (store) => store.put(base64, name));
  return `idb://${name}`;
}
export async function readPhoto(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri.split(',')[1];
  const result = await transaction<string | undefined>('readonly', (store) => store.get(uri.replace('idb://', '')));
  if (!result) throw new Error('This local photo is missing. Please choose it again.');
  return result;
}
export async function resolvePhoto(uri: string): Promise<string> {
  if (!uri.startsWith('idb://')) return uri;
  return `data:image/jpeg;base64,${await readPhoto(uri)}`;
}
export async function deletePhoto(uri: string): Promise<void> {
  if (uri.startsWith('idb://')) await transaction('readwrite', (store) => store.delete(uri.replace('idb://', '')));
}
export async function clearPhotos(): Promise<void> { await transaction('readwrite', (store) => store.clear()); }
export async function exportPhoto(uri: string): Promise<void> {
  const resolved = await resolvePhoto(uri);
  const link = document.createElement('a');
  link.href = resolved; link.download = `stilllight-${Date.now()}.jpg`;
  document.body.appendChild(link); link.click(); link.remove();
}
export async function sharePhoto(uri: string): Promise<void> {
  const resolved = await resolvePhoto(uri);
  const blob = await (await fetch(resolved)).blob();
  const file = new File([blob], 'stilllight.jpg', { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Stilllight' }); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) throw error; }
  } else await exportPhoto(uri);
}
