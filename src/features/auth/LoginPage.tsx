import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import OtpForm from './components/OtpForm';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ navigation }: any) {
    const [step, setStep] = useState<'login' | 'otp'>('login');
    const [contactNumber, setContactNumber] = useState('');
    const theme = useTheme();

    const handleContinue = () => {
        if (contactNumber.length > 0) {
            setStep('otp');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {step === 'login' ? (
                <View style={{ width: '100%' }}>
                    <Text variant="headlineMedium" style={styles.title}>Login</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Welcome back to HealthCare</Text>

                    <TextInput
                        label="Contact Number"
                        value={contactNumber}
                        onChangeText={setContactNumber}
                        keyboardType="phone-pad"
                        mode="outlined"
                        style={styles.input}
                    />

                    <Button mode="contained" onPress={handleContinue} style={styles.button}>
                        Continue
                    </Button>
                    
                    <Button mode="text" onPress={() => navigation.navigate('Register')} style={styles.link}>
                        Don't have an account? Register
                    </Button>
                </View>
            ) : (
                <OtpForm 
                    contactNumber={contactNumber} 
                    onVerify={() => {
                        // The AuthContext will handle the Navigation switch to Dashboard automatically!
                    }}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff'
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center'
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        color: '#666'
    },
    input: {
        marginBottom: 16
    },
    button: {
        marginTop: 8,
        paddingVertical: 6,
    },
    link: {
        marginTop: 16
    }
});
