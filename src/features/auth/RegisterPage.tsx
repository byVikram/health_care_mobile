import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';

export default function RegisterPage({ navigation }: any) {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>Register</Text>
            
            <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
            />

            <TextInput
                label="Contact Number"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                mode="outlined"
                style={styles.input}
            />

            <Button mode="contained" onPress={() => navigation.navigate('Login')} style={styles.button}>
                Sign Up
            </Button>
            
            <Button mode="text" onPress={() => navigation.navigate('Login')} style={styles.link}>
                Already have an account? Login
            </Button>
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
        fontWeight: 'bold',
        marginBottom: 32,
        textAlign: 'center'
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
