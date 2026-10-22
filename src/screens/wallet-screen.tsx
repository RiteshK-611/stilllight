import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Copy, Display, Eyebrow, Notice, Page } from '@/components/ui';
import { Icon } from '@/components/icon';
import { useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

export function WalletScreen() {
  const studio = useStudio(); const { colors } = useTheme();
  const [working, setWorking] = useState(false); const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<void>) {
    setWorking(true); setError(null);
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'Could not refresh credits.'); }
    finally { setWorking(false); }
  }
  return <Page style={{ gap: 25 }}>
    <Stack.Title>Your credits</Stack.Title>
    <View style={{ alignItems: 'center', gap: 12, paddingTop: 15 }}>
      <View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center' }}><Icon name="sparkle" color={colors.accent} size={30} /></View>
      <Eyebrow>{studio.info?.mode === 'gemini' ? 'YOUR PILOT WALLET' : 'YOUR DEMO WALLET'}</Eyebrow>
      <Display size={88} style={{ fontVariant: ['tabular-nums'] }}>{studio.wallet?.available ?? '—'}</Display>
      <Copy tone="muted">{studio.wallet ? 'beta credits ready to use' : 'Connect the studio to see your credits'}</Copy>
      {studio.wallet?.reserved ? <Copy tone="accent" style={{ fontSize: 12 }}>{studio.wallet.reserved} credit held for your current edit</Copy> : null}
    </View>
    <View style={{ backgroundColor: colors.surface, padding: 21, borderRadius: 20, gap: 16 }}>
      {[
        ['One edit, one credit', 'A credit is held when an edit starts and used only when processing succeeds.'],
        ['Mistakes happen. Credits come back.', 'A failed or cancelled processing job returns its credit automatically.'],
        ['No subscriptions. No surprise charges.', 'This beta has no real purchases. Beta credits have no monetary value.'],
      ].map(([title, description]) => <View key={title} style={{ flexDirection: 'row', gap: 12 }}><Icon name="check" size={17} color={colors.accent} /><View style={{ flex: 1, gap: 3 }}><Copy style={{ fontSize: 13, fontWeight: '600' }}>{title}</Copy><Copy tone="muted" style={{ fontSize: 12, lineHeight: 18 }}>{description}</Copy></View></View>)}
    </View>
    {error ? <Notice error>{error}</Notice> : null}
    {studio.info?.mode === 'demo' ? <View style={{ gap: 9 }}><Button title="Add 10 demo credits · free" icon="plus" testID="refill-demo-credits" loading={working} disabled={!studio.wallet || studio.wallet.available > 2 || studio.busy} onPress={() => void run(studio.refill)} /><Copy tone="muted" style={{ textAlign: 'center', fontSize: 11 }}>Available when you have two credits or fewer. Demo refills are limited.</Copy></View> : <Notice>Live AI credits are granted by the pilot operator. Consumable purchases and purchase restoration are not enabled yet.</Notice>}
    <Button title="Refresh balance" icon="refresh" variant="secondary" disabled={working} onPress={() => void run(studio.refreshWallet)} />
    <Button title="Back to the studio" variant="ghost" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />
  </Page>;
}
