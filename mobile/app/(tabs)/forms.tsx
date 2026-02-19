import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

import { useOrg } from '@/contexts/OrgContext';
import { Assignment } from '@/types/app';

export default function FormsList() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { visitId, clientId } = params;
    const { org } = useOrg();

    type AssignmentUI = {
        id: string;
        assignment_id: string;
        name: string;
        description: string;
        icon: string;
        status: string;
    };

    const [loading, setLoading] = useState(true);
    const [forms, setForms] = useState<AssignmentUI[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // ... (fetchForms function remains same) 

    async function fetchForms() {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: assignments, error } = await supabase
                    .from('form_assignments')
                    .select(`
                id,
                status,
                forms (
                    id,
                    title,
                    created_at
                )
            `)
                    .eq('user_id', user.id);

                if (assignments) {
                    const mappedForms = (assignments as unknown as Assignment[]).map((a) => ({
                        ...a.forms,
                        name: a.forms?.title || 'Untitled Form', // Map title to name for UI
                        description: 'Form Assignment', // Default description
                        icon: 'document-text', // Default icon
                        assignment_id: a.id,
                        status: a.status
                    }));
                    setForms(mappedForms);
                }
            }
        } catch (error) {
            console.log('Error fetching forms:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchForms();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchForms();
    }

    const renderItem = ({ item }: { item: AssignmentUI }) => (
        <TouchableOpacity
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row items-center mb-3 mx-4"
            onPress={() => router.push({
                pathname: '/(tabs)/form_entry' as any,
                params: {
                    formId: item.id,
                    assignmentId: item.assignment_id,
                    formName: item.name,
                    visitId: visitId,
                    clientId: clientId,
                    entryId: Date.now().toString() // Force fresh render/effect
                }
            })}
        >
            <View
                className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${item.status === 'completed' ? 'bg-emerald-50' : ''}`}
                style={item.status !== 'completed' && org?.brand_color ? { backgroundColor: `${org.brand_color}10` } : item.status !== 'completed' ? { backgroundColor: '#eff6ff' } : {}}
            >
                <Ionicons
                    name={item.icon || "document-text"}
                    size={24}
                    color={item.status === 'completed' ? "#10b981" : (org?.brand_color || "#2563eb")}
                />
            </View>
            <View className="flex-1">
                <Text className="font-bold text-slate-800 text-lg">{item.name}</Text>
                <Text className="text-slate-500 text-sm mt-1" numberOfLines={2}>{item.description || 'No description'}</Text>
                <View className="flex-row items-center mt-2">
                    <View className={`px-2 py-0.5 rounded-md ${item.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        <Text className={`${item.status === 'completed' ? 'text-emerald-700' : 'text-amber-700'} text-[10px] font-bold uppercase`}>
                            {item.status || 'Pending'}
                        </Text>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-slate-50">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            {/* Header */}
            <LinearGradient
                colors={org?.brand_color ? [org.brand_color, org.brand_color] : ['#1e40af', '#2563eb']}
                className="pt-16 pb-8 px-6 rounded-b-3xl shadow-lg mb-4"
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
            >
                <Text className="text-blue-100 font-medium">Assignments</Text>
                <Text className="text-3xl font-bold text-white mt-1">My Forms</Text>
            </LinearGradient>

            <FlatList
                data={forms}
                renderItem={renderItem}
                keyExtractor={item => item.assignment_id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20 px-6">
                        <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-4">
                            <Ionicons name="clipboard-outline" size={32} color="#94a3b8" />
                        </View>
                        <Text className="text-slate-500 text-lg font-medium">No forms assigned</Text>
                        <Text className="text-slate-400 text-center mt-2">You don't have any pending forms to complete at the moment.</Text>
                    </View>
                }
            />
        </View>
    );
}
