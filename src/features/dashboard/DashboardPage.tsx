import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import SpecialitySection from './SpecialitySection';
import ConsultSection from './ConsultSection';
import CommunityBlogsSection from './CommunityBlogsSection';

export default function DashboardPage() {
    const { clearAuth, user } = useAuth();
    const theme = useTheme();

    return (
        <ScrollView style={styles.container}>
            <View style={[styles.header, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                    Welcome, {user?.name || "Guest"}
                </Text>
                <Button mode="text" onPress={clearAuth}>Logout</Button>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleLarge">Your One-Stop Healthcare Portal</Text>
                    <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                        Access comprehensive medical services, connect with specialists, and manage your health journey with ease and confidence.
                    </Text>
                </Card.Content>
            </Card>

            <SpecialitySection />
            <ConsultSection />
            <CommunityBlogsSection />

            {/* Emergency Placeholder */}
            <Card style={[styles.card, { backgroundColor: '#ffebee', marginTop: 16 }]}>
                <Card.Content>
                    <Text variant="titleMedium" style={{ color: theme.colors.error, fontWeight: 'bold' }}>Emergency Services</Text>
                    <Text variant="bodySmall" style={{ marginTop: 4 }}>Call an ambulance instantly.</Text>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        padding: 24,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 16
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        marginHorizontal: 16,
        marginBottom: 12,
        fontWeight: 'bold'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
    },
    gridItem: {
        width: '45%',
        margin: '2.5%',
        justifyContent: 'center',
        height: 100
    }
});
