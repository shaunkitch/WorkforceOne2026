import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useOrg } from '../../contexts/OrgContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../../types/app';

export default function NotificationsScreen() {
    const { notifications, unreadCount, markNotificationRead, markAllRead, refreshOrg } = useOrg();
    const router = useRouter();

    const handlePress = async (notification: Notification) => {
        if (!notification.is_read) {
            await markNotificationRead(notification.id);
        }

        // Navigate based on resource type
        if (notification.resource_type === 'submission' && notification.resource_id) {
            // We don't have a submission specific view in mobile yet, maybe just form entry?
            // For now just mark read.
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            className={`flex-row p-4 border-b border-slate-100 ${item.is_read ? 'bg-white' : 'bg-blue-50/50'}`}
            onPress={() => handlePress(item)}
        >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${item.type === 'error' ? 'bg-red-100' :
                item.type === 'success' ? 'bg-green-100' :
                    item.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                <Ionicons name={
                    item.type === 'error' ? 'alert-circle' :
                        item.type === 'success' ? 'checkmark-circle' :
                            item.type === 'warning' ? 'warning' : 'information-circle'
                } size={20} color={
                    item.type === 'error' ? '#ef4444' :
                        item.type === 'success' ? '#16a34a' :
                            item.type === 'warning' ? '#d97706' : '#2563eb'
                } />
            </View>
            <View className="flex-1">
                <View className="flex-row justify-between items-start">
                    <Text className={`text-base flex-1 mr-2 ${item.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                        {item.title}
                    </Text>
                    <Text className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                </View>
                <Text className="text-slate-500 mt-1 leading-5">{item.message}</Text>
            </View>
            {!item.is_read && (
                <View className="w-2 h-2 bg-blue-600 rounded-full mt-2 ml-2" />
            )}
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white">
            <Stack.Screen options={{
                title: 'Notifications',
                headerRight: () => (
                    unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllRead}>
                            <Text className="text-blue-600 font-bold">Mark all read</Text>
                        </TouchableOpacity>
                    )
                )
            }} />
            <StatusBar style="dark" />

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ flexGrow: 1 }}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-20 px-8">
                        <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-6">
                            <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
                        </View>
                        <Text className="text-lg font-bold text-slate-800 text-center">No notifications</Text>
                        <Text className="text-slate-400 text-center mt-2">
                            You're all caught up! Check back later for updates.
                        </Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refreshOrg} />
                }
            />
        </View>
    );
}
