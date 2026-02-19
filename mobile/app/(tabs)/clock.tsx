import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useOrg } from '@/contexts/OrgContext';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

// Simple Haversine implementation if geolib not available
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

export default function ClockScreen() {
    const { org } = useOrg(); // Get current org
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [sites, setSites] = useState<any[]>([]);
    const [nearestSite, setNearestSite] = useState<any | null>(null);
    const [distanceToSite, setDistanceToSite] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [clocking, setClocking] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<any | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Initial Load
    useEffect(() => {
        if (org) {
            loadData();
        }
    }, [org]);

    // Location Watcher (Run once on mount)
    useEffect(() => {
        let subscriber: Location.LocationSubscription;

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            // Get initial location immediately if possible
            const currentLoc = await Location.getCurrentPositionAsync({});
            setLocation(currentLoc);

            subscriber = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
                (loc) => {
                    setLocation(loc);
                }
            );
        })();

        return () => {
            if (subscriber) subscriber.remove();
        };
    }, []);

    // Recalculate Nearest Site whenever Location or Sites change
    useEffect(() => {
        if (!location || !sites || sites.length === 0) return;

        let minDist = Infinity;
        let closest = null;

        sites.forEach(site => {
            if (site.latitude && site.longitude) {
                const dist = calculateDistance(
                    location.coords.latitude,
                    location.coords.longitude,
                    site.latitude,
                    site.longitude
                );
                if (dist < minDist) {
                    minDist = dist;
                    closest = site;
                }
            }
        });

        setNearestSite(closest);
        setDistanceToSite(minDist);
    }, [location, sites]);

    const loadData = async () => {
        if (!org) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Sites for current Org
            const { data: mySites, error: sitesError } = await supabase
                .from('sites')
                .select('*')
                .eq('organization_id', org.id);

            if (sitesError) {
                console.error("Error fetching sites:", sitesError);
                Alert.alert("Error", "Failed to load sites.");
            }
            if (mySites) {
                console.log("Loaded sites:", mySites.length);
                setSites(mySites);
            }

            // 2. Fetch active time entry
            const { data: activeEntry, error: entryError } = await supabase
                .from('time_entries')
                .select('*')
                .eq('user_id', user.id)
                .is('clock_out', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(); // Changed from single() to maybeSingle() to avoid 406 if no entry

            if (!entryError && activeEntry) {
                setCurrentEntry(activeEntry);
            } else {
                setCurrentEntry(null);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };



    const handleClockAction = async () => {
        if (clocking) return;
        setClocking(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            if (currentEntry) {
                // CLOCK OUT
                const { error } = await supabase
                    .from('time_entries')
                    .update({
                        clock_out: new Date().toISOString(),
                        // Optionally calculated duration DB trigger or here
                    })
                    .eq('id', currentEntry.id);

                if (error) throw error;
                Alert.alert("Success", "Clocked Out!");
                setCurrentEntry(null);

            } else {
                // CLOCK IN
                // Validate Geofence
                if (!nearestSite) {
                    Alert.alert("Error", "No sites loaded.");
                    return;
                }
                if (distanceToSite! > nearestSite.radius) {
                    Alert.alert("Outside Geofence", `You are ${Math.round(distanceToSite!)}m away from ${nearestSite.name}. Must be within ${nearestSite.radius}m.`);
                    return;
                }

                const { data, error } = await supabase
                    .from('time_entries')
                    .insert({
                        user_id: user.id,
                        organization_id: nearestSite.organization_id, // Important
                        clock_in: new Date().toISOString(),
                        location: {
                            latitude: location?.coords.latitude,
                            longitude: location?.coords.longitude,
                            accuracy: location?.coords.accuracy
                        },
                        notes: `Clocked in at ${nearestSite.name}`
                    })
                    .select()
                    .single();

                if (error) throw error;
                Alert.alert("Success", `Clocked In at ${nearestSite.name}!`);
                setCurrentEntry(data);
            }
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setClocking(false);
        }
    };

    if (loading && !sites.length) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const isWithinRange = nearestSite && distanceToSite !== null && distanceToSite <= nearestSite.radius;

    return (
        <View style={styles.outerContainer}>
            <StatusBar style="light" />
            <LinearGradient
                colors={org?.brand_color ? [org.brand_color, org.brand_color] : ['#1e40af', '#2563eb']}
                style={styles.headerGradient}
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
            >
                <Text style={styles.headerTitle}>Time & Attendance</Text>
                <Text style={styles.headerSubtitle}>Clock In/Out Management</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.container}>
                {/* STATUS CARD */}
                <View style={[styles.card, currentEntry ? styles.cardActive : styles.cardInactive]}>
                    <Text style={styles.statusLabel}>Current Status</Text>
                    <Text style={styles.statusText}>
                        {currentEntry ? "CLOCKED IN" : "CLOCKED OUT"}
                    </Text>
                    {currentEntry && (
                        <Text style={styles.timeText}>
                            Since: {new Date(currentEntry.clock_in).toLocaleTimeString()}
                        </Text>
                    )}
                </View>

                {/* LOCATION CARD */}
                <View style={styles.locationCard}>
                    <Ionicons name="location" size={24} color="#64748b" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.locationTitle}>
                            {nearestSite ? nearestSite.name : "Searching for sites..."}
                        </Text>
                        {nearestSite && (
                            <Text style={[styles.distanceText, isWithinRange ? styles.textGreen : styles.textRed]}>
                                {Math.round(distanceToSite || 0)}m away (Radius: {nearestSite.radius}m)
                            </Text>
                        )}
                        {!nearestSite && location && (
                            <Text style={styles.distanceText}>
                                GPS: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* ACTION BUTTON */}
                <TouchableOpacity
                    style={[
                        styles.button,
                        currentEntry ? styles.btnOut : styles.btnIn,
                        // (!currentEntry && !isWithinRange) ? styles.btnDisabled : {} // Remove visual disable to encourage click for feedback
                    ]}
                    onPress={handleClockAction}
                // disabled={!currentEntry && !isWithinRange} // Allow click to show validation errors
                >
                    {clocking ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name={currentEntry ? "log-out-outline" : "log-in-outline"} size={24} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>
                                {currentEntry ? "CLOCK OUT" : "CLOCK IN"}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {!currentEntry && !isWithinRange && nearestSite && (
                    <Text style={styles.warningText}>
                        You must be within range of a site to clock in.
                    </Text>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        paddingTop: 10,
    },
    headerGradient: {
        paddingTop: 64, // pt-16
        paddingBottom: 32, // pb-8
        paddingHorizontal: 24, // px-6
        borderBottomLeftRadius: 24, // rounded-b-3xl
        borderBottomRightRadius: 24, // rounded-b-3xl
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#dbeafe',
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardActive: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#22c55e',
    },
    cardInactive: {
        backgroundColor: 'white',
        // borderWidth: 1,
        // borderColor: '#e2e8f0',
    },
    statusLabel: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#64748b',
        marginBottom: 8,
    },
    statusText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f172a',
    },
    timeText: {
        marginTop: 8,
        fontSize: 16,
        color: '#334155',
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    distanceText: {
        fontSize: 14,
        marginTop: 2,
    },
    textGreen: {
        color: '#16a34a',
        fontWeight: 'bold',
    },
    textRed: {
        color: '#dc2626',
    },
    button: {
        flexDirection: 'row',
        width: '100%',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    btnIn: {
        backgroundColor: '#2563eb',
    },
    btnOut: {
        backgroundColor: '#ef4444',
    },
    btnDisabled: {
        backgroundColor: '#94a3b8',
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    warningText: {
        marginTop: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
});
