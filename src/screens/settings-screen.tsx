import { Switch, TextInput } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Copy, Display, Eyebrow, Header, Notice, Page, Section, NativeHost as Host } from '@/components/ui';
import { Icon } from '@/components/icon';
import { confirmAction } from '@/lib/confirm';
import { normalizeApiUrl } from '@/lib/api';
import { useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

export function SettingsScreen() {
  const { colors } = useTheme(); const studio = useStudio();
  const [url, setUrl] = useState(studio.settings.apiUrl); const [invite, setInvite] = useState('');
  const [working, setWorking] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  async function run(name: string, task: () => Promise<void>, message?: string) {
    setError(null); setNotice(null); setWorking(name);
    try { await task(); if (message) setNotice(message); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save that change.'); }
    finally { setWorking(null); }
  }
  async function saveServer() {
    await studio.updateSettings({ apiUrl: url });
    await studio.connect(invite || undefined, normalizeApiUrl(url)); setInvite('');
  }
  return <Page safeTop>
    <Header /><View style={{ gap: 10 }}><Eyebrow>KEEP THINGS YOUR WAY.</Eyebrow><Display>A quieter studio.</Display><Copy tone="muted">A few preferences. Nothing extra.</Copy></View>
    {error ? <Notice error>{error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    <Section title="THE STUDIO CONNECTION">
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: studio.wallet ? colors.success : colors.error }} /><Copy style={{ fontSize: 13, fontWeight: '600' }}>{studio.wallet ? (studio.info?.mode === 'gemini' ? 'Connected · Gemini pilot' : 'Connected · Demo mode') : 'Not connected'}</Copy></View>
      <Copy tone="muted" style={{ fontSize: 12, lineHeight: 19 }}>For phone testing, use your computer’s LAN address, not localhost. Your phone and computer must be on the same network.</Copy>
      <View style={{ gap: 7 }}><Copy style={{ fontSize: 11, fontWeight: '600' }}>API server address</Copy><Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: 52 }}>
        <TextInput key={studio.settings.apiUrl} testID="server-url" defaultValue={studio.settings.apiUrl} placeholder="http://192.168.1.100:3001" autoCapitalize="none" autoCorrect={false} inputMode="url" onChangeText={setUrl}
          editable={!studio.busy && !working} style={{ backgroundColor: colors.inset, padding: 14, borderRadius: 12 }} textStyle={{ color: colors.ink, fontSize: 13 }} />
      </Host></View>
      <View style={{ gap: 7 }}><Copy style={{ fontSize: 11, fontWeight: '600' }}>Pilot invite code · live AI only</Copy><Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: 50 }}>
        <TextInput testID="pilot-invite" defaultValue="" placeholder="Not needed in demo mode" secureTextEntry autoCapitalize="none" autoCorrect={false} onChangeText={setInvite}
          style={{ backgroundColor: colors.inset, padding: 14, borderRadius: 12 }} textStyle={{ color: colors.ink, fontSize: 13 }} />
      </Host></View>
      <Button title="Save & connect" testID="connect-server" icon="refresh" variant="secondary" disabled={Boolean(working) || studio.busy} loading={working === 'connect'} onPress={() => void run('connect', saveServer, 'Connected to the studio.')} />
      {studio.connectionError ? <Copy selectable style={{ fontSize: 12, color: colors.error }}>{studio.connectionError}</Copy> : null}
      <Copy tone="muted" style={{ fontSize: 10, lineHeight: 17 }}>Never enter an AI API key here. Keys belong only in server/.env. Adding a key alone does not enable paid processing.</Copy>
    </Section>
    <Section title="MAKE YOURSELF AT HOME">
      <Copy style={{ fontSize: 13, fontWeight: '600' }}>Appearance</Copy>
      <View style={{ flexDirection: 'row', gap: 7 }}>{(['system', 'light', 'dark'] as const).map((appearance) => <Pressable key={appearance} accessibilityRole="button" aria-pressed={studio.settings.appearance === appearance} accessibilityState={{ selected: studio.settings.appearance === appearance }}
        onPress={() => void run('theme', () => studio.updateSettings({ appearance }))} style={{ minHeight: 44, flex: 1, borderRadius: 12, backgroundColor: studio.settings.appearance === appearance ? colors.ink : colors.inset, alignItems: 'center', justifyContent: 'center' }}>
        <Copy style={{ color: studio.settings.appearance === appearance ? colors.background : colors.ink, fontSize: 12 }}>{appearance[0].toUpperCase() + appearance.slice(1)}</Copy>
      </Pressable>)}</View>
      <Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: 48 }}><Switch label="Gentle haptic feedback" value={studio.settings.haptics} onValueChange={(haptics) => void run('haptics', () => studio.updateSettings({ haptics }))} /></Host>
    </Section>
    <Section title="YOUR PHOTOS ARE YOURS">
      <Copy tone="muted" style={{ fontSize: 12 }}>Your collection is stored locally. We do not write photo uploads to the server database. Server previews expire after a short time.</Copy>
      <Button title="Privacy & beta details" icon="shield" variant="secondary" onPress={() => router.push('/privacy')} />
      <Button title="Delete local collection" icon="trash" variant="danger" disabled={Boolean(working) || studio.busy} loading={working === 'clear'} onPress={() => void (async () => {
        if (await confirmAction('Delete your local collection?', 'This deletes all Stilllight working copies and edited images on this device. Files already exported to Photos or Downloads are not deleted.')) await run('clear', studio.clearCollection, 'Your local collection has been deleted.');
      })()} />
      <Button title="Delete beta session & data" variant="danger" disabled={Boolean(working) || studio.busy} loading={working === 'account'} onPress={() => void (async () => {
        if (await confirmAction('Delete your beta session?', 'This deletes your server session, beta credit balance, edit metadata, temporary server previews, and local collection. This action cannot be undone.')) await run('account', studio.deleteAccount, 'Your beta session and local data have been deleted.');
      })()} />
    </Section>
    <View style={{ alignItems: 'center', gap: 7, paddingBottom: 8 }}><Icon name="sun" color={colors.accent} size={24} /><Copy tone="muted" style={{ fontSize: 10, letterSpacing: 1.2 }}>STILLLIGHT · PRIVATE BETA 0.1</Copy><Copy tone="muted" style={{ fontSize: 10 }}>Working name. Made to find your light.</Copy></View>
  </Page>;
}
