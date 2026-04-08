// features/auth/components/OtpForm.tsx
import React, { useRef, useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'

interface Props {
    contactNumber: string
    onVerify: () => void
    onBack: () => void
}

const OTP_LENGTH = 6

export default function OtpForm({ contactNumber, onVerify, onBack }: Props) {
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const inputs = useRef<(TextInput | null)[]>([])

    const handleChange = (val: string, idx: number) => {
        const digit = val.replace(/\D/g, '').slice(-1)
        const next = [...otp]
        next[idx] = digit
        setOtp(next)
        setError('')
        // Auto-move to next box
        if (digit && idx < OTP_LENGTH - 1) {
            inputs.current[idx + 1]?.focus()
        }
    }

    const handleKeyPress = (e: any, idx: number) => {
        // Move back on backspace if current box is empty
        if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus()
        }
    }

    const handleVerify = async () => {
        const code = otp.join('')
        if (code.length < OTP_LENGTH) {
            setError('Please enter the complete 6-digit OTP')
            return
        }
        setLoading(true)
        try {
            // TODO: Replace with your real OTP verify API call:
            // await verifyOtp({ contact_number: contactNumber, otp: code })
            await new Promise((r) => setTimeout(r, 1000)) // simulated
            onVerify()
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invalid OTP. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setOtp(Array(OTP_LENGTH).fill(''))
        setError('')
        inputs.current[0]?.focus()
        // TODO: call your resend OTP API here
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.container}>
                <Text style={styles.title}>Verify OTP</Text>

                <Text style={styles.subtitle}>
                    Enter the 6-digit code sent to{'\n'}
                    <Text style={styles.phone}>+91 {contactNumber}</Text>
                </Text>

                {/* OTP Boxes */}
                <View style={styles.otpRow}>
                    {otp.map((digit, idx) => (
                        <TextInput
                            key={idx}
                            ref={(el) => { inputs.current[idx] = el }}
                            style={[
                                styles.otpBox,
                                digit ? styles.otpBoxFilled : null,
                                !!error ? styles.otpBoxError : null,
                            ]}
                            value={digit}
                            onChangeText={(val) => handleChange(val, idx)}
                            onKeyPress={(e) => handleKeyPress(e, idx)}
                            keyboardType="number-pad"
                            maxLength={1}
                            textAlign="center"
                            selectionColor={TEAL}
                        />
                    ))}
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Verify OTP</Text>
                    }
                </TouchableOpacity>

                {/* Resend */}
                <Text style={styles.resendText}>
                    Didn't receive a code?{' '}
                    <Text style={styles.tealUnderline} onPress={handleResend}>
                        Resend OTP
                    </Text>
                </Text>

                {/* Back */}
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backText}>← Back to Register</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}

const TEAL = '#0d9488'

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 28,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#111',
        marginBottom: 10,
    },
    subtitle: {
        color: '#666',
        fontSize: 15,
        marginBottom: 32,
        lineHeight: 24,
    },
    phone: {
        color: '#111',
        fontWeight: '600',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 16,
    },
    otpBox: {
        width: 46,
        height: 54,
        borderWidth: 1.5,
        borderColor: '#d1d5db',
        borderRadius: 8,
        fontSize: 22,
        fontWeight: '600',
        color: '#111',
        backgroundColor: '#f9fafb',
    },
    otpBoxFilled: {
        borderColor: TEAL,
        backgroundColor: '#f0fdfa',
    },
    otpBoxError: {
        borderColor: '#dc2626',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
    },
    button: {
        backgroundColor: TEAL,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    resendText: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
    },
    tealUnderline: {
        color: TEAL,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    backBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    backText: {
        color: '#666',
        fontSize: 14,
    },
})