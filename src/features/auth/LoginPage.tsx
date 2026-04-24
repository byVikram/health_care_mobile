import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { AppButton, AppInput, AppTypography } from '../../components/common';
import OtpForm from './components/OtpForm';
import { sendOtp } from './authService';

// ✅ Import SVG
import OnboardingImage from '../../assets/Onboarding/onboarding-4.svg';

export default function LoginPage({ navigation }: any) {
    const [step, setStep] = useState<'login' | 'otp'>('login');
    const [contactNumber, setContactNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            <View style={styles.innerContainer}>

                {step === 'login' ? (
                    <View style={styles.content}>

                        {/* 🔹 SVG Image */}
                        <OnboardingImage width={220} height={220} style={styles.image} />

                        {/* 🔹 Title */}
                        <AppTypography variant="h2" align="center" style={styles.title}>
                            Login
                        </AppTypography>

                        <AppTypography variant="subtitle" align="center" style={styles.subtitle}>
                            Welcome back to HealthCare
                        </AppTypography>

                        {/* 🔹 Input */}
                        <AppInput
                            label="Contact Number"
                            value={contactNumber}
                            onChangeText={setContactNumber}
                            keyboardType="phone-pad"
                            style={styles.input}
                            errorText={error}
                        />

                        {/* 🔹 Button */}
                        <AppButton
                            variant="primary"
                            onPress={handleContinue}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                        >
                            {loading ? 'Sending OTP...' : 'Continue'}
                        </AppButton>

                        {/* 🔹 Register Link */}
                        <AppButton
                            variant="text"
                           onPress={() => navigation.navigate('RoleSelection')}
                            style={styles.link}
                        >
                            Don't have an account? Register
                        </AppButton>

                    </View>
                ) : (
                    <OtpForm 
                        contactNumber={contactNumber} 
                        onVerify={() => {
                            // handled by AuthContext
                        }}
                        onBack={() => setStep('login')}
                        backLabel="Back to Login"
                    />
                )}

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    image: {
        marginBottom: 20,
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        marginBottom: 24,
    },
    input: {
        marginBottom: 16,
        width: '100%',
    },
    button: {
        marginTop: 8,
        paddingVertical: 6,
        width: '100%',
    },
    link: {
        marginTop: 16,
    }
});