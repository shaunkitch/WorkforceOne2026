import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useOrg } from '../../contexts/OrgContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function SecurityScreen() {
    const { org, features, roleMetadata } = useOrg();
    const router = useRouter();

    export default function SecurityScreen() {
        const { org, features, roleMetadata } = useOrg();
        const router = useRouter();

        if (!roleMetadata?.is_security_guard && !features?.security) {
            return (
                <View className="flex-1 justify-center items-center bg-slate-50 px-6">
                    <Ionicons name="lock-closed" size={64} color="#64748b" />
                    <Text className="text-xl font-bold text-slate-800 mt-4 text-center">Access Denied</Text>
                    <Text className="text-slate-500 text-center mt-2">You do not have permission to view this section.</Text>
                </View>
            );
        }

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
                    <Text className="text-blue-100 text-sm font-medium">Patrols, Incidents & Checkpoints</Text>
                </LinearGradient>

                <ScrollView className="flex-1 px-6 -mt-4" showsVerticalScrollIndicator={false}>
                    <View className="flex-row space-x-4 mb-8">
                        <TouchableOpacity
                            className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-slate-100"
                            onPress={() => router.push('/security-ops/patrol')}
                        >
                            <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                                <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
                            </View>
                            <Text className="font-bold text-slate-800 text-base">Start Patrol</Text>
                            <Text className="text-slate-500 text-[10px] text-center mt-1">Begin a new security patrol</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-slate-100"
                            onPress={() => router.push('/security-ops/incident')}
                        >
                            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-3">
                                <Ionicons name="warning" size={32} color="#dc2626" />
                            </View>
                            <Text className="font-bold text-slate-800 text-base">Report Incident</Text>
                            <Text className="text-slate-500 text-[10px] text-center mt-1">Log a security issue</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-10">
                        <Text className="text-lg font-bold text-slate-800 mb-4">Quick Actions</Text>

                        <TouchableOpacity className="flex-row items-center py-3 border-b border-slate-50">
                            <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-3">
                                <Ionicons name="call" size={20} color="#64748b" />
                            </View>
                            <Text className="flex-1 font-medium text-slate-700">Call Control Room</Text>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-3">
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
