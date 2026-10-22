import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Copy, Display, Eyebrow, Header, Notice, Page } from '@/components/ui';
import { Icon } from '@/components/icon';
import { LOOKS, type LookId } from '@/domain/looks';
import { LOOK_IMAGES, SAMPLE_IMAGE, samplePhoto } from '@/lib/prepare-photo';
import { usePhotoPicker } from '@/hooks/use-photo-picker';
import { useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

export function StudioScreen() {
  const { colors } = useTheme();
  const studio = useStudio();
  const picker = usePhotoPicker();
  const [error, setError] = useState<string | null>(null);

  async function choose(lookId?: LookId) {
    if (studio.pending) { router.push('/edit'); return; }
    if (lookId) studio.selectLook(lookId);
    if (await picker.pick()) router.push('/edit');
  }
  async function trySample() {
    try { setError(null); studio.setPhoto(await samplePhoto()); router.push('/edit'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load the sample.'); }
  }
  return <Page safeTop style={{ gap: 25 }}>
    <Header />
    <View style={{ gap: 12, paddingTop: 4 }}>
      <Eyebrow>GOOD LIGHT, EVERY DAY.</Eyebrow>
      <Display size={52}>Your photos,{ '\n' }in a <Text style={{ color: colors.accent, fontFamily: 'EditorialItalic' }}>new light.</Text></Display>
      <Copy tone="muted" style={{ maxWidth: 320 }}>A different mood. The same you.{ '\n' }Find your light in just a few taps.</Copy>
    </View>

    {studio.pending ? <Notice action={() => router.push('/edit')} actionLabel={studio.busy ? 'View your edit' : 'Resume your edit'}>
      {studio.busy ? 'The studio is working on your photo. You can keep browsing.' : 'Your previous edit is waiting. Resume it without spending another credit.'}
    </Notice> : null}
    {studio.activity.savedId && !studio.pending ? <Notice action={() => router.push(`/result/${studio.activity.savedId}`)} actionLabel="See your photo">Your latest edit is saved in your collection.</Notice> : null}

    <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo to start editing" onPress={() => void choose()} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <View style={{ borderRadius: 26, overflow: 'hidden', aspectRatio: 1.13, backgroundColor: colors.inset }}>
        <Image source={LOOK_IMAGES['golden-hour']} style={{ position: 'absolute', inset: 0 }} contentFit="cover" contentPosition="center" accessibilityLabel="Warm-toned demonstration portrait" />
        <LinearGradient colors={['transparent', '#171B1388']} style={{ position: 'absolute', inset: 0 }} start={{ x: 0, y: 0.4 }} end={{ x: 0, y: 1 }} />
        <View style={{ position: 'absolute', left: 17, top: 17, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFDFAE8', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="sun" size={13} color="#8E5D24" /><Text style={{ color: '#413A2C', fontSize: 10, fontWeight: '600' }}>Golden hour</Text>
        </View>
        <View style={{ position: 'absolute', right: 18, bottom: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDFA' }}><Icon name="arrow" color="#26251F" /></View>
        <View style={{ position: 'absolute', left: 18, bottom: 18, gap: 4 }}><Text style={{ color: 'white', fontFamily: 'EditorialItalic', fontSize: 28 }}>Stay a little golden.</Text><Text style={{ fontSize: 9, color: '#FFFFFFDD', letterSpacing: 1.3 }}>ILLUSTRATIVE DEMO LOOK</Text></View>
        <View style={{ position: 'absolute', right: 18, top: 17, transform: [{ rotate: '6deg' }], backgroundColor: '#FFFDFA', padding: 4, paddingBottom: 15, borderRadius: 3, boxShadow: '0 3px 12px #00000022' }}>
          <Image source={SAMPLE_IMAGE} style={{ width: 59, height: 73 }} contentFit="cover" accessibilityLabel="Original demonstration portrait" /><Text style={{ position: 'absolute', bottom: 2, alignSelf: 'center', fontSize: 7, color: '#79756B', letterSpacing: 1 }}>BEFORE</Text>
        </View>
      </View>
    </Pressable>

    <View style={{ gap: 7 }}>
      <Button title="Choose a photo" icon="image" testID="choose-photo" loading={picker.picking} onPress={() => void choose()} />
      <Pressable testID="try-sample" accessibilityRole="button" onPress={() => void trySample()} disabled={Boolean(studio.pending) || studio.busy}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: studio.pending || studio.busy ? 0.4 : pressed ? 0.6 : 1 })}>
        <Copy tone="muted" style={{ fontSize: 12, textDecorationLine: 'underline' }}>Just looking? Try the sample photo</Copy>
      </Pressable>
      {picker.error || error ? <Notice error>{picker.error ?? error}</Notice> : null}
    </View>

    <View style={{ gap: 15 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Eyebrow>THE LIGHT COLLECTION</Eyebrow><Copy tone="muted" style={{ fontSize: 11 }}>Three ways to feel it</Copy></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 3 }}>
        {LOOKS.map((look) => <Pressable key={look.id} accessibilityRole="button" accessibilityLabel={`Choose ${look.name}`} onPress={() => void choose(look.id)} style={({ pressed }) => ({ width: 146, gap: 9, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ borderRadius: 17, overflow: 'hidden', height: 173, backgroundColor: colors.inset }}>
            <Image source={LOOK_IMAGES[look.id]} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`${look.name} illustrative color study`} />
            <Text style={{ position: 'absolute', top: 10, left: 11, color: 'white', fontSize: 11, fontWeight: '500' }}>{look.number}</Text>
          </View>
          <Copy style={{ fontWeight: '600', fontSize: 13 }}>{look.name}</Copy><Eyebrow style={{ fontSize: 7, letterSpacing: 0.9, color: colors.muted }}>{look.detail}</Eyebrow>
        </Pressable>)}
      </ScrollView>
      <Copy tone="muted" style={{ fontSize: 10, lineHeight: 16 }}>Look thumbnails are demo color studies, not generated AI examples.</Copy>
    </View>

    <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 20 }}>
      <Icon name="shield" size={18} color={colors.muted} /><Copy tone="muted" style={{ flex: 1, fontSize: 11, lineHeight: 18 }}>Your original stays untouched. Your collection stays on this device.</Copy>
    </View>
    {studio.info?.mode === 'demo' ? <Notice>Demo mode is on. Edits use local color and exposure effects, not AI. No API spending or real purchases.</Notice> : studio.connectionError ? <Notice error action={() => router.push('/settings')} actionLabel="Connect the studio">{studio.connectionError}</Notice> : null}
  </Page>;
}
