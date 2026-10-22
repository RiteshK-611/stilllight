import { useColorScheme } from 'react-native';
import { useSyncExternalStore } from 'react';
import { useStudio } from '@/state/studio-context';

export const palette = {
  light: {
    background: '#F8F5EF', surface: '#FFFDFA', inset: '#EEEAE2', ink: '#26251F',
    muted: '#66635C', subtle: '#706D65', line: '#E2DDD3', accent: '#BB472F',
    onAccent: '#FFFFFF', accentSoft: '#F5E3DC', success: '#3F6856', error: '#AE382D',
  },
  dark: {
    background: '#191A17', surface: '#22231F', inset: '#2E302A', ink: '#F6F2E9',
    muted: '#B1B0A4', subtle: '#A29F94', line: '#3D3F36', accent: '#EF957D',
    onAccent: '#261A15', accentSoft: '#3A2922', success: '#A1C9AD', error: '#FFABA0',
  },
};

export type Theme = typeof palette.light;
export const fonts = { editorial: 'Editorial', italic: 'EditorialItalic' };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useTheme() {
  const system = useColorScheme();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { settings } = useStudio();
  const dark = hydrated && (settings.appearance === 'dark' || (settings.appearance === 'system' && system === 'dark'));
  return { colors: palette[dark ? 'dark' : 'light'], dark };
}
