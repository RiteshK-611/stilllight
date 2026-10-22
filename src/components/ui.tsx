import { ActivityIndicator, Pressable, ScrollView, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Host } from '@expo/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts } from '@/theme/theme';
import { useStudio } from '@/state/studio-context';
import { Icon, type IconName } from './icon';

export function NativeHost(props: ComponentProps<typeof Host>) {
  const { dark } = useTheme();
  return <Host {...props} colorScheme={dark ? 'dark' : 'light'} />;
}

export function Copy({ children, tone = 'normal', style, ...props }: TextProps & { tone?: 'normal' | 'muted' | 'accent' }) {
  const { colors } = useTheme();
  return <Text {...props} style={[{ fontSize: 15, lineHeight: 23, color: tone === 'muted' ? colors.muted : tone === 'accent' ? colors.accent : colors.ink }, style]}>{children}</Text>;
}
export function Eyebrow({ children, style }: TextProps) {
  const { colors } = useTheme();
  return <Text style={[{ color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: '600', letterSpacing: 2 }, style]}>{children}</Text>;
}
export function Display({ children, size = 46, italic = false, style }: TextProps & { size?: number; italic?: boolean }) {
  const { colors } = useTheme();
  return <Text accessibilityRole="header" style={[{ fontFamily: italic ? fonts.italic : fonts.editorial, fontSize: size, lineHeight: size * 1.02, letterSpacing: -0.7, color: colors.ink }, style]}>{children}</Text>;
}
export function Button({ title, onPress, icon, variant = 'primary', disabled = false, loading = false, testID, style }: {
  title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; testID?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const foreground = variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.error : colors.ink;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [{ minHeight: 54, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 18, borderCurve: 'continuous',
      flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.inset : 'transparent',
      opacity: disabled ? 0.4 : pressed ? 0.72 : 1 }, style]}>
    {loading ? <ActivityIndicator color={foreground} /> : icon ? <Icon name={icon} color={foreground} size={19} /> : null}
    <Text style={{ color: foreground, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, filled, disabled, testID }: { name: IconName; label: string; onPress: () => void; filled?: boolean; disabled?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minWidth: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
    <Icon name={name} color={colors.ink} filled={filled} />
  </Pressable>;
}
export function Page({ children, style, safeTop = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; safeTop?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustKeyboardInsets
    keyboardShouldPersistTaps="handled" contentContainerStyle={[{ padding: 24, paddingTop: 24 + (safeTop ? insets.top : 0), paddingBottom: 36, gap: 24, width: '100%', maxWidth: 600, alignSelf: 'center' }, style]}>
    {children}
  </ScrollView>;
}
export function Header({ label }: { label?: string }) {
  const { colors } = useTheme();
  const { wallet, info } = useStudio();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name="sun" size={25} color={colors.accent} />
      <Text style={{ fontFamily: fonts.editorial, fontSize: 32, letterSpacing: -1, color: colors.ink }}>stilllight</Text>
      {label ? <Eyebrow style={{ paddingLeft: 4 }}>{label}</Eyebrow> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open beta credit wallet" testID="open-wallet" onPress={() => router.push('/wallet')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 42, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="sparkle" size={14} color={colors.accent} />
      <Copy style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{wallet?.available ?? '—'}</Copy>
      <Copy tone="muted" style={{ fontSize: 11 }}>{info?.mode === 'gemini' ? 'beta' : 'demo'}</Copy>
    </Pressable>
  </View>;
}
export function Notice({ children, error = false, action, actionLabel }: { children: ReactNode; error?: boolean; action?: () => void; actionLabel?: string }) {
  const { colors } = useTheme();
  return <View accessibilityRole={error ? 'alert' : undefined} style={{ padding: 16, gap: 8, borderRadius: 16, backgroundColor: error ? colors.accentSoft : colors.inset }}>
    <Copy selectable style={{ fontSize: 13, lineHeight: 20, color: error ? colors.error : colors.muted }}>{children}</Copy>
    {action && actionLabel ? <Pressable accessibilityRole="button" onPress={action} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}><Copy style={{ fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>{actionLabel}</Copy></Pressable> : null}
  </View>;
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ gap: 12 }}><Eyebrow>{title}</Eyebrow><View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 18, gap: 16 }}>{children}</View></View>;
}
