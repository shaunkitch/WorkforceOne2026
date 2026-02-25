import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Constants } from 'expo-constants';

import { useOrg } from '@/contexts/OrgContext';

export default function Profile() {
    const { org, isOnline } = useOrg();
    const [profile, setProfile] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editMobile, setEditMobile] = useState("");
    const [saving, setSaving] = useState(false);

    // About Modal State
    const [showAbout, setShowAbout] = useState(false);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
                setEditName(data?.full_name || "");
                setEditMobile(data?.mobile || "");
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    }

    async function handleSaveProfile() {
        if (!user) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName,
                    mobile: editMobile
                })
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert("Success", "Profile updated successfully");
            setProfile({ ...profile, full_name: editName, mobile: editMobile });
            setIsEditing(false);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    }

    function handleSupport() {
        const subject = encodeURIComponent("Support Request: WorkforceOne Mobile App");
        const body = encodeURIComponent(`\n\nUser: ${profile?.full_name || 'Unknown'}\nEmail: ${user?.email}\nVersion: 1.0.0`);
        const url = `mailto:support@workforceone.com?subject=${subject}&body=${body}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Error", "Could not open email client.");
            }
        });
    }

    async function signOut() {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) Alert.alert('Error', error.message);
                        else router.replace('/login');
                    }
                }
            ]
        );
    }

    interface MenuItemProps {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        onPress: () => void;
        color?: string;
        textColor?: string;
    }

    const MenuItem = ({ icon, label, onPress, color = "#1e293b", textColor = "text-slate-800" }: MenuItemProps) => (
        <TouchableOpacity
            className="flex-row items-center bg-white p-4 rounded-xl border border-slate-100 mb-3 shadow-sm active:bg-slate-50"
            onPress={onPress}
        >
            <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center mr-4">
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text className={`flex-1 font-medium text-base ${textColor}`}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-slate-50">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            <LinearGradient
                colors={org?.brand_color ? [org.brand_color, org.brand_color] : ['#1e40af', '#2563eb']}
                className="pt-16 pb-8 px-6 rounded-b-3xl shadow-lg mb-6 items-center"
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
            >
                <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-4 border-2 border-white/30 backdrop-blur-md">
                    <Text className="text-4xl text-white font-bold">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U"}
                    </Text>
                </View>
                <Text className="text-2xl font-bold text-white mb-1">
                    {profile?.full_name || "User"}
                </Text>
                <Text className="text-blue-100 font-medium bottom-1">
                    {user?.email}
                </Text>
                <View className="flex-row mt-4 space-x-2">
                    <View className="bg-white/20 px-3 py-1 rounded-full border border-white/20">
                        <Text className="text-white text-xs font-bold uppercase">{profile?.role || "Field Agent"}</Text>
                    </View>
                    {!isOnline && (
                        <View className="bg-red-500/20 px-3 py-1 rounded-full border border-red-200/50">
                            <Text className="text-white text-xs font-bold uppercase">OFFLINE</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            <ScrollView className="flex-1 px-6">
                <Text className="text-slate-500 font-bold mb-4 ml-2 uppercase text-xs tracking-wider">Settings</Text>
                <MenuItem icon="person-outline" label="Edit Profile" onPress={() => setIsEditing(true)} />
                <MenuItem icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
                <MenuItem icon="lock-closed-outline" label="Security" onPress={() => Alert.alert("Coming Soon", "Security settings will be available in a future update.")} />

                <Text className="text-slate-500 font-bold mb-4 mt-6 ml-2 uppercase text-xs tracking-wider">HR & Compliance</Text>
                <MenuItem icon="cash-outline" label="My Payslips" onPress={() => Linking.openURL(`https://workforceone.app/dashboard/${org?.id}/hr/payroll/analytics`)} />
                <MenuItem icon="shield-checkmark-outline" label="My Compliance" onPress={() => Linking.openURL(`https://workforceone.app/dashboard/${org?.id}/compliance`)} />

                <Text className="text-slate-500 font-bold mb-4 mt-6 ml-2 uppercase text-xs tracking-wider">Support</Text>
                <MenuItem icon="help-circle-outline" label="Help & Support" onPress={handleSupport} />
                <MenuItem icon="information-circle-outline" label="About App" onPress={() => setShowAbout(true)} />

                <TouchableOpacity
                    className="flex-row items-center bg-red-50 p-4 rounded-xl border border-red-100 mt-6 mb-12"
                    onPress={signOut}
                >
                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-4">
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    </View>
                    <Text className="flex-1 font-bold text-base text-red-600">Sign Out</Text>
                </TouchableOpacity>

                <View className="items-center mb-10">
                    <Text className="text-slate-400 text-xs">Version 1.0.0 (Build 100)</Text>
                    <Text className="text-slate-400 text-xs mt-1">Powered by WorkforceOne</Text>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-slate-50 pt-6">
                    <View className="flex-row justify-between items-center px-6 pb-6 border-b border-slate-200 bg-white pt-4">
                        <Text className="text-xl font-bold text-slate-900">Edit Profile</Text>
                        <TouchableOpacity onPress={() => setIsEditing(false)}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="p-6">
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-slate-700 mb-2">Full Name</Text>
                            <TextInput
                                className="bg-white border border-slate-200 rounded-xl p-4 text-base text-slate-900"
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Enter your full name"
                            />
                        </View>
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-slate-700 mb-2">Mobile Number</Text>
                            <TextInput
                                className="bg-white border border-slate-200 rounded-xl p-4 text-base text-slate-900"
                                value={editMobile}
                                onChangeText={setEditMobile}
                                placeholder="Enter mobile number"
                                keyboardType="phone-pad"
                            />
                        </View>
                        <TouchableOpacity
                            className={`bg-blue-600 p-4 rounded-xl items-center ${saving ? 'opacity-70' : ''}`}
                            onPress={handleSaveProfile}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-base">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* About Modal */}
            <Modal visible={showAbout} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 min-h-[40%]">
                        <View className="items-center mb-6">
                            <View className="w-16 h-1 bg-slate-300 rounded-full mb-6" />
                            <View className="w-20 h-20 bg-blue-600 rounded-2xl items-center justify-center mb-4">
                                <Ionicons name="cube" size={40} color="white" />
                            </View>
                            <Text className="text-2xl font-bold text-slate-900">WorkforceOne</Text>
                            <Text className="text-slate-500 font-medium">Field Operations Platform</Text>
                        </View>

                        <View className="space-y-4 mb-8">
                            <View className="flex-row justify-between border-b border-slate-100 py-3">
                                <Text className="text-slate-500">Version</Text>
                                <Text className="font-medium text-slate-900">1.0.0 (Production)</Text>
                            </View>
                            <View className="flex-row justify-between border-b border-slate-100 py-3">
                                <Text className="text-slate-500">Build Number</Text>
                                <Text className="font-medium text-slate-900">100</Text>
                            </View>
                            <View className="flex-row justify-between border-b border-slate-100 py-3">
                                <Text className="text-slate-500">Organization</Text>
                                <Text className="font-medium text-slate-900">{org?.name || "Unknown"}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            className="bg-slate-100 p-4 rounded-xl items-center mt-auto"
                            onPress={() => setShowAbout(false)}
                        >
                            <Text className="text-slate-900 font-bold text-base">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
