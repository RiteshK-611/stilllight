// Web preview only. Native builds use the OS Keychain/Keystore instead.
const key = (origin: string) => `stilllight.session.${origin}`;
export async function getSession(origin: string) { return typeof window === 'undefined' ? null : localStorage.getItem(key(origin)); }
export async function setSession(origin: string, token: string) { localStorage.setItem(key(origin), token); }
export async function deleteSession(origin: string) { localStorage.removeItem(key(origin)); }
