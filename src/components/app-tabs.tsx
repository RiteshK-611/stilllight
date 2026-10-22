import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/theme/theme';

export default function AppTabs() {
  const { colors } = useTheme();
  return <NativeTabs backgroundColor={colors.background} tintColor={colors.accent} indicatorColor={colors.accentSoft}
      labelStyle={{ default: { color: colors.muted, fontSize: 11 }, selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index" accessibilityLabel="Studio">
        <NativeTabs.Trigger.Label>Studio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.max" md="light_mode" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collection" accessibilityLabel="Collection">
        <NativeTabs.Trigger.Label>Collection</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" accessibilityLabel="Settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="tune" />
      </NativeTabs.Trigger>
    </NativeTabs>;
}
