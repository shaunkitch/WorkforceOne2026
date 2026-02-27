import 'react-native-gesture-handler';
import "../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Remote push notifications were removed from Expo Go in SDK 53.
// All notification setup must be skipped when running in Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { offlineStore } from '../lib/offline-store';

const BACKGROUND_SYNC_TASK = 'workforce-background-sync';

// Only set the notification handler in real builds (dev build / production APK).
// In Expo Go, remote notifications are not supported since SDK 53.
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const { success } = await offlineStore.syncOutbox();
    return success > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const unstable_settings = {
  anchor: '(tabs)',
};

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { OrgProvider } from '../contexts/OrgContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Keep the splash screen visible while we initialize auth.
// This MUST be called before the component renders.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Safety timeout: if auth takes longer than 5 seconds, hide splash anyway
    // so the app never freezes permanently on a real device.
    const splashTimeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
      setInitialized(true);
    }, 5000);

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (err: any) {
        console.error("Auth initialization failed:", err);
        // Show the error on screen — much easier to diagnose than a silent freeze
        setStartupError(err?.message ?? String(err));
        await supabase.auth.signOut().catch(() => { });
        setSession(null);
      } finally {
        clearTimeout(splashTimeout);
        setInitialized(true);
        // ✅ CRITICAL: Hide the native splash screen.
        // Without this, the splash stays visible forever in production APKs.
        await SplashScreen.hideAsync().catch(() => { });
      }
    }

    initAuth();

    // Request push notification permissions — only in real dev/prod builds.
    // Expo Go SDK 53 removed remote notification support entirely.
    let notificationSub: { remove: () => void } | null = null;
    if (!isExpoGo) {
      Notifications.requestPermissionsAsync().catch(() => { });

      // Deep link: tap a notification -> navigate to security tab
      notificationSub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as any;
        if (data?.screen) {
          router.push(data.screen);
        }
      });
    }

    // Register Background Fetch
    BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    }).catch(err => console.log("Failed to register background task", err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setInitialized(true);
      }
    );

    return () => {
      clearTimeout(splashTimeout);
      subscription.unsubscribe();
      notificationSub?.remove();
    };
  }, []); // ← empty deps: only run once, no re-subscription loops


  useEffect(() => {
    if (!initialized) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      // Not logged in but trying to access tabs -> Login
      router.replace('/login');
    } else if (session && segments[0] === 'login') {
      // Logged in but at login screen -> Tabs
      router.replace('/(tabs)');
    }
  }, [session, initialized, segments]);

  const colorScheme = useColorScheme();

  // On-device error screen — shows startup failures directly on the phone
  // so we never have to connect ADB to diagnose. Much easier for debugging.
  if (startupError && initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 60 }}>
        <View style={{ backgroundColor: '#7f1d1d', borderRadius: 12, padding: 20 }}>
          <Text style={{ color: '#fca5a5', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
            ⚠️ Startup Error
          </Text>
          <Text style={{ color: '#fecaca', fontSize: 13, fontFamily: 'monospace' }}>
            {startupError}
          </Text>
        </View>
        <Text style={{ color: '#475569', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Check EAS environment variables and Supabase configuration.
        </Text>
      </View>
    );
  }

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OrgProvider session={session}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <BottomSheetModalProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="security-ops" options={{ headerShown: false }} />
                  <Stack.Screen name="quotes" options={{ headerShown: false }} />
                  <Stack.Screen name="invoices" options={{ headerShown: false }} />
                  <Stack.Screen name="inventory" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="light" />
              </BottomSheetModalProvider>
            </ThemeProvider>
          </OrgProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
