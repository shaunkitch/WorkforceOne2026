import { useCallback, useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Linking, Platform } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Stack, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useOrg } from '@/contexts/OrgContext';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { offlineStore } from '@/lib/offline-store';
import { NetworkBanner } from '@/components/ui/NetworkBanner';

import { useQuery, useQueryClient } from '@tanstack/react-query';

export type Visit = {
  id: string;
  client_id: string;
  title: string;
  scheduled_at: string;
  status: string;
  clients?: any;
};

export default function Dashboard() {
  const { org, isOnline, unreadCount, features, refreshOrg, loading } = useOrg();
  const queryClient = useQueryClient();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  const handlePresentModalPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bottomSheetModalRef.current?.present();
  }, []);

  const handleDismissModalPress = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  // 1. User Profile Query
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      return { user, name: (profile as any)?.full_name || user.email?.split('@')[0] };
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  const userId = userData?.user?.id;
  const userName = userData?.name;

  // 2. Tasks Query (replaces legacy assignments query)
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { list: [], count: 0 };

      const { data: list, count } = await supabase
        .from('tasks')
        .select(`*, form:forms(title)`, { count: 'exact' })
        .eq('assignee_id', userId)
        .neq('status', 'DONE')
        .order('created_at', { ascending: false })
        .limit(5);

      return { list: list || [], count: count || 0 };
    }
  });

  // 3. Stats derived from queries
  const stats = {
    pending: tasksData?.count || 0,
    dueToday: 0,
    completed: 0
  };

  // 4. Visits Query (Today)
  const { data: visitsData, isLoading: visitsLoading, refetch: refetchVisits } = useQuery({
    queryKey: ['visits_today', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { list: [], count: 0 };

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: visits } = await supabase
        .from('visits')
        .select(`
            id, client_id, title, scheduled_at, status,
            clients (id, name, address, latitude, longitude)
          `)
        .eq('user_id', userId)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true });

      if (!visits) return { list: [], count: 0 };

      // Filter out locally pending/completed
      const outbox = await offlineStore.getOutbox();
      const pendingVisitIds = outbox
        .filter(a => a.type === 'SUBMIT_FORM' && a.payload?.visit_id)
        .map(a => a.payload.visit_id);

      // Cast to Visit type with join (Supabase returns nested objects)
      const validVisits = (visits as unknown as Visit[]).filter(v => {
        const status = v.status ? v.status.toLowerCase().trim() : '';
        const isCompleted = status === 'completed';
        const isPendingLocally = pendingVisitIds.includes(v.id);
        return !isCompleted && !isPendingLocally;
      });

      return { list: validVisits, count: validVisits.length };
    }
  });

  if (visitsData) {
    stats.dueToday = visitsData.count;
  }

  // 5. Recent Submissions Query
  const { data: recentSubmissionsData, refetch: refetchSubmissions } = useQuery({
    queryKey: ['recent_submissions', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('submissions')
        .select('id, form_id, created_at, forms(title)') // Note: forms table usually has title or name
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      return (data as any[])?.map((s: any) => ({
        id: s.id,
        form_id: s.form_id,
        title: s.forms?.title || s.forms?.name || 'Untitled', // handle both title/name to be safe
        date: s.created_at
      })) || [];
    }
  });

  const todaysVisits = visitsData?.list || [];
  const assignedTasks = tasksData?.list || [];
  const recentSubmissions = recentSubmissionsData || [];

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshOrg(),
      refetchTasks(),
      refetchVisits(),
      refetchSubmissions()
    ]);
    setRefreshing(false);
  }, [refreshOrg, refetchTasks, refetchVisits, refetchSubmissions]);

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  const handleVisitPress = (visit: Visit) => {
    const client = visit.clients;

    Alert.alert(
      visit.title,
      `${client?.name || 'Client'}\n${client?.address || ''}`,
      [
        {
          text: 'Navigate to Site',
          onPress: () => {
            const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
            const latLng = client?.latitude && client?.longitude ? `${client.latitude},${client.longitude}` : client?.address;
            const label = client?.name;

            if (latLng) {
              // Formatting for different platforms
              const url = Platform.select({
                ios: `${scheme}${label}@${latLng}`,
                android: `${scheme}${latLng}(${label})`
              }) || `${scheme}${latLng}`;

              Linking.openURL(url);
            } else {
              Alert.alert("No location data", "Client has no address or GPS coordinates.");
            }
          }
        },
        {
          text: 'Complete Form',
          onPress: () => router.push({
            pathname: '/(tabs)/forms',
            params: {
              visitId: visit.id,
              clientId: visit.client_id
            }
          })
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    )
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <View className="flex-1 bg-slate-50">

      <StatusBar style="light" />
      <NetworkBanner />

      {/* Header Area */}
      <LinearGradient
        colors={org?.brand_color ? [org.brand_color, org.brand_color] : ['#1e40af', '#2563eb']}
        className="pt-16 pb-8 px-6 rounded-b-3xl shadow-lg"
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
      >
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-blue-100 text-lg font-medium">Welcome back,</Text>
            <Text className="text-3xl font-bold text-white mt-1">{userName || 'User'}</Text>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-2 rounded-full backdrop-blur-sm relative"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications');
            }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
            {(unreadCount > 0 || !isOnline) && (
              <View className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white ${!isOnline ? 'bg-red-500' : 'bg-red-500'}`} />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View className="flex-row space-x-3">
          <View className="flex-1 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
            <Text className="text-blue-100 text-xs font-medium uppercase tracking-wider">Pending</Text>
            <Text className="text-2xl font-bold text-white mt-1">{stats.pending}</Text>
          </View>
          <View className="flex-1 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
            <Text className="text-blue-100 text-xs font-medium uppercase tracking-wider">Due Today</Text>
            <Text className="text-2xl font-bold text-white mt-1">{stats.dueToday || 0}</Text>
          </View>
          <View className="flex-1 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
            <Text className="text-blue-100 text-xs font-medium uppercase tracking-wider">Completed</Text>
            <Text className="text-2xl font-bold text-white mt-1">{stats.completed}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-6 -mt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex-row justify-between items-center">
          <TouchableOpacity className="items-center space-y-2 flex-1" onPress={handlePresentModalPress}
            accessibilityRole="button" accessibilityLabel="Create new entry"
          >
            <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center">
              <Ionicons name="add" size={24} color="#2563eb" />
            </View>
            <Text className="text-xs font-semibold text-slate-600">New Entry</Text>
          </TouchableOpacity>

          <View className="w-[1px] h-10 bg-slate-100" />

          <TouchableOpacity className="items-center space-y-2 flex-1" onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/tasks');
          }}
            accessibilityRole="button" accessibilityLabel="View my tasks"
          >
            <View className="w-12 h-12 bg-indigo-50 rounded-full items-center justify-center">
              <Ionicons name="checkbox" size={22} color="#4f46e5" />
            </View>
            <Text className="text-xs font-semibold text-slate-600">Tasks</Text>
          </TouchableOpacity>

          <View className="w-[1px] h-10 bg-slate-100" />

          <TouchableOpacity className="items-center space-y-2 flex-1" onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/expenses');
          }}
            accessibilityRole="button" accessibilityLabel="Submit Expense"
          >
            <View className="w-12 h-12 bg-amber-50 rounded-full items-center justify-center">
              <Ionicons name="receipt" size={22} color="#d97706" />
            </View>
            <Text className="text-xs font-semibold text-slate-600">Expense</Text>
          </TouchableOpacity>

          {(features?.security) && (
            <>
              <View className="w-[1px] h-10 bg-slate-100" />
              <TouchableOpacity className="items-center space-y-2 flex-1" onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/scanner');
              }}
                accessibilityRole="button" accessibilityLabel="Scan QR code"
              >
                <View className="w-12 h-12 bg-purple-50 rounded-full items-center justify-center">
                  <Ionicons name="qr-code" size={22} color="#9333ea" />
                </View>
                <Text className="text-xs font-semibold text-slate-600">Scan Code</Text>
              </TouchableOpacity>
            </>
          )}

          {(features?.security) && (
            <>
              <View className="w-[1px] h-10 bg-slate-100" />
              <TouchableOpacity
                className="items-center space-y-2 flex-1"
                accessibilityRole="button"
                accessibilityLabel="Send SOS alert"
                accessibilityHint="Double tap to send an emergency SOS alert"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  Alert.alert(
                    '🚨 SOS Alert',
                    'Send an emergency SOS alert to your supervisor?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'SEND SOS',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('Not authenticated');
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            await (supabase as any).rpc('trigger_sos', { p_user_id: user.id });
                            Alert.alert('SOS Sent', 'Your supervisor has been notified.');
                          } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to send SOS');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <View className="w-12 h-12 bg-red-50 rounded-full items-center justify-center">
                  <Ionicons name="alert-circle" size={22} color="#ef4444" />
                </View>
                <Text className="text-xs font-semibold text-red-600">SOS</Text>
              </TouchableOpacity>
            </>
          )}

          <View className="w-[1px] h-10 bg-slate-100" />

          <TouchableOpacity className="items-center space-y-2 flex-1" onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRefresh();
          }}
            accessibilityRole="button" accessibilityLabel="Sync data"
          >
            <View className="w-12 h-12 bg-emerald-50 rounded-full items-center justify-center">
              <Ionicons name="sync" size={22} color="#10b981" />
            </View>
            <Text className="text-xs font-semibold text-slate-600">Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Visits */}
        {features?.crm && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-slate-800 mb-4">Today&apos;s Visits</Text>
            {todaysVisits.length === 0 ? (
              <View className="bg-white p-6 rounded-2xl items-center justify-center border border-slate-100 shadow-sm">
                <Text className="text-slate-400">No visits scheduled for today.</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {todaysVisits.map((visit) => (
                  <TouchableOpacity
                    key={visit.id}
                    onPress={() => handleVisitPress(visit)}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:bg-blue-50/50 transition-colors"
                    accessibilityRole="button"
                    accessibilityLabel={`Visit: ${visit.title}`}
                  >
                    <View className="flex-row justify-between mb-2">
                      <Text className="font-bold text-slate-800 text-base">{visit.title}</Text>
                      <Text className="text-blue-600 font-bold">{new Date(visit.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="person" size={14} color="#64748b" style={{ marginRight: 6 }} />
                      <Text className="text-slate-600 text-sm">{visit.clients?.name || 'Unknown Client'}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="location" size={14} color="#64748b" style={{ marginRight: 6 }} />
                      <Text className="text-slate-600 text-sm flex-1" numberOfLines={1}>{visit.clients?.address || 'No Address'}</Text>
                    </View>
                    {visit.status === 'completed' && (
                      <View className="mt-2 bg-green-100 self-start px-2 py-0.5 rounded">
                        <Text className="text-green-700 text-xs font-bold">COMPLETED</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Assigned Tasks */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-800">My Pending Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text className="text-blue-600 font-medium text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          {assignedTasks.length === 0 ? (
            <View className="bg-white p-8 rounded-2xl items-center justify-center border border-slate-100 border-dashed">
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#e2e8f0" />
              <Text className="text-slate-400 mt-4 text-center">No tasks assigned to you.</Text>
              <Text className="text-slate-400 text-xs mt-1 text-center">You're all caught up!</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {assignedTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row items-center active:scale-[0.98] transition-transform"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (task.form_id) {
                      router.push({
                        pathname: '/(tabs)/form_entry',
                        params: { formId: task.form_id, formName: task.form?.title || 'Operational Form', taskId: task.id }
                      });
                    } else {
                      router.push('/(tabs)/tasks');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Task: ${task.title}`}
                >
                  <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mr-4">
                    <Ionicons name={task.form_id ? "clipboard-outline" : "checkbox-outline"} size={22} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text className="font-bold text-slate-800 text-base flex-1 mr-2" numberOfLines={1}>{task.title}</Text>
                      {task.status !== 'DONE' && (
                        <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-amber-700 uppercase">{task.status.replace('_', ' ')}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-slate-500 text-sm mt-1" numberOfLines={1}>{task.description || 'No description provided'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity */}
        {recentSubmissions.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-bold text-slate-800 mb-4">Recent Activity</Text>
            <View className="space-y-3">
              {recentSubmissions.map((submission) => (
                <View key={submission.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                      <Text className="font-bold text-slate-800 text-base">{submission.title}</Text>
                      <Text className="text-slate-500 text-xs mt-1">
                        {new Date(submission.date).toLocaleDateString()} • {new Date(submission.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/(tabs)/form_entry',
                        params: {
                          formId: submission.form_id,
                          formName: submission.title,
                          duplicateSubmissionId: submission.id
                        }
                      })}
                      className="bg-blue-50 px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <Ionicons name="copy-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                      <Text className="text-blue-600 text-xs font-bold">Duplicate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
      >
        <BottomSheetView className="flex-1 p-6" style={{ minHeight: 300 }}>
          <Text className="text-xl font-bold text-slate-800 mb-6">Create New</Text>

          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              className="items-center bg-blue-50 p-4 rounded-xl w-[48%] mb-4 border border-blue-100 active:scale-95 transition-transform"
              onPress={() => {
                handleDismissModalPress();
                router.push('/(tabs)/forms');
              }}
            >
              <Ionicons name="document-text" size={32} color="#2563eb" />
              <Text className="font-semibold text-blue-700 mt-2">Form</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center bg-emerald-50 p-4 rounded-xl w-[48%] mb-4 border border-emerald-100 active:scale-95 transition-transform"
              onPress={() => {
                handleDismissModalPress();
                router.push('/quotes');
              }}
            >
              <Ionicons name="calculator" size={32} color="#10b981" />
              <Text className="font-semibold text-emerald-700 mt-2">Quote</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center bg-purple-50 p-4 rounded-xl w-[48%] border border-purple-100 active:scale-95 transition-transform"
              onPress={() => {
                handleDismissModalPress();
                router.push('/invoices');
              }}
            >
              <Ionicons name="receipt" size={32} color="#9333ea" />
              <Text className="font-semibold text-purple-700 mt-2">Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center bg-amber-50 p-4 rounded-xl w-[48%] border border-amber-100 active:scale-95 transition-transform"
              onPress={() => {
                handleDismissModalPress();
                router.push('/inventory' as any);
              }}
            >
              <Ionicons name="cube" size={32} color="#d97706" />
              <Text className="font-semibold text-amber-700 mt-2">Inventory</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
