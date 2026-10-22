import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';
import type { ComponentRef, Ref } from 'react';
import { useTheme } from '@/theme/theme';
import { Icon, type IconName } from './icon';

function TabButton({ children, isFocused, icon, ref, ...props }: Omit<TabTriggerSlotProps, 'ref'> & { icon: IconName; ref?: Ref<ComponentRef<typeof View>> }) {
  const { colors } = useTheme();
  return <Pressable {...props} ref={ref} accessibilityRole="tab" aria-selected={Boolean(isFocused)} accessibilityState={{ selected: isFocused }}
    style={({ pressed }) => ({ flex: 1, minHeight: 62, gap: 5, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
    <Icon name={icon} color={isFocused ? colors.accent : colors.muted} size={21} />
    <Text style={{ fontSize: 10, letterSpacing: 0.2, fontWeight: isFocused ? '600' : '400', color: isFocused ? colors.accent : colors.muted }}>{children}</Text>
  </Pressable>;
}
export default function AppTabs() {
  const { colors } = useTheme();
  return <Tabs style={{ flex: 1, backgroundColor: colors.background }}>
    <TabSlot style={{ flex: 1 }} />
    <TabList asChild><View role="tablist" accessibilityRole="tablist" accessibilityLabel="Main navigation" style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: 5 }}>
      <TabTrigger name="studio" href="/" asChild><TabButton icon="sun">Studio</TabButton></TabTrigger>
      <TabTrigger name="collection" href="/collection" asChild><TabButton icon="grid">Collection</TabButton></TabTrigger>
      <TabTrigger name="settings" href="/settings" asChild><TabButton icon="settings">Settings</TabButton></TabTrigger>
    </View></TabList>
  </Tabs>;
}
