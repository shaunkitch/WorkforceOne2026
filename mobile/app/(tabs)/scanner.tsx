import { StyleSheet, Text, View, Alert, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useOrg } from '@/contexts/OrgContext';

export default function ScannerScreen() {
    const { org } = useOrg();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scannedItem, setScannedItem] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newQuantity, setNewQuantity] = useState('');

    if (!permission) {
        return <View className="flex-1 bg-slate-900" />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50 px-6">
                <Ionicons name="camera-outline" size={64} color="#64748b" />
                <Text className="text-lg font-bold text-slate-800 mt-4 text-center">Camera Access Required</Text>
                <Text className="text-slate-500 text-center mt-2 mb-8">We need your permission to scan barcodes and QR codes.</Text>
                <TouchableOpacity
                    className="bg-blue-600 px-8 py-4 rounded-xl"
                    onPress={requestPermission}
                >
                    <Text className="text-white font-bold">Grant Permission</Text>
                </TouchableOpacity>
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
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "upc_e", "code128", "pdf417"],
                }}
            />

            {/* Header Overlay */}
            <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                className="pt-16 pb-20 px-6 absolute top-0 left-0 right-0 z-10"
            >
                <Text className="text-white text-3xl font-bold">Scanner</Text>
                <Text className="text-slate-300 text-sm font-medium">Scan assets or locations</Text>
            </LinearGradient>

            <View className="flex-1 justify-center items-center">
                <View className="w-64 h-64 border-2 border-white/50 rounded-3xl" />
                <Text className="text-white font-medium mt-6 bg-black/40 px-4 py-2 rounded-full overflow-hidden">
                    Align code within the frame
                </Text>

                {scanned && !modalVisible && !loading && (
                    <TouchableOpacity
                        className="mt-8 bg-white/20 px-6 py-3 rounded-xl border border-white/30"
                        onPress={() => setScanned(false)}
                    >
                        <Text className="text-white font-bold">Tap to Scan Again</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading && (
                <View className="absolute inset-0 bg-black/60 items-center justify-center">
                    <ActivityIndicator size="large" color="#white" />
                    <Text className="text-white font-bold mt-4">Searching Inventory...</Text>
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
