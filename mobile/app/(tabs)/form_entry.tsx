import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { offlineStore } from '@/lib/offline-store';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SignaturePad } from '@/components/SignaturePad';
import { Toast } from '@/components/ui/Toast';
import { useOrg } from '@/contexts/OrgContext';

export default function FormEntry() {
    const params = useLocalSearchParams();
    const { formId, formName, assignmentId, visitId, clientId } = params;
    // Use state for assignmentId so we can clear it upon "Submit Another"
    const [activeAssignmentId, setActiveAssignmentId] = useState(assignmentId);
    const { org } = useOrg();

    type MobileFormElement = {
        id: string;
        type: string;
        label: string;
        placeholder?: string;
        required?: boolean;
        options?: string[];
        text?: string;
        height?: number;
    };

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formFields, setFormFields] = useState<MobileFormElement[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});

    // ... (rest of state)


    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
        visible: false,
        message: '',
        type: 'info'
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ visible: true, message, type });
    };

    // Helper to get location silently with timeout
    const getSubmissionLocation = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') return null;

            // Race between location and timeout
            const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 3000));

            const location: any = await Promise.race([locationPromise, timeoutPromise]);

            return {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                accuracy: location.coords.accuracy,
                timestamp: location.timestamp
            };
        } catch (e) {
            console.log("Location failed or timed out", e);
            return null;
        }
    }

    const validateForm = () => {
        for (const field of formFields) {
            if (field.required && !formData[field.id]) {
                return false;
            }
        }
        return true;
    };

    const submitForm = async (reset: boolean = false) => {
        if (!validateForm()) {
            Alert.alert('Missing Fields', 'Please fill in all required fields.');
            return;
        }

        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Capture critical metadata (with timeout)
            const submissionLocation = await getSubmissionLocation();

            // Prepare payload for Outbox
            const payload = {
                form_id: formId,
                user_id: user.id,
                assignment_id: activeAssignmentId || null,
                visit_id: visitId || null,
                client_id: clientId || null,
                data: formData,
                location: submissionLocation,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            };

            // Save to Local Outbox (Instant)
            await offlineStore.addToOutbox({
                type: 'SUBMIT_FORM',
                payload
            });

            // Trigger Sync in Background (Fire & Forget)
            offlineStore.syncOutbox().catch(err => console.log("Background sync error", err));

            // Success Feedback
            showToast('Form saved to outbox!', 'success');

            // Haptic Feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (reset) {
                // Reset form for next entry
                const resetData: Record<string, any> = {};
                formFields.forEach(field => {
                    if (!['header', 'paragraph', 'separator', 'spacer'].includes(field.type)) {
                        resetData[field.id] = '';
                    }
                });
                setFormData(resetData);
                setActiveAssignmentId(''); // Clear assignment association for subsequent

                // Scroll to top? (Optional, might need ref)
            } else {
                // Navigate back after short delay to let toast show
                setTimeout(() => {
                    router.back();
                }, 500);
            }

        } catch (error: any) {
            console.error('Submission error:', error);
            Alert.alert('Error', error.message || 'Failed to submit form');
        } finally {
            setSubmitting(false);
        }
    };
    const [permission, requestPermission] = useCameraPermissions();
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanningField, setScanningField] = useState<string | null>(null);

    // Select Modal State
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [currentSelectField, setCurrentSelectField] = useState<any>(null);

    // Signature Modal State
    const [isSignatureOpen, setIsSignatureOpen] = useState(false);
    const [currentSignatureField, setCurrentSignatureField] = useState<string | null>(null);

    // Scanner State
    // Stores array of { code: string, qty: number }
    const [scannedItems, setScannedItems] = useState<{ code: string; qty: number }[]>([]);
    const [isScanTriggered, setIsScanTriggered] = useState(false);

    // Fetch form fields
    useEffect(() => {
        async function fetchFormFields() {
            setLoading(true);
            setFormData({}); // Clear data immediately to prevent flash
            try {
                // Fetch form content from forms table
                const { data: form, error } = await supabase
                    .from('forms')
                    .select('content, title')
                    .eq('id', formId)
                    .single();

                if (error) throw error;

                if (form && form.content) {
                    const content = form.content as any[]; // content from DB is Json
                    const parsedFields: MobileFormElement[] = content.map((el: any) => {
                        // Map web builder types to mobile render types
                        let type = 'text';
                        switch (el.type) {
                            case 'TextField': type = 'text'; break;
                            case 'NumberField': type = 'number'; break;
                            case 'TextAreaField': type = 'textarea'; break;
                            case 'DateField': type = 'date'; break;
                            case 'CheckboxField': type = 'checkbox'; break;
                            case 'SelectField': type = 'select'; break;
                            case 'TitleField':
                            case 'SubTitleField': type = 'header'; break;
                            case 'ParagraphField': type = 'paragraph'; break;
                            case 'SeparatorField': type = 'separator'; break;
                            case 'LocationField': type = 'location'; break;
                            case 'ImageUploadField': type = 'image'; break;
                            case 'BarcodeField': type = 'barcode'; break;
                            case 'SignatureField': type = 'signature'; break; // Treat signature as image upload for now
                            case 'SpacerField': type = 'spacer'; break;
                            default: type = 'text';
                        }

                        return {
                            id: el.id,
                            type,
                            label: el.extraAttributes?.label || el.extraAttributes?.title || '',
                            placeholder: el.extraAttributes?.placeholder || '',
                            required: el.extraAttributes?.required || false,
                            options: el.extraAttributes?.options || [], // For select
                            text: el.extraAttributes?.text || '', // For paragraph
                            height: el.extraAttributes?.height || 20 // For spacer
                        };
                    });

                    setFormFields(parsedFields);

                    // Initialize form data
                    const initialData: Record<string, any> = {};
                    parsedFields.forEach(field => {
                        if (!['header', 'paragraph', 'separator', 'spacer'].includes(field.type)) {
                            initialData[field.id] = '';
                        }
                    });

                    // Handle Duplication
                    if (params.duplicateSubmissionId) {
                        try {
                            const { data: submission } = await supabase
                                .from('submissions')
                                .select('data')
                                .eq('id', params.duplicateSubmissionId)
                                .single();

                            if (submission && submission.data) {
                                const sourceData = submission.data as Record<string, any>;
                                // Merge data but exclude explicit types
                                Object.keys(sourceData).forEach(key => {
                                    // Find field definition
                                    const fieldDef = (parsedFields as MobileFormElement[]).find(f => f.id === key);
                                    if (fieldDef) {
                                        // Exclude unique fields
                                        if (!['image', 'signature', 'location'].includes(fieldDef.type)) {
                                            initialData[key] = sourceData[key];
                                        }
                                    }
                                });
                                Alert.alert('Duplicate', 'Form pre-filled from previous submission.');
                            }
                        } catch (err) {
                            console.log('Error duplicating form:', err);
                        }
                    }

                    setFormData(initialData);
                }
            } catch (error) {
                console.log('Error fetching fields:', error);
                Alert.alert('Error', 'Failed to load form fields');
            } finally {
                setLoading(false);
            }
        }

        if (formId) {
            fetchFormFields();
        }
    }, [formId, params.duplicateSubmissionId, params.entryId]);

    const updateField = (fieldId: string, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    const getCurrentLocation = async (fieldId: string) => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        updateField(fieldId, {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp
        });
    };

    const pickImage = async (fieldId: string) => {
        // Request permissions first
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            updateField(fieldId, result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : result.assets[0].uri);
        }
    };

    // Camera / Scanner Functions
    const openScanner = async (fieldId: string) => {
        if (!permission) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission needed', 'Camera permission is required to scan barcodes.');
                return;
            }
        } else if (!permission.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission needed', 'Camera permission is required to scan barcodes.');
                return;
            }
        }

        setScanningField(fieldId);
        setScannedItems([]); // Reset for new session. 
        // Optional: Pre-fill from existing field data if it matches format? 
        // For now, simpler to start fresh or maybe parse. 
        // Let's check if current value is string format we use (Code (Qty: N)).
        const currentValue = formData[fieldId];
        if (typeof currentValue === 'string' && currentValue.includes('(Qty:')) {
            // Attempt to parse existing data
            const lines = currentValue.split('\n');
            const parsed = lines.map(line => {
                const match = line.match(/(.*) \(Qty: (\d+)\)/);
                if (match) return { code: match[1], qty: parseInt(match[2]) };
                return null;
            }).filter(Boolean) as { code: string; qty: number }[];
            if (parsed.length > 0) setScannedItems(parsed);
        }

        setIsScannerOpen(true);
    };

    const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
        if (scanningField && isScannerOpen && isScanTriggered) {
            setScannedItems(prev => {
                const existingIndex = prev.findIndex(item => item.code === data);
                if (existingIndex >= 0) {
                    // Item exists, increment qty
                    const newItems = [...prev];
                    newItems[existingIndex].qty += 1;
                    return newItems;
                } else {
                    // New item
                    return [{ code: data, qty: 1 }, ...prev];
                }
            });

            // Haptic Feedback for confirmation
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Reset trigger to stop scanning
            setIsScanTriggered(false);
        }
    };

    const confirmScan = () => {
        if (scanningField) {
            // Serialize
            const textValue = scannedItems.map(item => `${item.code} (Qty: ${item.qty})`).join('\n');
            updateField(scanningField, textValue);
            setIsScannerOpen(false);
            setScanningField(null);
            setScannedItems([]);
        }
    };

    const updateQty = (code: string, delta: number) => {
        setScannedItems(prev => {
            return prev.map(item => {
                if (item.code === code) {
                    const newQty = Math.max(0, item.qty + delta);
                    return { ...item, qty: newQty };
                }
                return item;
            }).filter(item => item.qty > 0); // Remove if 0
        });
    };

    const openSignaturePad = (fieldId: string) => {
        setCurrentSignatureField(fieldId);
        setIsSignatureOpen(true);
    };

    const handleSignature = (signature: string) => {
        if (currentSignatureField) {
            updateField(currentSignatureField, signature); // signature is base64 image
            setIsSignatureOpen(false);
            setCurrentSignatureField(null);
        }
    };

    // Old submitForm logic was removed (lines 280-288). Code cleaned up.

    const renderField = (field: MobileFormElement) => {
        const commonStyle = "bg-white border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-blue-500";

        switch (field.type) {
            case 'header':
                return (
                    <View key={field.id} className="mb-4 mt-2">
                        <Text className="text-lg font-bold text-slate-900">{field.label}</Text>
                    </View>
                );
            case 'paragraph':
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-600">{field.text}</Text>
                    </View>
                );
            case 'separator':
                return <View key={field.id} className="h-px bg-slate-200 my-4" />;
            case 'spacer':
                return <View key={field.id} style={{ height: field.height || 20 }} />;
            case 'text':
            case 'email':
            case 'phone':
            case 'number':
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <TextInput
                            className={commonStyle}
                            placeholder={field.placeholder || `Enter ${field.label}`}
                            value={formData[field.id]}
                            onChangeText={(text) => updateField(field.id, text)}
                            keyboardType={field.type === 'number' ? 'numeric' : field.type === 'phone' ? 'phone-pad' : 'default'}
                        />
                    </View>
                );
            case 'date':
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <View className="flex-row">
                            <TextInput
                                className={`${commonStyle} flex-1`}
                                placeholder="YYYY-MM-DD"
                                value={formData[field.id]}
                                onChangeText={(text) => updateField(field.id, text)}
                            />
                            <TouchableOpacity
                                className="bg-blue-100 ml-2 rounded-xl justify-center px-4"
                                onPress={() => updateField(field.id, new Date().toISOString().split('T')[0])}
                            >
                                <Text className="text-blue-700 font-medium">Today</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'textarea':
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <TextInput
                            className={`${commonStyle} h-32`}
                            placeholder={field.placeholder || `Enter ${field.label}`}
                            value={formData[field.id]}
                            onChangeText={(text) => updateField(field.id, text)}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                );
            case 'checkbox':
                return (
                    <View key={field.id} className="mb-4 flex-row items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                        <Text className="text-slate-700 font-medium">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <TouchableOpacity
                            onPress={() => updateField(field.id, !formData[field.id])}
                            className={`w-6 h-6 rounded border ${formData[field.id] ? 'bg-blue-600 border-blue-600' : 'border-slate-300'} items-center justify-center`}
                        >
                            {formData[field.id] && <Ionicons name="checkmark" size={16} color="white" />}
                        </TouchableOpacity>
                    </View>
                );
            case 'select':
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <TouchableOpacity
                            className={commonStyle}
                            onPress={() => {
                                setCurrentSelectField(field);
                                setIsSelectOpen(true);
                            }}
                        >
                            <Text className={formData[field.id] ? "text-slate-800" : "text-slate-400"}>
                                {formData[field.id] || field.placeholder || "Select an option"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'location':
                const location = formData[field.id];
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {location ? (
                                <View className="p-4">
                                    <Text className="font-semibold text-slate-800">Location Captured</Text>
                                    <Text className="text-slate-500 text-xs mt-1">Lat: {location.lat?.toFixed(6)}, Lng: {location.lng?.toFixed(6)}</Text>
                                    <Text className="text-slate-400 text-[10px] mt-1">Accuracy: {location.accuracy?.toFixed(1)}m</Text>
                                </View>
                            ) : (
                                <View className="p-8 items-center justify-center">
                                    <Ionicons name="location-outline" size={32} color="#94a3b8" />
                                    <Text className="text-slate-400 mt-2 text-sm">No location captured</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                onPress={() => getCurrentLocation(field.id)}
                                className="bg-slate-50 border-t border-slate-100 p-3 flex-row items-center justify-center"
                            >
                                <Ionicons name="locate" size={18} color="#2563eb" className="mr-2" />
                                <Text className="text-blue-600 font-medium">Update Location</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'image':
                const imageUri = formData[field.id];
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <TouchableOpacity
                            onPress={() => pickImage(field.id)}
                            className="bg-white border border-dashed border-slate-300 rounded-xl p-4 items-center justify-center min-h-[150px]"
                        >
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} className="w-full h-40 rounded-lg" contentFit="contain" />
                            ) : (
                                <>
                                    <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center mb-2">
                                        <Ionicons name="camera-outline" size={24} color="#2563eb" />
                                    </View>
                                    <Text className="text-slate-600 font-medium">Tap to Upload Image</Text>
                                    <Text className="text-slate-400 text-xs mt-1">Supports JPG, PNG</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {imageUri && (
                            <TouchableOpacity
                                onPress={() => updateField(field.id, null)}
                                className="mt-2 self-end"
                            >
                                <Text className="text-red-500 text-sm">Remove Image</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            case 'signature':
                const signatureUri = formData[field.id];
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <TouchableOpacity
                            onPress={() => openSignaturePad(field.id)}
                            className="bg-white border border-slate-300 rounded-xl p-2 items-center justify-center min-h-[150px]"
                        >
                            {signatureUri ? (
                                <Image source={{ uri: signatureUri }} className="w-full h-40" contentFit="contain" />
                            ) : (
                                <View className="items-center">
                                    <Ionicons name="pencil" size={24} color="#94a3b8" />
                                    <Text className="text-slate-400 mt-2">Tap to Sign</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {signatureUri && (
                            <TouchableOpacity
                                onPress={() => updateField(field.id, null)}
                                className="mt-2 self-end"
                            >
                                <Text className="text-red-500 text-sm">Clear Signature</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            case 'barcode':
                return (
                    <View key={field.id} className="mb-4">
                        <Text className="text-slate-700 font-medium mb-2">{field.label} {field.required && <Text className="text-red-500">*</Text>}</Text>
                        <View className="flex-row">
                            <TextInput
                                className={`${commonStyle} flex-1`}
                                placeholder="Scan or enter barcode"
                                value={formData[field.id]}
                                onChangeText={(text) => updateField(field.id, text)}
                            />
                            <TouchableOpacity
                                className="ml-2 bg-slate-100 rounded-xl w-14 items-center justify-center"
                                onPress={() => openScanner(field.id)}
                            >
                                <Ionicons name="qr-code-outline" size={24} color="#334155" />
                            </TouchableOpacity>
                        </View>
                        {formData[field.id] ? (
                            <Text className="text-xs text-green-600 mt-1 ml-1">✓ Value captured</Text>
                        ) : null}
                    </View>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: Array.isArray(formName) ? formName[0] : formName || 'Form Entry',
                    headerStyle: { backgroundColor: org?.brand_color || '#1e40af' },
                    headerTintColor: '#fff',
                }}
            />
            <StatusBar style="light" />

            <ScrollView className="flex-1 p-6">
                <View className="bg-white rounded-2xl p-6 shadow-sm mb-8">
                    {formFields.length === 0 ? (
                        <Text className="text-slate-500 text-center py-8">No fields defined for this form.</Text>
                    ) : (
                        formFields.map(field => renderField(field))
                    )}
                </View>
            </ScrollView>



            <View className="p-6 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-3 bg-slate-50 border-t border-slate-200">
                <TouchableOpacity
                    className={`rounded-xl h-14 items-center justify-center shadow-lg shadow-blue-200 ${submitting ? 'opacity-70' : ''}`}
                    style={{ backgroundColor: org?.brand_color || '#2563eb' }}
                    onPress={() => submitForm(false)}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Submit & Close</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className={`bg-white border-2 rounded-xl h-14 items-center justify-center ${submitting ? 'opacity-70' : ''}`}
                    style={{ borderColor: org?.brand_color || '#2563eb' }}
                    onPress={() => submitForm(true)}
                    disabled={submitting}
                >
                    <Text className="font-bold text-lg" style={{ color: org?.brand_color || '#2563eb' }}>Submit & Add Another</Text>
                </TouchableOpacity>
            </View>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            {/* Barcode Scanner Modal */}
            <Modal
                visible={isScannerOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsScannerOpen(false)}
            >
                <View className="flex-1 flex-col bg-black">
                    {/* Top Half: Camera View (50%) */}
                    <View className="h-[50%] w-full relative overflow-hidden bg-black">
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            onBarcodeScanned={isScannerOpen ? handleBarCodeScanned : undefined}
                        />

                        {/* Trigger Button Overlay */}
                        <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none" style={{ zIndex: 100 }}>
                            {/* Target Box */}
                            <View className={`w-64 h-40 border-2 rounded-lg mb-8 ${isScanTriggered ? 'border-green-400 bg-green-400/20' : 'border-white/50 bg-transparent'}`} />

                            {/* Scan Button */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setIsScanTriggered(true)}
                                className={`px-8 py-4 rounded-full ${isScanTriggered ? 'bg-green-500' : 'bg-white'} shadow-lg`}
                            >
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="scan-outline" size={24} color={isScanTriggered ? 'white' : 'black'} />
                                    <Text className={`font-bold text-lg ${isScanTriggered ? 'text-white' : 'text-black'}`}>
                                        {isScanTriggered ? 'SCANNING...' : 'TAP TO SCAN'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Close Button */}
                        <View className="absolute top-6 right-6 z-10">
                            <TouchableOpacity onPress={() => setIsScannerOpen(false)} className="bg-black/60 p-2 rounded-full">
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Bottom Half: Scanned List (50%) */}
                    <View className="h-[50%] bg-white w-full flex-col">
                        <View className="p-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
                            <View>
                                <Text className="text-lg font-bold text-slate-800">Scanned Items</Text>
                                <Text className="text-slate-500 text-xs text-slate-500">List populated below.</Text>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <View className="bg-blue-100 px-3 py-1 rounded-full">
                                    <Text className="text-blue-700 font-bold text-sm">Total: {scannedItems.reduce((acc, i) => acc + i.qty, 0)}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={confirmScan}
                                    className="bg-green-600 px-5 py-2 rounded-lg"
                                >
                                    <Text className="text-white font-bold">DONE</Text>
                                </TouchableOpacity>
                            </View>

                            {scannedItems.length === 0 ? (
                                <View className="flex-1 items-center justify-center">
                                    <Text className="text-slate-400">Scan a barcode to start list...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={scannedItems}
                                    keyExtractor={item => item.code}
                                    renderItem={({ item }) => (
                                        <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
                                            <View className="flex-1 pr-4">
                                                <Text className="font-semibold text-slate-800 text-base">{item.code}</Text>
                                                <Text className="text-xs text-slate-500">Scanned: {item.qty} time{item.qty !== 1 ? 's' : ''}</Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <View className="bg-blue-100 px-3 py-1 rounded-full mr-3">
                                                    <Text className="font-bold text-blue-700">{item.qty}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => updateQty(item.code, -1000)} // Hack to delete
                                                    className="p-2 bg-slate-100 rounded-full"
                                                >
                                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Signature Modal */}
            <Modal
                visible={isSignatureOpen}
                animationType="slide"
                onRequestClose={() => setIsSignatureOpen(false)}
            >
                <View className="flex-1 bg-slate-900 justify-center p-4">
                    <View className="bg-white rounded-2xl h-[400px]">
                        <SignaturePad
                            onOK={handleSignature}
                            onEmpty={() => Alert.alert('Empty', 'Please sign before saving')}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => setIsSignatureOpen(false)}
                        className="mt-6 bg-slate-800 p-4 rounded-xl items-center"
                    >
                        <Text className="text-white font-semibold">Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Select Options Modal */}
            <Modal
                visible={isSelectOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsSelectOpen(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <View className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl max-h-[80%]">
                        <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-2">
                            <Text className="text-lg font-bold text-slate-800">{currentSelectField?.label || "Select Option"}</Text>
                            <TouchableOpacity onPress={() => setIsSelectOpen(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={currentSelectField?.options || []}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className={`p-3 rounded-lg mb-2 ${formData[currentSelectField?.id] === item ? 'bg-blue-50' : 'bg-slate-50'}`}
                                    onPress={() => {
                                        updateField(currentSelectField.id, item);
                                        setIsSelectOpen(false);
                                    }}
                                >
                                    <Text className={`${formData[currentSelectField?.id] === item ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text className="text-slate-500 text-center py-4">No options available</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
