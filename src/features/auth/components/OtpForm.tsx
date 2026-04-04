import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppButton, AppTypography } from '../../../components/common';
import { useAuth } from '../../../context/AuthContext';
import { verifyOtp, sendOtp } from '../authService';

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
    
    const inputRef = useRef<RNTextInput>(null);

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
            const response = await verifyOtp(contactNumber, otp);
            if (response.success && response.data) {
                await setAuth(
                    response.data.user.role, 
                    response.data.user, 
                    response.data.access_token, 
                    response.data.refresh_token
                );
                onVerify();
            } else {
                setError(response.message || 'Invalid OTP. Please try again.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        setTimer(180);
        setOtp('');
        setError('');
        try {
            await sendOtp(contactNumber);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP');
        }
    };

    return (
        <View style={styles.container}>
            <AppTypography variant="h2" style={styles.title}>OTP Verification</AppTypography>
            <AppTypography variant="subtitle" style={styles.subtitle}>
                Enter the OTP received on +91 {contactNumber}
            </AppTypography>

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
                            <AppTypography style={styles.otpText}>{digit}</AppTypography>
                        </View>
                    );
                })}
            </TouchableOpacity>

            <RNTextInput
                ref={inputRef}
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.hiddenInput}
                autoFocus
            />

            {error ? <AppTypography variant="caption" color={theme.colors.error} style={{ marginBottom: 8 }}>{error}</AppTypography> : null}

            <View style={styles.resendContainer}>
                <AppTypography>Didn't receive the OTP? </AppTypography>
                <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
                    <AppTypography color={timer > 0 ? '#999' : theme.colors.primary} style={{ fontWeight: 'bold' }}>Resend</AppTypography>
                </TouchableOpacity>
                {timer > 0 && <AppTypography color={theme.colors.primary} style={{ marginLeft: 'auto' }}>
                    00:{timer < 10 ? `0${timer}` : timer}
                </AppTypography>}
            </View>

            <AppButton 
                variant="primary" 
                onPress={handleVerify} 
                style={styles.button}
                disabled={loading}
                loading={loading}
            >
                {loading ? "Verifying..." : "Verify"}
            </AppButton>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
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
