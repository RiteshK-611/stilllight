import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StudioProvider, useStudio } from '@/state/studio-context';
import { useTheme } from '@/theme/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigation() {
  const { colors, dark } = useTheme();
  const { ready } = useStudio();
  const [loaded, error] = useFonts({
    Editorial: require('../../assets/fonts/InstrumentSerif-Regular.ttf'),
    EditorialItalic: require('../../assets/fonts/InstrumentSerif-Italic.ttf'),
  });
  useEffect(() => { if ((loaded || error) && ready) void SplashScreen.hideAsync().catch(() => {}); }, [loaded, error, ready]);
  if ((!loaded && !error) || !ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  return <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.inset }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 600 : undefined, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Studio' }} />
        <Stack.Screen name="edit" options={{ title: 'Light studio' }} />
        <Stack.Screen name="result/[id]" options={{ title: 'Your new light' }} />
        <Stack.Screen name="wallet" options={{ title: 'Your credits', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy & beta details' }} />
      </Stack>
    </View>
  </View>;
}

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><StudioProvider><Navigation /></StudioProvider></SafeAreaProvider></GestureHandlerRootView>;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <View style={{ flex: 1, padding: 30, gap: 20, justifyContent: 'center', backgroundColor: '#F8F5EF' }}>
    <Text style={{ fontSize: 28, color: '#26251F' }}>Let’s try that again.</Text><Text selectable>{error.message}</Text>
    <Pressable accessibilityRole="button" onPress={retry} style={{ padding: 18, minHeight: 50, backgroundColor: '#BB472F', borderRadius: 16 }}><Text style={{ color: 'white', textAlign: 'center' }}>Reload this screen</Text></Pressable>
  </View>;
}
