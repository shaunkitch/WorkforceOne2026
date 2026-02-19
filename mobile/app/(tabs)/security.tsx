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

    if (!roleMetadata?.is_security_guard && !features?.security) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Access Denied</Text>
                <Text style={styles.subtext}>You do not have permission to view this section.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={org?.brand_color ? [org.brand_color, org.brand_color] : ['#1e40af', '#2563eb']}
                style={styles.headerGradient}
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
            >
                <Text style={styles.headerTitle}>Security Operations</Text>
                <Text style={styles.headerSubtitle}>Patrols, Incidents & Checkpoints</Text>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => {
                            console.log('Navigating to Patrol: /security-ops/patrol');
                            try {
                                router.push('/security-ops/patrol');
                            } catch (e) {
                                console.error('Navigation error:', e);
                            }
                        }}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
                            <Ionicons name="shield-checkmark" size={32} color="#0284c7" />
                        </View>
                        <Text style={styles.cardTitle}>Start Patrol</Text>
                        <Text style={styles.cardDescription}>Begin a new security patrol</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => {
                            console.log('Navigating to Incident: /security-ops/incident');
                            try {
                                router.push('/security-ops/incident');
                            } catch (e) {
                                console.error('Navigation error:', e);
                            }
                        }}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                            <Ionicons name="warning" size={32} color="#dc2626" />
                        </View>
                        <Text style={styles.cardTitle}>Report Incident</Text>
                        <Text style={styles.cardDescription}>Log a security issue</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.recentActivity}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <TouchableOpacity style={styles.listItem}>
                        <Ionicons name="call" size={24} color="#666" />
                        <Text style={styles.listText}>Call Control Room</Text>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.listItem}>
                        <Ionicons name="qr-code" size={24} color="#666" />
                        <Text style={styles.listText}>Scan Checkpoint (Quick)</Text>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>


                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerGradient: {
        paddingTop: 64, // pt-16
        paddingBottom: 32, // pb-8
        paddingHorizontal: 24, // px-6
        borderBottomLeftRadius: 24, // rounded-b-3xl
        borderBottomRightRadius: 24, // rounded-b-3xl
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#dbeafe',
        marginTop: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginTop: 50
    },
    subtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    card: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
    },
    recentActivity: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#0f172a',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        gap: 12
    },
    listText: {
        flex: 1,
        fontSize: 15,
        color: '#334155',
    }
});
