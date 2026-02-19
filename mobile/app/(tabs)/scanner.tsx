import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Alert, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scannedItem, setScannedItem] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newQuantity, setNewQuantity] = useState('');

    if (!permission) {
        // Camera permissions are still loading
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
        setScanned(true);
        setLoading(true);

        try {
            // Query Inventory
            const { data: item, error } = await supabase
                .from('inventory')
                .select('*')
                .or(`barcode.eq.${data},sku.eq.${data}`)
                .single();

            if (error || !item) {
                Alert.alert("Not Found", `No item found with barcode/SKU: ${data}`, [
                    { text: "OK", onPress: () => setScanned(false) }
                ]);
            } else {
                console.log("Found item:", item);
                setScannedItem(item);
                setNewQuantity(item.quantity?.toString() || '0');
                setModalVisible(true);
            }

        } catch (e: any) {
            Alert.alert("Error", e.message);
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async () => {
        if (!scannedItem) return;
        setLoading(true);
        try {
            const qty = parseInt(newQuantity);
            if (isNaN(qty)) throw new Error("Invalid quantity");

            const { error } = await supabase
                .from('inventory')
                .update({ quantity: qty, updated_at: new Date().toISOString() })
                .eq('id', scannedItem.id);

            if (error) throw error;

            Alert.alert("Success", "Stock updated!");
            setModalVisible(false);
            setScannedItem(null);
            setScanned(false); // Ready for next scan

        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "upc_e", "code128", "pdf417"],
                }}
            />

            <View style={styles.overlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.helpText}>Align QR code or Barcode within the frame</Text>

                {scanned && !modalVisible && !loading && (
                    <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
                )}
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={{ color: 'white', marginTop: 10 }}>Searching...</Text>
                </View>
            )}

            {/* ITEM DETAILS MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                    setScanned(false);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Item Found!</Text>

                        {scannedItem && (
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>{scannedItem.name}</Text>
                                <Text style={styles.itemSku}>SKU: {scannedItem.sku}</Text>
                                <Text style={styles.itemLoc}>Location: {scannedItem.location || 'N/A'}</Text>

                                <View style={styles.qtyContainer}>
                                    <Text style={styles.label}>New Qty:</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={newQuantity}
                                        onChangeText={setNewQuantity}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.modalButtonClose]}
                                onPress={() => {
                                    setModalVisible(!modalVisible);
                                    setScanned(false);
                                }}
                            >
                                <Text style={styles.textStyle}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.modalButtonSave]}
                                onPress={handleUpdateQuantity}
                            >
                                <Text style={styles.textStyle}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'transparent',
        borderRadius: 12,
        marginBottom: 20,
    },
    helpText: {
        color: 'white',
        fontSize: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    modalView: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    itemDetails: {
        marginBottom: 20,
    },
    itemName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    itemSku: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 4,
    },
    itemLoc: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 12,
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },
    label: {
        fontSize: 16,
        marginRight: 10,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        fontSize: 18,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        borderRadius: 10,
        padding: 12,
        elevation: 2,
        flex: 0.48,
        alignItems: 'center',
    },
    modalButtonClose: {
        backgroundColor: '#64748b',
    },
    modalButtonSave: {
        backgroundColor: '#2563eb',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});
