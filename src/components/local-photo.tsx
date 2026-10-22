import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { resolvePhoto } from '@/lib/photo-store';
import { useTheme } from '@/theme/theme';
import { Icon } from './icon';

export function LocalPhoto({ uri, style, accessibilityLabel, contentFit = 'cover' }: { uri: string; style: ImageProps['style']; accessibilityLabel?: string; contentFit?: ImageProps['contentFit'] }) {
  return <ResolvedPhoto key={uri} uri={uri} style={style} accessibilityLabel={accessibilityLabel} contentFit={contentFit} />;
}

function ResolvedPhoto({ uri, style, accessibilityLabel, contentFit }: { uri: string; style: ImageProps['style']; accessibilityLabel?: string; contentFit?: ImageProps['contentFit'] }) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { colors } = useTheme();
  useEffect(() => {
    let active = true;
    void resolvePhoto(uri).then((value) => { if (active) setResolved(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [uri]);
  if (!resolved || error) return <View accessibilityLabel={error ? 'Local photo unavailable' : 'Loading photo'} style={[style, { backgroundColor: colors.inset, justifyContent: 'center', alignItems: 'center' }]}>
    {error ? <Icon name="image" color={colors.muted} /> : <ActivityIndicator color={colors.muted} />}
  </View>;
  return <Image source={{ uri: resolved }} style={style} contentFit={contentFit} accessibilityLabel={accessibilityLabel} onError={() => setError(true)} recyclingKey={uri} />;
}
