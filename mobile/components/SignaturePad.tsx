import React, { useRef } from 'react';
import { View, StyleSheet, Button, TouchableOpacity, Text } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

interface SignaturePadProps {
    onOK: (signature: string) => void;
    onEmpty?: () => void;
    descriptionText?: string;
    clearText?: string;
    confirmText?: string;
    webStyle?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
    onOK,
    onEmpty,
    descriptionText = 'Sign above',
    clearText = 'Clear',
    confirmText = 'Confirm',
    webStyle = `.m-signature-pad--footer {display: none; margin: 0px;} body,html {width: 100%; height: 100%;}`
}) => {
    const ref = useRef<SignatureViewRef>(null);

    const handleSignature = (signature: string) => {
        onOK(signature);
    };

    const handleEmpty = () => {
        if (onEmpty) onEmpty();
    };

    const handleClear = () => {
        ref.current?.clearSignature();
    };

    const handleConfirm = () => {
        ref.current?.readSignature();
    };

    return (
        <View style={styles.container}>
            <View style={styles.signatureContainer}>
                <SignatureScreen
                    ref={ref}
                    onOK={handleSignature}
                    onEmpty={handleEmpty}
                    descriptionText={descriptionText}
                    clearText={clearText}
                    confirmText={confirmText}
                    webStyle={webStyle}
                />
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleClear} style={[styles.button, styles.clearButton]}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={[styles.button, styles.confirmButton]}>
                    <Text style={styles.confirmButtonText}>Save Signature</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: 300,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    signatureContainer: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    clearButton: {
        backgroundColor: '#f1f5f9',
    },
    confirmButton: {
        backgroundColor: '#2563eb',
    },
    clearButtonText: {
        color: '#64748b',
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
