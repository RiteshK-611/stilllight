import { useState, type ComponentProps } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/theme/theme';
import { LocalPhoto } from './local-photo';
import { Copy } from './ui';

export function ComparePhoto({ originalUri, resultUri, aspectRatio, demo = false }: { originalUri: string; resultUri: string; aspectRatio: number; demo?: boolean }) {
  const { colors } = useTheme();
  const width = useSharedValue(1); const split = useSharedValue(0.5); const start = useSharedValue(0.5);
  const [mode, setMode] = useState<'original' | 'compare' | 'edited'>('compare');
  const [percent, setPercent] = useState(50);
  const clipStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (split.get() - 1) * width.get() }] }));
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - split.get()) * width.get() }] }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: split.get() * width.get() - 24 }] }));
  const gesture = Gesture.Pan().onStart(() => { start.set(split.get()); scheduleOnRN(setMode, 'compare'); }).onUpdate((event) => {
    split.set(Math.max(0.02, Math.min(0.98, start.get() + event.translationX / width.get())));
  }).onEnd(() => { scheduleOnRN(setPercent, Math.round(split.get() * 100)); });
  const adjust = (next: number) => { const value = Math.max(0, Math.min(100, next)); split.set(value / 100); setPercent(value); setMode('compare'); };
  const select = (next: typeof mode) => { const value = next === 'original' ? 100 : next === 'edited' ? 0 : 50; setMode(next); split.set(value / 100); setPercent(value); };
  const onKeyDown: NonNullable<ComponentProps<typeof View>['onKeyDown']> = (event) => {
    const key = 'key' in event ? String(event.key) : '';
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      event.preventDefault(); adjust(key === 'Home' ? 0 : key === 'End' ? 100 : percent + (key === 'ArrowRight' ? 10 : -10));
    }
  };
  const webKeyboard = Platform.OS === 'web' ? { 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100, onKeyDown } : {};
  return <View style={{ gap: 14 }}>
    <View onLayout={(event) => width.set(event.nativeEvent.layout.width)} testID="photo-comparison"
      style={{ width: '100%', aspectRatio: Math.max(0.65, Math.min(1.3, aspectRatio)), borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.inset }}>
      <LocalPhoto uri={resultUri} accessibilityLabel="Edited photo" style={{ position: 'absolute', inset: 0 }} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, overflow: 'hidden' }, clipStyle]}>
        <Animated.View style={[{ position: 'absolute', inset: 0 }, imageStyle]}>
          <LocalPhoto uri={originalUri} accessibilityLabel="Original photo" style={{ position: 'absolute', inset: 0 }} />
        </Animated.View>
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
        {['ORIGINAL', 'EDITED'].map((label) => <Text key={label} style={{ fontSize: 9, letterSpacing: 1.5, color: 'white', backgroundColor: '#25251F', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20 }}>{label}</Text>)}
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View {...webKeyboard} tabIndex={0} accessibilityRole="adjustable" accessibilityLabel="Before and after divider" accessibilityHint="Swipe to compare. You can also use the Original and Edited buttons below."
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => adjust(percent + (event.nativeEvent.actionName === 'increment' ? 10 : -10))}
          style={[{ position: 'absolute', width: 48, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }, handleStyle]}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: '#FFFFFFDD' }} />
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'white', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px #00000022' }}>
            <View style={{ width: 2, height: 11, borderRadius: 2, backgroundColor: '#79786F' }} /><View style={{ width: 2, height: 11, borderRadius: 2, backgroundColor: '#79786F' }} />
          </View>
        </Animated.View>
      </GestureDetector>
      {demo ? <Text style={{ position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: '#25251F', color: 'white', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, fontSize: 10, letterSpacing: 0.6 }}>DEMO · COLOR EFFECT, NOT AI</Text> : null}
    </View>
    <View accessibilityRole="tablist" style={{ backgroundColor: colors.inset, padding: 4, borderRadius: 14, flexDirection: 'row' }}>
      {(['original', 'compare', 'edited'] as const).map((value) => <Pressable key={value} accessibilityRole="tab" aria-selected={mode === value} accessibilityState={{ selected: mode === value }} onPress={() => select(value)}
        style={{ flex: 1, minHeight: 44, borderRadius: 11, backgroundColor: mode === value ? colors.surface : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <Copy style={{ fontSize: 12, fontWeight: mode === value ? '600' : '400' }}>{value[0].toUpperCase() + value.slice(1)}</Copy>
      </Pressable>)}
    </View>
  </View>;
}
