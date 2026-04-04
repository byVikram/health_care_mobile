import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppButton, AppInput, AppTypography } from '../../components/common';
import OtpForm from './components/OtpForm';
import { useAuth } from '../../context/AuthContext';
import { sendOtp } from './authService';

export default function LoginPage({ navigation }: any) {
    const [step, setStep] = useState<'login' | 'otp'>('login');
    const [contactNumber, setContactNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const theme = useTheme();

    const handleContinue = async () => {
        if (contactNumber.length > 0) {
            setLoading(true);
            setError('');
            try {
                const res = await sendOtp(contactNumber);
                if (res.success !== false) {
                    setStep('otp');
                } else {
                    setError(res.message || 'Failed to send OTP');
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to send OTP');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {step === 'login' ? (
                <View style={{ width: '100%' }}>
                    <AppTypography variant="h2" align="center" style={styles.title}>Login</AppTypography>
                    <AppTypography variant="subtitle" align="center" style={styles.subtitle}>Welcome back to HealthCare</AppTypography>

                    <AppInput
                        label="Contact Number"
                        value={contactNumber}
                        onChangeText={setContactNumber}
                        keyboardType="phone-pad"
                        style={styles.input}
                        errorText={error}
                    />

                    <AppButton variant="primary" onPress={handleContinue} loading={loading} disabled={loading} style={styles.button}>
                        {loading ? 'Sending OTP...' : 'Continue'}
                    </AppButton>
                    
                    <AppButton variant="text" onPress={() => navigation.navigate('Register')} style={styles.link}>
                        Don't have an account? Register
                    </AppButton>
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
        marginBottom: 8,
    },
    subtitle: {
        marginBottom: 32,
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
