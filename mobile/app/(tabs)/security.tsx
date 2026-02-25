import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useOrg } from '../../contexts/OrgContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

export default function SecurityScreen() {
    const { org, features, roleMetadata } = useOrg();
    const router = useRouter();
    const [sosSending, setSosSending] = useState(false);

    if (!roleMetadata?.is_security_guard && !features?.security) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50 px-6">
                <Ionicons name="lock-closed" size={64} color="#64748b" />
                <Text className="text-xl font-bold text-slate-800 mt-4 text-center">Access Denied</Text>
                <Text className="text-slate-500 text-center mt-2">You do not have permission to view this section.</Text>
            </View>
        );
    }

    const handleSOS = async () => {
        if (sosSending) return;

        Alert.alert(
            '🚨 Send SOS Alert?',
            'This will immediately notify the control room and your supervisor.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'SEND SOS',
                    style: 'destructive',
                    onPress: async () => {
                        setSosSending(true);
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('Not authenticated');

                            let locationPayload = null;
                            try {
                                const loc = await Location.getCurrentPositionAsync({
                                    accuracy: Location.Accuracy.High,
                                });
                                locationPayload = {
                                    latitude: loc.coords.latitude,
                                    longitude: loc.coords.longitude,
                                    accuracy: loc.coords.accuracy,
                                };
                            } catch {
                                // Location is optional for SOS
                            }

                            const { error } = await supabase.rpc('trigger_sos', {
                                p_user_id: user.id,
                                p_location: locationPayload,
                            });

                            if (error) throw error;

                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert(
                                '✅ SOS Sent',
                                'Control room has been notified. Help is on the way.',
                                [{ text: 'OK' }]
                            );
                        } catch (e: any) {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            Alert.alert('Error', e.message || 'Failed to send SOS. Please call the control room directly.');
                        } finally {
                            setSosSending(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCallControlRoom = () => {
        const phone = (org as any)?.emergency_contact;
        if (!phone) {
            Alert.alert('Not Configured', 'No emergency contact number is set for your organisation. Please contact your administrator.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Linking.openURL(`tel:${phone}`);
    };

    const handleQuickScan = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/scanner');
    };

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar style="light" />
            <LinearGradient
                colors={org?.brand_color ? [org.brand_color, org.brand_color] : ['#1e40af', '#2563eb']}
                className="pt-16 pb-8 px-6 rounded-b-3xl shadow-lg"
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
            >
                <Text className="text-3xl font-bold text-white mb-2">Security Operations</Text>
                <Text className="text-blue-100 text-sm font-medium">Patrols, Incidents &amp; Checkpoints</Text>
            </LinearGradient>

            <ScrollView className="flex-1 px-6 -mt-4" showsVerticalScrollIndicator={false}>

                {/* SOS Button */}
                <TouchableOpacity
                    onPress={handleSOS}
                    disabled={sosSending}
                    accessibilityRole="button"
                    accessibilityLabel="Send SOS alert"
                    accessibilityHint="Double tap to send an emergency SOS alert to the control room"
                    className={`mt-4 mb-6 p-5 rounded-2xl items-center shadow-lg border-2 border-red-600 ${sosSending ? 'bg-red-300' : 'bg-red-500'}`}
                >
                    <Ionicons name="alert-circle" size={40} color="white" />
                    <Text className="text-white text-2xl font-black tracking-widest mt-2">
                        {sosSending ? 'SENDING...' : 'SOS EMERGENCY'}
                    </Text>
                    <Text className="text-red-100 text-xs mt-1">Tap to alert control room instantly</Text>
                </TouchableOpacity>

                {/* Patrol & Incident */}
                <View className="flex-row space-x-4 mb-6">
                    <TouchableOpacity
                        className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-slate-100"
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/security-ops/patrol');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Start Patrol"
                    >
                        <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                            <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
                        </View>
                        <Text className="font-bold text-slate-800 text-base">Start Patrol</Text>
                        <Text className="text-slate-500 text-[10px] text-center mt-1">Begin a new security patrol</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-slate-100"
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/security-ops/incident');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Report Incident"
                    >
                        <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-3">
                            <Ionicons name="warning" size={32} color="#dc2626" />
                        </View>
                        <Text className="font-bold text-slate-800 text-base">Report Incident</Text>
                        <Text className="text-slate-500 text-[10px] text-center mt-1">Log a security issue</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-10">
                    <Text className="text-lg font-bold text-slate-800 mb-4">Quick Actions</Text>

                    <TouchableOpacity
                        className="flex-row items-center py-3 border-b border-slate-50"
                        onPress={handleCallControlRoom}
                        accessibilityRole="button"
                        accessibilityLabel="Call Control Room"
                        accessibilityHint="Opens your phone dialler to call the control room"
                    >
                        <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-3">
                            <Ionicons name="call" size={20} color="#64748b" />
                        </View>
                        <Text className="flex-1 font-medium text-slate-700">Call Control Room</Text>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center py-3"
                        onPress={handleQuickScan}
                        accessibilityRole="button"
                        accessibilityLabel="Scan Checkpoint"
                        accessibilityHint="Opens the QR code scanner to scan a checkpoint"
                    >
                        <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-3">
                            <Ionicons name="qr-code" size={20} color="#64748b" />
                        </View>
                        <Text className="flex-1 font-medium text-slate-700">Scan Checkpoint (Quick)</Text>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
