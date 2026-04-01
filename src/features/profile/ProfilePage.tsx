import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
    const { clearAuth, user } = useAuth();
    
    return (
        <View style={styles.container}>
            <Text variant="headlineMedium">Profile</Text>
            <Text variant="bodyMedium" style={{ marginBottom: 20 }}>{user?.name}</Text>
            <Button mode="contained" onPress={clearAuth}>Logout</Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    }
});
