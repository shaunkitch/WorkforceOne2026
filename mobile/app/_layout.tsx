import "../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { OrgProvider } from '../contexts/OrgContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setInitialized(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
    // Removed the aggressive check that forced users into (tabs) if they were ANYWHERE else.
    // Now users can navigate to sibling stacks like 'security-ops' or 'modal'.
  }, [session, initialized, segments]);

  const colorScheme = useColorScheme();

  if (!initialized) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0f172a]">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <OrgProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="security-ops" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </OrgProvider>
    </QueryClientProvider>
  );
}
