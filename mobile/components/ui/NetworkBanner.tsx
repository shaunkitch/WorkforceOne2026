import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useOrg } from '@/contexts/OrgContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NetworkBanner() {
    const { isOnline } = useOrg();
    const [hidden, setHidden] = useState(true);
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
        if (!isOnline) {
            // Show banner immediately when offline
            setHidden(false);
            Animated.timing(animation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            // When back online, keep showing for a moment then hide
            const timer = setTimeout(() => {
                Animated.timing(animation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setHidden(true));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    if (hidden && isOnline) return null;

    return (
        <Animated.View
            style={{
                transform: [{
                    translateY: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 0] // Slide down
                    })
                }],
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100, // Top of everything
            }}
        >
            <SafeAreaView edges={['top']} className={isOnline ? "bg-green-500" : "bg-slate-800"}>
                <View className="px-4 py-2 flex-row items-center justify-center space-x-2">
                    <Ionicons
                        name={isOnline ? "cloud-done" : "cloud-offline"}
                        size={16}
                        color="white"
                    />
                    <Text className="text-white font-medium text-xs">
                        {isOnline ? "Back online. Syncing changes..." : "You are offline. Changes will be saved."}
                    </Text>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
}
