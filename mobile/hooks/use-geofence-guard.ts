/**
 * useGeofenceGuard
 *
 * Watches the device's GPS position against the nearest site's geofence radius.
 * When a security guard exits the geofence while clocked in, fires a local
 * push notification and queues a Supabase notification via the org context.
 *
 * Usage: Call once in a top-level screen (e.g. SecurityScreen or the root layout
 * when the security feature is active).
 */
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // only alert once every 5 minutes

function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GeofenceSite = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // metres
};

type Options = {
    /** Active site the guard is clocked in at. Pass null/undefined to disable. */
    activeSite: GeofenceSite | null | undefined;
    /** Whether the guard is currently clocked in. Only alert when clocked in. */
    isClockedIn: boolean;
    /** Optional org ID used to write a Supabase notification for supervisors. */
    orgId?: string | null;
};

export function useGeofenceGuard({ activeSite, isClockedIn, orgId }: Options) {
    const lastAlertRef = useRef<number>(0);
    const wasInsideRef = useRef<boolean>(true);
    const subscriberRef = useRef<Location.LocationSubscription | null>(null);

    useEffect(() => {
        if (!activeSite || !isClockedIn) {
            // Stop watching if we're not clocked in or no site
            subscriberRef.current?.remove();
            subscriberRef.current = null;
            wasInsideRef.current = true;
            return;
        }

        let mounted = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted' || !mounted) return;

            subscriberRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 30_000, // check every 30 seconds
                    distanceInterval: 20,  // or every 20m of movement
                },
                async (loc) => {
                    if (!mounted) return;

                    const distance = haversineDistance(
                        loc.coords.latitude,
                        loc.coords.longitude,
                        activeSite.latitude,
                        activeSite.longitude,
                    );

                    const isOutside = distance > activeSite.radius;
                    const now = Date.now();
                    const cooldownExpired = now - lastAlertRef.current > ALERT_COOLDOWN_MS;

                    // Only fire when transitioning inside→outside AND cooldown passed
                    if (isOutside && wasInsideRef.current && cooldownExpired) {
                        wasInsideRef.current = false;
                        lastAlertRef.current = now;

                        // 1. Haptic alert
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                        // 2. Local push notification (visible even if app is backgrounded)
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: '⚠️ Geofence Alert',
                                body: `You have left the designated area for ${activeSite.name}. Please return immediately.`,
                                sound: true,
                            },
                            trigger: null, // fire immediately
                        });

                        // 3. Write a supervisor-visible notification to Supabase (best-effort)
                        if (orgId) {
                            try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) {
                                    await (supabase as any).from('notifications').insert({
                                        organization_id: orgId,
                                        user_id: user.id,
                                        title: 'Guard Left Geofence',
                                        message: `Guard left the designated area for site "${activeSite.name}". Distance: ${Math.round(distance)}m.`,
                                        type: 'warning',
                                    });
                                }
                            } catch (err) {
                                console.warn('[GeofenceGuard] Failed to write Supabase notification', err);
                            }
                        }
                    } else if (!isOutside) {
                        // Guard came back inside — reset so next departure triggers again
                        wasInsideRef.current = true;
                    }
                },
            );
        })();

        return () => {
            mounted = false;
            subscriberRef.current?.remove();
            subscriberRef.current = null;
        };
    }, [activeSite?.id, isClockedIn, orgId]);
}
