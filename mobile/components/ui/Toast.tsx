import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    visible: boolean;
    onHide: () => void;
    duration?: number;
}

export function Toast({ message, type = 'info', visible, onHide, duration = 3000 }: ToastProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                hide();
            }, duration);

            return () => clearTimeout(timer);
        } else {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (visible) onHide();
        });
    };

    if (!visible) return null;

    const bgColors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };

    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
        success: 'checkmark-circle',
        error: 'alert-circle',
        info: 'information-circle'
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={[styles.content, { backgroundColor: bgColors[type] }]}>
                <Ionicons name={icons[type]} size={24} color="white" />
                <Text style={styles.text}>{message}</Text>
                <TouchableOpacity onPress={hide}>
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60, // Below header
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        width: '100%',
    },
    text: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        flex: 1,
    }
});
