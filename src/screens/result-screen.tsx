import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ComparePhoto } from '@/components/compare-photo';
import { Button, Copy, Display, Eyebrow, IconButton, Notice, Page } from '@/components/ui';
import { getLook } from '@/domain/looks';
import { confirmAction } from '@/lib/confirm';
import { exportPhoto, sharePhoto } from '@/lib/photo-store';
import { useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

export function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const studio = useStudio(); const { colors } = useTheme();
  const entry = studio.history.find((item) => item.id === id);
  const [action, setAction] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  async function perform(name: string, task: () => Promise<void>, success?: string) {
    setAction(name); setError(null); setNotice(null);
    try { await task(); if (success) setNotice(success); studio.haptic('success'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not finish that action.'); }
    finally { setAction(null); }
  }
  async function remove() {
    if (!entry || !await confirmAction('Delete this edit?', 'This removes the original working copy and edited photo from Stilllight on this device. Photos you already exported are not affected.')) return;
    await perform('delete', async () => { await studio.removeEdit(entry.id); router.navigate('/collection'); });
  }
  if (!entry) return <Page><Display>This moment isn’t here.</Display><Copy tone="muted">The edit may have been deleted or belongs to another device.</Copy><Button title="Open your collection" onPress={() => router.navigate('/collection')} /></Page>;
  const look = getLook(entry.lookId);
  return <Page style={{ gap: 21 }}>
    <Stack.Title>Your new light</Stack.Title>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><View style={{ flex: 1, gap: 8 }}><Eyebrow>{look.detail}</Eyebrow><Display size={39}>{look.tagline}</Display></View>
      <IconButton testID="favorite-edit" name="heart" label={entry.favorite ? 'Remove favorite' : 'Mark as favorite'} filled={entry.favorite} disabled={Boolean(action)} onPress={() => void perform('favorite', () => studio.toggleFavorite(entry.id))} />
    </View>
    <ComparePhoto originalUri={entry.originalUri} resultUri={entry.resultUri} aspectRatio={entry.width / entry.height} demo={entry.mode === 'demo'} />
    <Copy tone="muted" style={{ textAlign: 'center', fontSize: 11 }}>Drag the divider to find the difference. Your original is unchanged.</Copy>
    {error ? <Notice error>{error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    <Button title="Save photo" icon="download" testID="save-photo" loading={action === 'save'} disabled={Boolean(action)} onPress={() => void perform('save', () => exportPhoto(entry.resultUri), 'Your photo has been exported. On web, check your browser downloads.')} />
    <View style={{ flexDirection: 'row', gap: 10 }}><Button title="Share photo" icon="share" variant="secondary" loading={action === 'share'} disabled={Boolean(action)} onPress={() => void perform('share', () => sharePhoto(entry.resultUri))} style={{ flex: 1 }} /><IconButton name="trash" label="Delete this edit" disabled={Boolean(action)} onPress={() => void remove()} /></View>
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16, gap: 7 }}>
      <Copy tone="muted" style={{ fontSize: 11 }}>Saved to your collection on this device · {entry.width} × {entry.height}</Copy>
      <Copy tone="muted" style={{ fontSize: 11 }}>{entry.mode === 'demo' ? 'Demo color/exposure effect. This image was not generated with AI.' : 'AI-edited image. Please review faces and details before sharing.'}</Copy>
    </View>
    <Button title="Make another moment" icon="plus" variant="ghost" onPress={() => router.navigate('/')} />
  </Page>;
}
