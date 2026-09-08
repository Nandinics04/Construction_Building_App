import { ClerkProvider, useAuth } from '@clerk/expo';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider } from '@/i18n/language-provider';
import { tokenCache } from '@/lib/clerk-token-cache';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';
import { Connex } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isLoaded || !navigationState?.key) return;

    const inAppGroup = segments[0] === '(app)';

    if (isSignedIn && !inAppGroup) {
      router.replace('/(app)/home');
    } else if (!isSignedIn && inAppGroup) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, navigationState?.key, router, segments]);

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoaded]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="screens/SignInScreen" />
        <Stack.Screen name="screens/SignUpScreen" />
        <Stack.Screen
          name="screens/ForgotPasswordScreen"
          options={{
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerTintColor: '#000',
          }}
        />
        <Stack.Screen name="(app)" />
      </Stack>
      {!isLoaded ? (
        <View style={styles.boot}>
          <ActivityIndicator size="large" color={Connex.accent} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file');
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <LanguageProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SafeAreaProvider>
              <RootLayoutNav />
              <StatusBar style="dark" />
            </SafeAreaProvider>
          </ThemeProvider>
        </LanguageProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Connex.bg,
  },
});
