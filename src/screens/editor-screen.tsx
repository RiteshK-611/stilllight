import { Switch } from '@expo/ui';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { LocalPhoto } from '@/components/local-photo';
import { Button, Copy, Display, Eyebrow, Notice, Page, NativeHost as Host } from '@/components/ui';
import { Icon } from '@/components/icon';
import { LOOKS, getLook } from '@/domain/looks';
import { LOOK_IMAGES } from '@/lib/prepare-photo';
import { usePhotoPicker } from '@/hooks/use-photo-picker';
import { useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

const stages: Record<string, string> = { preparing: 'Preparing your photo', uploading: 'Sending it to the studio', processing: 'Finding your new light', saving: 'Saving your photo locally' };

export function EditorScreen() {
  const { colors } = useTheme(); const studio = useStudio(); const picker = usePhotoPicker();
  const [consent, setConsent] = useState(false); const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false); const navigated = useRef<string | null>(null);
  const draft = studio.draft;
  const photo = draft?.uri ?? studio.pending?.originalUri;
  const look = getLook(studio.pending?.lookId ?? studio.selectedLook);
  useEffect(() => {
    if (studio.activity.phase === 'succeeded' && studio.activity.savedId && navigated.current !== studio.activity.savedId) {
      navigated.current = studio.activity.savedId; router.replace(`/result/${studio.activity.savedId}`);
    }
  }, [studio.activity.phase, studio.activity.savedId]);

  async function run() {
    setError(null);
    try { await (studio.pending ? studio.resume() : studio.generate()); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not start this edit.'); }
  }
  async function cancel() {
    setCancelling(true); setError(null);
    try { await studio.cancel(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not confirm cancellation. Keep this edit open and try again.'); }
    finally { setCancelling(false); }
  }
  if (!photo) return <Page><Display>A little light starts with a photo.</Display><Copy tone="muted">Choose a photo from your camera roll to get started.</Copy><Button title="Choose a photo" icon="image" onPress={() => void picker.pick()} />{picker.error ? <Notice error>{picker.error}</Notice> : null}</Page>;
  return <Page style={{ gap: 22 }}>
    <Stack.Title>Light studio</Stack.Title>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Eyebrow>{studio.pending ? 'YOUR EDIT' : '01 / FIND YOUR LIGHT'}</Eyebrow><Copy tone="muted" style={{ fontSize: 11 }}>{studio.info?.mode === 'gemini' ? 'AI PILOT' : 'DEMO STUDIO'}</Copy></View>
    <View style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1, backgroundColor: colors.inset }}><LocalPhoto uri={photo} accessibilityLabel="Your original photo, unchanged" style={{ width: '100%', height: '100%' }} contentFit="contain" />
      <View style={{ position: 'absolute', left: 14, bottom: 14, backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 }}><Copy style={{ fontSize: 9, letterSpacing: 1.3 }}>YOUR ORIGINAL</Copy></View>
    </View>
    {!studio.busy && !studio.pending ? <View style={{ flexDirection: 'row', gap: 10 }}><Button title="Change photo" icon="image" variant="secondary" onPress={() => { setConsent(false); void picker.pick(); }} style={{ flex: 1 }} /><Button title="Camera" icon="camera" variant="secondary" onPress={() => { setConsent(false); void picker.pick(true); }} style={{ flex: 1 }} /></View> : null}
    {picker.error ? <Notice error>{picker.error}</Notice> : null}

    <View style={{ gap: 12 }}>
      <Display size={34}>{studio.busy ? 'A moment in the studio.' : 'Choose your mood.'}</Display>
      <View accessibilityRole="radiogroup" accessibilityLabel="Lighting looks" style={{ flexDirection: 'row', gap: 9 }}>
        {LOOKS.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.name} aria-checked={look.id === item.id} accessibilityState={{ checked: look.id === item.id, disabled: studio.busy || Boolean(studio.pending) }}
          disabled={studio.busy || Boolean(studio.pending)} testID={`look-${item.id}`} onPress={() => studio.selectLook(item.id)}
          style={{ flex: 1, padding: 4, gap: 7, borderWidth: 1.5, borderColor: look.id === item.id ? colors.accent : colors.line, borderRadius: 17, backgroundColor: look.id === item.id ? colors.accentSoft : colors.surface }}>
          <Image source={LOOK_IMAGES[item.id]} style={{ width: '100%', aspectRatio: 0.92, borderRadius: 12 }} contentFit="cover" accessibilityLabel={`${item.name} illustrative color study`} />
          <Copy style={{ fontSize: 10, lineHeight: 15, textAlign: 'center', fontWeight: '600', paddingBottom: 5 }}>{item.name}</Copy>
        </Pressable>)}
      </View>
      <Copy tone="muted" style={{ fontSize: 12, lineHeight: 19 }}>{look.description}</Copy>
    </View>

    {studio.busy ? <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 13 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /><Copy style={{ flex: 1, fontWeight: '600' }}>{stages[studio.activity.phase]}</Copy></View>
      <Copy tone="muted" style={{ fontSize: 12 }}>One beta credit is held while we work. Failed or cancelled edits return it automatically. No fake progress timer.</Copy>
    </View> : null}
    {studio.info?.mode !== 'gemini' ? <Notice>This demo makes real color and exposure edits. It does not perform generative AI relighting. Sample thumbnails are illustrative.</Notice> : <Notice>AI can change details unintentionally. Review your result before sharing. Your selected photo is processed by Google’s Gemini API.</Notice>}

    {!studio.pending && !studio.busy ? <View style={{ gap: 8 }}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: 50 }}>
        <Switch testID="photo-consent" label="Allow photo processing" value={consent} onValueChange={setConsent} />
      </Host>
      <Copy tone="muted" style={{ fontSize: 11, lineHeight: 17 }}>Only use photos you own or have permission to edit. The server address is visible in Settings. You can delete local edits anytime.</Copy>
    </View> : null}
    {studio.activity.error || error ? <Notice error>{error ?? studio.activity.error}</Notice> : null}
    {!studio.busy ? <Button title={studio.pending ? 'Resume edit · no extra credit' : `${studio.info?.mode === 'gemini' ? 'Create' : 'Try demo'} ${look.name.toLowerCase()} · 1 credit`} icon="sparkle"
      testID="generate-photo" disabled={!studio.pending && (!consent || studio.wallet?.available === 0)} onPress={() => void run()} /> : null}
    {studio.pending || studio.busy ? <Button title={cancelling ? 'Confirming cancellation…' : 'Cancel edit'} variant="ghost" loading={cancelling} onPress={() => void cancel()} /> : null}
    {!studio.busy && !studio.pending && studio.wallet?.available === 0 ? <Button title="Open beta wallet" variant="secondary" onPress={() => router.push('/wallet')} /> : null}
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={13} color={colors.muted} /><Copy tone="muted" style={{ fontSize: 10 }}>No server photo archive. Your original is untouched.</Copy></View>
  </Page>;
}
