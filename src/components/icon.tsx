import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Platform } from 'react-native';

export type IconName = 'sun' | 'flash' | 'image' | 'arrow' | 'camera' | 'grid' | 'settings' | 'heart' | 'share' | 'download' | 'check' | 'close' | 'shield' | 'plus' | 'refresh' | 'trash' | 'chevron' | 'sparkle';
export function Icon({ name, size = 22, color = 'currentColor', filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={true}>
    {name === 'sun' && <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
    {name === 'flash' && <Path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />}
    {name === 'image' && <><Rect x="3" y="3" width="18" height="18" rx="4" /><Circle cx="8.5" cy="8.5" r="1.5" /><Path d="m3 17 5-5 4 4 4-6 5 7" /></>}
    {name === 'arrow' && <Path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === 'camera' && <><Path d="M3 7h4l2-3h6l2 3h4v13H3V7Z" /><Circle cx="12" cy="13" r="4" /></>}
    {name === 'grid' && <><Rect x="3" y="3" width="7" height="7" rx="1.8" /><Rect x="14" y="3" width="7" height="7" rx="1.8" /><Rect x="3" y="14" width="7" height="7" rx="1.8" /><Rect x="14" y="14" width="7" height="7" rx="1.8" /></>}
    {name === 'settings' && <><Path d="M4 6h16M4 12h16M4 18h16" /><Circle cx="8" cy="6" r="2" fill={color} /><Circle cx="16" cy="12" r="2" fill={color} /><Circle cx="10" cy="18" r="2" fill={color} /></>}
    {name === 'heart' && <Path fill={filled ? color : 'none'} d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />}
    {name === 'share' && <><Path d="M12 15V3m-4 4 4-4 4 4M6 10H4v11h16V10h-2" /></>}
    {name === 'download' && <Path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />}
    {name === 'check' && <Path d="m5 12 4 4L19 6" />}
    {name === 'close' && <Path d="m6 6 12 12M6 18 18 6" />}
    {name === 'shield' && <><Path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><Path d="m8.5 12 2.3 2.3 4.7-5" /></>}
    {name === 'plus' && <Path d="M12 4v16M4 12h16" />}
    {name === 'refresh' && <><Path d="M20 7v5h-5M4 17v-5h5" /><Path d="M5.5 8a7 7 0 0 1 11.7-3L20 8M4 16l2.8 3A7 7 0 0 0 18.5 16" /></>}
    {name === 'trash' && <><Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>}
    {name === 'chevron' && <Path d="m9 5 7 7-7 7" />}
    {name === 'sparkle' && <><Path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z" /><Line x1="20" y1="2" x2="20" y2="6" /><Line x1="18" y1="4" x2="22" y2="4" /></>}
  </Svg>;
}
