import { TextInput } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Copy, Display, Eyebrow, Header, Notice, NativeHost as Host } from '@/components/ui';
import { Icon } from '@/components/icon';
import { LocalPhoto } from '@/components/local-photo';
import { getLook } from '@/domain/looks';
import { useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

export function CollectionScreen() {
  const { colors } = useTheme(); const studio = useStudio(); const insets = useSafeAreaInsets();
  const [favoriteOnly, setFavoriteOnly] = useState(false); const [query, setQuery] = useState(''); const [error, setError] = useState<string | null>(null);
  const filtered = studio.history.filter((item) => (!favoriteOnly || item.favorite) && getLook(item.lookId).name.toLowerCase().includes(query.toLowerCase().trim()));
  return <FlatList data={filtered} keyExtractor={(item) => item.id} numColumns={2} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
    style={{ flex: 1, backgroundColor: colors.background }} columnWrapperStyle={{ gap: 12 }}
    contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 }}
    ListHeaderComponent={<View style={{ gap: 23, paddingBottom: 3 }}>
      <Header /><View style={{ gap: 11 }}><Eyebrow>MADE BY YOU. KEPT BY YOU.</Eyebrow><Display>Your collection.</Display><Copy tone="muted">Good-light moments, all in one place.</Copy></View>
      <Host matchContents={{ vertical: true }} style={{ width: '100%', minHeight: 52 }}><TextInput placeholder="Find a look…" onChangeText={setQuery} testID="collection-search" style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.line }} textStyle={{ color: colors.ink, fontSize: 14 }} /></Host>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[false, true].map((favorites) => <Pressable key={String(favorites)} accessibilityRole="button" accessibilityState={{ selected: favorites === favoriteOnly }} onPress={() => setFavoriteOnly(favorites)}
          style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 23, justifyContent: 'center', backgroundColor: favorites === favoriteOnly ? colors.ink : colors.inset }}>
          <Copy style={{ color: favorites === favoriteOnly ? colors.background : colors.muted, fontSize: 12, fontWeight: '500' }}>{favorites ? 'Favorites' : `All photos · ${studio.history.length}`}</Copy>
        </Pressable>)}
      </View>{error ? <Notice error>{error}</Notice> : null}
    </View>}
    ListEmptyComponent={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 17, paddingVertical: 32 }}>
      <View style={{ width: 90, height: 90, borderRadius: 30, backgroundColor: colors.inset, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}><Icon name="image" color={colors.muted} size={35} /></View>
      <Display size={32} style={{ textAlign: 'center' }}>{query ? 'No matching moments.' : favoriteOnly ? 'Keep your favorites close.' : 'Your first good-light moment.'}</Display>
      <Copy tone="muted" style={{ textAlign: 'center', maxWidth: 260 }}>{query ? 'Try Golden hour, After hours, or Soft studio.' : favoriteOnly ? 'Tap the heart on a photo to find it here.' : 'Make an edit in the studio. Your finished photo will be saved here automatically.'}</Copy>
      <Button title="Go to the studio" icon="sun" variant="secondary" onPress={() => router.navigate('/')} />
    </View>}
    renderItem={({ item }) => <View style={{ flex: 1, maxWidth: '49%', gap: 8 }}>
      <View style={{ aspectRatio: 0.78, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.inset }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${getLook(item.lookId).name} edit`} onPress={() => router.push(`/result/${item.id}`)} style={({ pressed }) => ({ width: '100%', height: '100%', opacity: pressed ? 0.75 : 1 })}>
          <LocalPhoto uri={item.resultUri} style={{ width: '100%', height: '100%' }} accessibilityLabel={`${getLook(item.lookId).name} saved edit`} />
          {item.mode === 'demo' ? <Copy style={{ position: 'absolute', bottom: 8, left: 9, color: 'white', backgroundColor: '#26251FAA', borderRadius: 7, paddingHorizontal: 6, fontSize: 8, lineHeight: 17, letterSpacing: 1 }}>DEMO</Copy> : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={item.favorite ? 'Remove favorite' : 'Mark as favorite'} onPress={() => void studio.toggleFavorite(item.id).catch((error) => setError(error.message))}
          style={{ position: 'absolute', top: 4, right: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ padding: 8, borderRadius: 20, backgroundColor: '#FFFDFAE8' }}><Icon name="heart" size={16} color={item.favorite ? '#B94731' : '#26251F'} filled={item.favorite} /></View>
        </Pressable>
      </View>
      <Copy style={{ fontSize: 12, fontWeight: '600' }}>{getLook(item.lookId).name}</Copy>
      <Copy tone="muted" style={{ fontSize: 10 }}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Copy>
    </View>} />;
}
