import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useAuth } from '../../../context/AuthContext';
// import { verifyOtp } from '../authService'; // We will mock this

interface OtpFormProps {
    contactNumber: string;
    onVerify: () => void;
}

export default function OtpForm({ contactNumber, onVerify }: OtpFormProps) {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(29);
    const theme = useTheme();
    const { setAuth } = useAuth();
    
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => setTimer(t => t - 1), 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const handleVerify = async () => {
        if (otp.length < 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }
        setError('');
        setLoading(true);

        try {
            // Mock API verification
            await setAuth('patient', { name: "Mock User" }, "mock-access-token", "mock-refresh");
            onVerify();
        } catch (err) {
            setError('Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = () => {
        if (timer > 0) return;
        setTimer(180);
        setOtp('');
        setError('');
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>OTP Verification</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                Enter the OTP received on +91 {contactNumber}
            </Text>

            <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => inputRef.current?.focus()}
                style={styles.otpContainer}
            >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otp[index] || '';
                    return (
                        <View key={index} style={[
                            styles.otpBox, 
                            { borderColor: error ? theme.colors.error : (digit ? theme.colors.primary : '#ccc') }
                        ]}>
                            <Text style={styles.otpText}>{digit}</Text>
                        </View>
                    );
                })}
            </TouchableOpacity>

            <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.hiddenInput}
                autoFocus
            />

            {error ? <Text style={{ color: theme.colors.error, marginBottom: 8, fontSize: 12 }}>{error}</Text> : null}

            <View style={styles.resendContainer}>
                <Text>Didn't receive the OTP? </Text>
                <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
                    <Text style={{ color: timer > 0 ? '#999' : theme.colors.primary, fontWeight: 'bold' }}>Resend</Text>
                </TouchableOpacity>
                {timer > 0 && <Text style={{ color: theme.colors.primary, marginLeft: 'auto' }}>
                    00:{timer < 10 ? `0${timer}` : timer}
                </Text>}
            </View>

            <Button 
                mode="contained" 
                onPress={handleVerify} 
                style={styles.button}
                disabled={loading}
            >
                {loading ? "Verifying..." : "Verify"}
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: '#666',
        marginBottom: 24,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    otpBox: {
        width: 45,
        height: 50,
        borderWidth: 1.5,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    button: {
        paddingVertical: 6,
    }
});
