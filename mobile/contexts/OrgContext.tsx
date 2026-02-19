import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { offlineStore } from '../lib/offline-store';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Organization, Notification } from '../../types/app';

// Helper type for features (Json in DB, but usually an object in app)
type FeatureFlags = Record<string, any>;

type OrgContextType = {
    org: Organization | null;
    features: FeatureFlags;
    loading: boolean;
    isOnline: boolean;
    roleMetadata: Record<string, any>;
    notifications: Notification[];
    unreadCount: number;
    refreshOrg: () => Promise<void>;
    markNotificationRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
};

const OrgContext = createContext<OrgContextType>({
    org: null,
    features: {},
    loading: true,
    isOnline: true,
    roleMetadata: {},
    notifications: [],
    unreadCount: 0,
    refreshOrg: async () => { },
    markNotificationRead: async () => { },
    markAllRead: async () => { },
});

export const useOrg = () => useContext(OrgContext);

const ORG_CACHE_KEY = '@workforceone_org_cache';

export function OrgProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [isAppActive, setIsAppActive] = useState(true);
    const queryClient = useQueryClient();

    // Initial Auth Listener
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                if (session) {
                    queryClient.invalidateQueries({ queryKey: ['org'] });
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            }
        );

        // Network Listener
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(online);
            if (online && session) {
                offlineStore.syncOutbox();
            }
        });

        // AppState Listener
        const subscriptionAppState = AppState.addEventListener('change', nextAppState => {
            setIsAppActive(nextAppState === 'active');
        });

        return () => {
            subscription.unsubscribe();
            unsubscribeNetInfo();
            subscriptionAppState.remove();
        }
    }, [session]);

    // Query: Organization
    const { data: orgData, isLoading: orgLoading, refetch: refetchOrgQuery } = useQuery({
        queryKey: ['org', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            // Try fetch from DB
            const { data, error } = await supabase
                .from('organization_members')
                .select('metadata, organizations(id, name, slug, brand_color, logo_url, app_logo_url, features)')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) throw error;

            if (data && data.organizations) {
                // @ts-ignore - Supabase types join
                const org = data.organizations as Organization;
                const metadata = data.metadata || {};

                // Cache to AsyncStorage for offline cold start
                await AsyncStorage.setItem(ORG_CACHE_KEY, JSON.stringify({ org, roleMetadata: metadata }));

                return { org, roleMetadata: metadata };
            }
            return null;
        },
        enabled: !!session?.user?.id && isOnline,
        // Place holder data from async storage could be implemented here but simpler to just use stale time
        staleTime: 1000 * 60 * 60, // 1 hour (Org data doesn't change often)
    });

    // Query: Notifications
    const { data: notificationsData, refetch: refetchNotifications } = useQuery({
        queryKey: ['notifications', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return [];
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            return data || [];
        },
        enabled: !!session?.user?.id,
        refetchInterval: isAppActive ? 30000 : false, // Poll every 30s only when active
    });

    // Mutation: Mark Read
    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        },
        onMutate: async (id) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: ['notifications', session?.user?.id] });
            const previousNotifications = queryClient.getQueryData(['notifications', session?.user?.id]);

            queryClient.setQueryData(['notifications', session?.user?.id], (old: Notification[] | undefined) => {
                return old ? old.map(n => n.id === id ? { ...n, is_read: true } : n) : [];
            });

            return { previousNotifications };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousNotifications) {
                queryClient.setQueryData(['notifications', session?.user?.id], context.previousNotifications);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', session?.user?.id] });
        }
    });

    // Mutation: Mark All Read
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            if (session?.user?.id) {
                await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id);
            }
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications', session?.user?.id] });
            const previousNotifications = queryClient.getQueryData(['notifications', session?.user?.id]);

            queryClient.setQueryData(['notifications', session?.user?.id], (old: Notification[] | undefined) => {
                return old ? old.map(n => ({ ...n, is_read: true })) : [];
            });

            return { previousNotifications };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', session?.user?.id] });
        }
    });


    // Hydrate from local storage on mount (Cold start offline support)
    const [offlineOrgData, setOfflineOrgData] = useState<{ org: Organization, roleMetadata: Record<string, any> } | null>(null);
    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await AsyncStorage.getItem(ORG_CACHE_KEY);
                if (cached) {
                    setOfflineOrgData(JSON.parse(cached));
                }
            } catch (e) {
                console.error("Failed to load org cache", e);
            }
        };
        loadCache();
    }, []);

    // Derived State
    // Use Query data if available, otherwise fallback to offline cache
    const activeOrg = orgData?.org || offlineOrgData?.org || null;
    const activeRoleMetadata = orgData?.roleMetadata || offlineOrgData?.roleMetadata || {};
    const features = activeOrg?.features || {};

    const notifications = notificationsData || [];
    const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;


    const refreshOrg = async () => {
        await refetchOrgQuery();
        await refetchNotifications();
    };

    return (
        <OrgContext.Provider value={{
            org: activeOrg,
            features,
            loading: orgLoading && !offlineOrgData, // Only show loading if no cache AND query is loading
            isOnline,
            roleMetadata: activeRoleMetadata,
            notifications,
            unreadCount,
            refreshOrg,
            markNotificationRead: async (id) => markReadMutation.mutate(id),
            markAllRead: async () => markAllReadMutation.mutate()
        }}>
            {children}
        </OrgContext.Provider>
    );
}
