import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../contexts/OrgContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Site = { id: string; name: string };
type Patrol = { id: string; site_id: string; started_at: string };
type Checkpoint = { id: string; name: string; qr_code: string; order: number; description?: string };
type PatrolLog = { checkpoint_id: string; status: string; scanned_at: string };

export default function PatrolScreen() {
    const { org, features } = useOrg();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<Site[]>([]);
    const [activePatrol, setActivePatrol] = useState<Patrol | null>(null);
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [logs, setLogs] = useState<PatrolLog[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

    // Scanner State
    const [scanning, setScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check for active patrol
            const { data: patrol } = await supabase
                .from('patrols')
                .select('id, site_id, started_at')
                .eq('user_id', user.id)
                .eq('status', 'started')
                .maybeSingle();

            if (patrol) {
                setActivePatrol(patrol);
                await loadPatrolData(patrol.site_id, patrol.id);
            } else {
                // Load sites for selection
                const { data: sitesData } = await supabase
                    .from('sites')
                    .select('id, name')
                    .eq('organization_id', org?.id)
                    .order('name');
                setSites(sitesData || []);
                if (sitesData && sitesData.length > 0) setSelectedSiteId(sitesData[0].id);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadPatrolData = async (siteId: string, patrolId: string) => {
        // Load checkpoints
        const { data: cpData } = await supabase
            .from('checkpoints')
            .select('*')
            .eq('site_id', siteId)
            .eq('is_active', true)
            .order('order');
        setCheckpoints(cpData || []);

        // Load logs
        const { data: logData } = await supabase
            .from('patrol_logs')
            .select('checkpoint_id, status, scanned_at')
            .eq('patrol_id', patrolId);
        setLogs(logData || []);
    };

    const startPatrol = async () => {
        if (!selectedSiteId) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('patrols')
                .insert({
                    organization_id: org?.id,
                    site_id: selectedSiteId,
                    user_id: user?.id,
                    status: 'started',
                    started_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            setActivePatrol(data);
            await loadPatrolData(selectedSiteId, data.id);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const endPatrol = async () => {
        if (!activePatrol) return;
        Alert.alert(
            "End Patrol",
            "Are you sure you want to finish this patrol?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Patrol",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await supabase
                                .from('patrols')
                                .update({
                                    status: 'completed',
                                    ended_at: new Date().toISOString()
                                })
                                .eq('id', activePatrol.id);

                            setActivePatrol(null);
                            setCheckpoints([]);
                            setLogs([]);
                            loadInitialData(); // Reload to show start screen
                        } catch (error: any) {
                            Alert.alert("Error", error.message);
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleManualCheck = (checkpoint: Checkpoint) => {
        Alert.alert(
            "Manual Check",
            `Mark ${checkpoint.name} as checked manually?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        // Log it
                        setLoading(true);
                        try {
                            const location = { latitude: 0, longitude: 0 };
                            const { error } = await supabase
                                .from('patrol_logs')
                                .insert({
                                    patrol_id: activePatrol?.id,
                                    checkpoint_id: checkpoint.id,
                                    scanned_at: new Date().toISOString(),
                                    status: 'manual', // Distinguish manual checks
                                    location: location
                                });

                            if (error) throw error;
                            await loadPatrolData(activePatrol!.site_id, activePatrol!.id);
                        } catch (error: any) {
                            Alert.alert("Error", error.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleBarCodeScanned = async (event: { data: string }) => {
        const data = event?.data;
        if (!data || data === 'undefined') return; // Ignore invalid reads

        setScanning(false);
        if (!activePatrol) return;

        // Find checkpoint matching QR code
        const checkpoint = checkpoints.find(cp => cp.qr_code === data);

        if (!checkpoint) {
            Alert.alert("Invalid QR", `Code: ${data}\nDoes not match any checkpoint.`);
            return;
        }

        // Check if already scanned
        if (logs.find(l => l.checkpoint_id === checkpoint.id)) {
            Alert.alert("Already Scanned", "You have already checked this checkpoint.");
            return;
        }

        // Log it
        setLoading(true);
        try {
            const location = { latitude: 0, longitude: 0 };
            const { error } = await supabase
                .from('patrol_logs')
                .insert({
                    patrol_id: activePatrol.id,
                    checkpoint_id: checkpoint.id,
                    scanned_at: new Date().toISOString(),
                    status: 'checked',
                    location: location
                });

            if (error) throw error;

            Alert.alert("Success", `Checked: ${checkpoint.name}`);
            await loadPatrolData(activePatrol.site_id, activePatrol.id);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (activePatrol) {
        const completedCount = logs.length;
        const totalCount = checkpoints.length;
        const progress = totalCount > 0 ? completedCount / totalCount : 0;

        return (
            <View style={[styles.container, { paddingBottom: insets.bottom }]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Patrol in Progress</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{completedCount} of {totalCount} checkpoints checked</Text>
                    {features?.security_manual_check && (
                        <Text style={styles.hintText}>Tip: Long press a checkpoint to manually check.</Text>
                    )}
                </View>

                <ScrollView style={styles.content}>
                    {checkpoints.map((cp, index) => {
                        const isChecked = logs.some(l => l.checkpoint_id === cp.id);
                        return (
                            <TouchableOpacity
                                key={cp.id}
                                style={[styles.checkpointCard, isChecked && styles.checkpointChecked]}
                                onLongPress={() => !isChecked && features?.security_manual_check && handleManualCheck(cp)}
                                delayLongPress={500}
                            >
                                <View style={styles.cpInfo}>
                                    <Text style={styles.cpName}>{index + 1}. {cp.name}</Text>
                                    {cp.description && <Text style={styles.cpDesc}>{cp.description}</Text>}
                                </View>
                                {isChecked ? (
                                    <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                                ) : (
                                    <Ionicons name="ellipse-outline" size={24} color="#cbd5e1" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => {
                            if (!permission?.granted) requestPermission();
                            setScanning(true);
                        }}
                    >
                        <Ionicons name="qr-code-outline" size={24} color="white" />
                        <Text style={styles.scanButtonText}>Scan Checkpoint</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.endButton} onPress={endPatrol}>
                        <Text style={styles.endButtonText}>End Patrol</Text>
                    </TouchableOpacity>
                </View>

                <Modal visible={scanning} animationType="slide">
                    <View style={styles.scannerContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            onBarcodeScanned={handleBarCodeScanned}
                        />
                        <View style={styles.scannerOverlay}>
                            <TouchableOpacity style={styles.closeScanner} onPress={() => setScanning(false)}>
                                <Ionicons name="close" size={32} color="white" />
                            </TouchableOpacity>
                            <View style={styles.scanFrame} />
                            <Text style={styles.scanText}>Align QR Code within frame</Text>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.title}>Start Patrol</Text>
            <Text style={styles.subtitle}>Select a site to begin your patrol duty.</Text>

            <View style={styles.siteList}>
                {sites.map(site => (
                    <TouchableOpacity
                        key={site.id}
                        style={[styles.siteCard, selectedSiteId === site.id && styles.siteCardSelected]}
                        onPress={() => setSelectedSiteId(site.id)}
                    >
                        <Ionicons
                            name={selectedSiteId === site.id ? "radio-button-on" : "radio-button-off"}
                            size={24}
                            color={selectedSiteId === site.id ? "#2563eb" : "#64748b"}
                        />
                        <Text style={[styles.siteName, selectedSiteId === site.id && styles.siteNameSelected]}>
                            {site.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.startButton, !selectedSiteId && styles.disabledButton]}
                onPress={startPatrol}
                disabled={!selectedSiteId}
            >
                <Text style={styles.startButtonText}>Start Patrol</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    center: { justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#64748b', marginBottom: 24 },
    siteList: { gap: 12 },
    siteCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'white', padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: '#e2e8f0'
    },
    siteCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
    siteName: { fontSize: 16, color: '#334155' },
    siteNameSelected: { color: '#2563eb', fontWeight: 'bold' },
    startButton: {
        marginTop: 'auto', backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center'
    },
    disabledButton: { backgroundColor: '#94a3b8' },
    startButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    // Active Patrol Styles
    header: { marginBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
    progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#10b981' },
    progressText: { fontSize: 14, color: '#64748b' },
    hintText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
    content: { flex: 1 },
    checkpointCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12,
        borderLeftWidth: 4, borderLeftColor: '#e2e8f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
    },
    checkpointChecked: { borderLeftColor: '#10b981' },
    cpInfo: { flex: 1 },
    cpName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
    cpDesc: { fontSize: 14, color: '#64748b', marginTop: 2 },
    footer: { marginTop: 16, gap: 12 },
    scanButton: {
        backgroundColor: '#0f172a', padding: 16, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8
    },
    scanButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    endButton: {
        backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center'
    },
    endButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // Scanner
    scannerContainer: { flex: 1, backgroundColor: 'black' },
    scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 20 },
    scanText: { color: 'white', marginTop: 20, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 4 },
    closeScanner: { position: 'absolute', top: 50, right: 20, padding: 10 }
});
