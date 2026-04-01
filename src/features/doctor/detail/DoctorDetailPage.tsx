import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function DoctorDetailPage() {
    const theme = useTheme();
    const navigation = useNavigation();

    return (
        <ScrollView style={styles.container}>
            {/* Header / Profile Info */}
            <View style={styles.header}>
                <Button 
                    mode="text" 
                    icon="arrow-left" 
                    onPress={() => navigation.goBack()}
                    style={{ alignSelf: 'flex-start', marginLeft: -8, marginBottom: 8 }}
                    textColor="#fff"
                >
                    Back
                </Button>
                <View style={styles.profileRow}>
                    <View style={styles.avatarBox}>
                        <MaterialCommunityIcons name="doctor" size={48} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>Dr. Arjun Sharma</Text>
                        <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>Cardiologist</Text>
                        <View style={{ flexDirection: 'row', marginTop: 8 }}>
                            <View style={styles.badge}><Text style={styles.badgeText}>15 yrs Exp</Text></View>
                            <View style={[styles.badge, { backgroundColor: '#f57c00' }]}><Text style={styles.badgeText}>★ 4.8</Text></View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Details Cards */}
            <View style={styles.content}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.cardTitle}>About Doctor</Text>
                        <Text variant="bodySmall" style={{ color: '#666', lineHeight: 20 }}>
                            Dr. Arjun Sharma is a leading Cardiologist with extensive experience in diagnosing and treating cardiovascular diseases. He specializes in preventative cardiology.
                        </Text>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.cardTitle}>Hospital Base</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="hospital-building" size={24} color={theme.colors.primary} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={{ fontWeight: 'bold' }}>City Heart Hospital</Text>
                                <Text variant="bodySmall" style={{ color: '#666' }}>Koramangala, Bengaluru</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Booking Section */}
                <Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.cardTitle}>Book Appointment</Text>
                        <View style={styles.slotRow}>
                            <Button mode="outlined" style={styles.slotBtn}>Tomorrow</Button>
                            <Button mode="outlined" style={styles.slotBtn}>Day After</Button>
                        </View>
                        <Text variant="labelMedium" style={{ marginTop: 16, marginBottom: 8 }}>Available Slots</Text>
                        <View style={styles.timeSlots}>
                            <Button mode="contained-tonal" style={styles.timeBtn}>10:00 AM</Button>
                            <Button mode="contained-tonal" style={styles.timeBtn}>02:00 PM</Button>
                            <Button mode="contained-tonal" style={styles.timeBtn}>05:00 PM</Button>
                        </View>
                    </Card.Content>
                    <Card.Actions style={styles.actionsBox}>
                        <View>
                            <Text variant="labelSmall">Fee</Text>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>₹1500</Text>
                        </View>
                        <Button mode="contained" onPress={() => alert('Booked successfully!')}>
                            Confirm Booking
                        </Button>
                    </Card.Actions>
                </Card>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        backgroundColor: '#0c7c7c',
        padding: 24,
        paddingTop: 60,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
        marginTop: -12,
    },
    card: {
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    cardTitle: {
        fontWeight: 'bold',
        marginBottom: 12,
    },
    slotRow: {
        flexDirection: 'row',
        gap: 8,
    },
    slotBtn: {
        flex: 1,
    },
    timeSlots: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeBtn: {
        borderRadius: 20,
    },
    actionsBox: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    }
});
