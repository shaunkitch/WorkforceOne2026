import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOrg } from '../contexts/OrgContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { org } = useOrg();

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            router.replace('/(tabs)');
        }
    }

    return (
        <View className="flex-1 bg-slate-900">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            <LinearGradient
                colors={['#1e293b', '#0f172a']}
                className="absolute w-full h-full"
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                <View className="items-center mb-10">
                    <View className="w-24 h-24 bg-blue-600 rounded-2xl items-center justify-center mb-6 shadow-lg overflow-hidden">
                        {(org?.app_logo_url || org?.logo_url) ? (
                            <Image
                                source={{ uri: org.app_logo_url || org.logo_url }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                transition={1000}
                            />
                        ) : (
                            <Ionicons name="briefcase" size={48} color="white" />
                        )}
                    </View>
                    <Text className="text-3xl font-bold text-white tracking-tight">{org?.name || 'WorkforceOne'}</Text>
                    <Text className="text-slate-400 mt-2 text-base">Field Operations</Text>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-slate-300 mb-2 font-medium">Email Address</Text>
                        <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 h-12 px-4">
                            <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                            <TextInput
                                className="flex-1 ml-3 text-white text-base h-full"
                                placeholder="name@company.com"
                                placeholderTextColor="#64748b"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className="text-slate-300 mb-2 font-medium">Password</Text>
                        <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 h-12 px-4">
                            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                            <TextInput
                                className="flex-1 ml-3 text-white text-base h-full"
                                placeholder="Enter your password"
                                placeholderTextColor="#64748b"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        className="w-full h-12 bg-blue-600 rounded-xl items-center justify-center mt-6"
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
