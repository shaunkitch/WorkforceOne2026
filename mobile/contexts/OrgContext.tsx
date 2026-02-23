import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { offlineStore } from '../lib/offline-store';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Organization } from '../../types/app';

// Use a local type to avoid clashing with the global `Notification` browser type
type AppNotification = {
    id: string;
    user_id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    [key: string]: any;
};

// Helper type for features (Json in DB, but usually an object in app)
type FeatureFlags = Record<string, any>;

type OrgContextType = {
    org: Organization | null;
    features: FeatureFlags;
    loading: boolean;
    isOnline: boolean;
    roleMetadata: Record<string, any>;
    notifications: AppNotification[];
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

// Session is passed from _layout.tsx (single source of truth for auth)
export function OrgProvider({ children, session }: { children: React.ReactNode; session: Session | null }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isAppActive, setIsAppActive] = useState(true);
    const queryClient = useQueryClient();

    // Network & AppState listeners — run once only, no auth listener here
    useEffect(() => {
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(online);
            if (online && session) {
                offlineStore.syncOutbox();
            }
        });

        const subscriptionAppState = AppState.addEventListener('change', nextAppState => {
            setIsAppActive(nextAppState === 'active');
        });

        return () => {
            unsubscribeNetInfo();
            subscriptionAppState.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only register once — session ref used inside is via closure

    // When session changes, invalidate queries so data refreshes for the new user
    useEffect(() => {
        if (session) {
            queryClient.invalidateQueries({ queryKey: ['org'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } else {
            // Logged out — clear cached data
            queryClient.clear();
        }
    }, [session, queryClient]);

    // Query: Organization
    const { data: orgData, isLoading: orgLoading, refetch: refetchOrgQuery } = useQuery({
        queryKey: ['org', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data: rawData, error } = await supabase
                .from('organization_members')
                .select('metadata, organizations(id, name, slug, brand_color, logo_url, app_logo_url, features)')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) throw error;

            // Cast to `any` to work around Supabase TS codegen issues with joined tables
            const data = rawData as any;

            if (data?.organizations) {
                const org = data.organizations as Organization;
                const metadata = data.metadata || {};

                // Cache to AsyncStorage for offline cold start
                await AsyncStorage.setItem(ORG_CACHE_KEY, JSON.stringify({ org, roleMetadata: metadata }));

                return { org, roleMetadata: metadata };
            }
            return null;
        },
        enabled: !!session?.user?.id && isOnline,
        staleTime: 1000 * 60 * 60, // 1 hour
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
            return (data || []) as AppNotification[];
        },
        enabled: !!session?.user?.id,
        refetchInterval: isAppActive ? 30000 : false,
    });

    // Mutation: Mark Read
    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', session?.user?.id] });
            const previousNotifications = queryClient.getQueryData(['notifications', session?.user?.id]);

            queryClient.setQueryData(['notifications', session?.user?.id], (old: any) => {
                return old ? old.map((n: any) => n.id === id ? { ...n, is_read: true } : n) : [];
            });

            return { previousNotifications };
        },
        onError: (_err, _id, context) => {
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
                await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', session.user.id);
            }
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications', session?.user?.id] });
            const previousNotifications = queryClient.getQueryData(['notifications', session?.user?.id]);

            queryClient.setQueryData(['notifications', session?.user?.id], (old: any) => {
                return old ? old.map((n: any) => ({ ...n, is_read: true })) : [];
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
    const activeOrg = orgData?.org || offlineOrgData?.org || null;
    const activeRoleMetadata = orgData?.roleMetadata || offlineOrgData?.roleMetadata || {};
    const features = (activeOrg?.features || {}) as FeatureFlags;

    const notifications = (notificationsData || []) as AppNotification[];
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const refreshOrg = async () => {
        await refetchOrgQuery();
        await refetchNotifications();
    };

    return (
        <OrgContext.Provider value={{
            org: activeOrg,
            features,
            loading: orgLoading && !offlineOrgData,
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
