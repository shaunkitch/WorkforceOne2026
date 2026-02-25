import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOrg } from '@/contexts/OrgContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { org, features, loading, roleMetadata, unreadCount } = useOrg();

  const brandColor = org?.brand_color || '#2563eb';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brandColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      <Tabs.Screen
        name="forms"
        options={{
          title: 'Forms',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="document-text" color={color} />,
          href: features?.operations ? '/forms' : null,
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="clock"
        options={{
          title: 'Clock In',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="time" color={color} />,
          href: features?.payroll ? '/clock' : null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person" color={color} />,
        }}
      />

      <Tabs.Screen
        name="security"
        options={{
          title: 'Security',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="shield-checkmark" color={color} />,
          href: features?.security ? '/security' : null,
        }}
      />

      {/* Hidden Routes */}
      <Tabs.Screen
        name="scanner"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="form_entry"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
