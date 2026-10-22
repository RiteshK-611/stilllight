import * as SecureStore from 'expo-secure-store';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

async function key(origin: string) {
  return `stilllight.session.${await digestStringAsync(CryptoDigestAlgorithm.SHA256, origin)}`;
}
export async function getSession(origin: string) { return SecureStore.getItemAsync(await key(origin)); }
export async function setSession(origin: string, token: string) { return SecureStore.setItemAsync(await key(origin), token); }
export async function deleteSession(origin: string) { return SecureStore.deleteItemAsync(await key(origin)); }
