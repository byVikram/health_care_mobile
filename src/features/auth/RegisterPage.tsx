import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppButton, AppInput, AppTypography } from '../../components/common';
import { createUser } from './authService';

export default function RegisterPage({ navigation }: any) {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const theme = useTheme();

    const handleRegister = async () => {
        if (!name || !contact || !email) {
            setError('Please fill all fields');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await createUser({
                name,
                contact_number: contact,
                email,
                role_id: 'patient' // default role id for signup
            });
            if (res.success !== false) {
                navigation.navigate('Login');
            } else {
                setError(res.message || 'Failed to register');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppTypography variant="h2" align="center" style={styles.title}>Register</AppTypography>
            
            <AppInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />

            <AppInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                errorText={error}
            />

            <AppInput
                label="Contact Number"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                style={styles.input}
                errorText={error}
            />

            <AppButton variant="primary" onPress={handleRegister} loading={loading} disabled={loading} style={styles.button}>
                {loading ? 'Signing Up...' : 'Sign Up'}
            </AppButton>
            
            <AppButton variant="text" onPress={() => navigation.navigate('Login')} style={styles.link}>
                Already have an account? Login
            </AppButton>
        </View>
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
        marginBottom: 32,
    },
    input: {
        // marginBottom removed since input handles it internally or we adjust spacing
    },
    button: {
        marginTop: 8,
        paddingVertical: 6,
    },
    link: {
        marginTop: 16
    }
});
