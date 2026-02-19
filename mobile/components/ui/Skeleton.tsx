import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewProps } from 'react-native';

interface SkeletonProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
}

export function Skeleton({ width, height, borderRadius = 8, style, ...props }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                })
            ])
        );
        loop.start();

        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    opacity,
                },
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: '#cbd5e1'
                } as any,
                style
            ]}
            {...props}
        />
    );
}

export function DashboardSkeleton() {
    return (
        <View className="flex-1 bg-slate-50">
            {/* Header Skeleton */}
            <View className="pt-16 pb-8 px-6 bg-slate-200 rounded-b-3xl mb-4">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Skeleton width={100} height={20} style={{ marginBottom: 8 }} />
                        <Skeleton width={180} height={32} />
                    </View>
                    <Skeleton width={40} height={40} borderRadius={20} />
                </View>
                <View className="flex-row space-x-4">
                    <Skeleton width="48%" height={80} borderRadius={16} />
                    <Skeleton width="48%" height={80} borderRadius={16} />
                </View>
            </View>

            <View className="px-6 space-y-6">
                {/* Quick Actions */}
                <Skeleton width="100%" height={80} borderRadius={16} />

                {/* List */}
                <View>
                    <Skeleton width={120} height={24} style={{ marginBottom: 16 }} />
                    <View className="space-y-4">
                        <Skeleton width="100%" height={100} borderRadius={16} />
                        <Skeleton width="100%" height={100} borderRadius={16} />
                    </View>
                </View>
            </View>
        </View>
    )
}
