import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Button } from 'react-native-paper';
import { useAuth, UserRole } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ROUTES } from '../../navigation/routes';
import { navigate as navigateRoot } from '../../navigation/navigationService';

interface StatsProps {
    label: string;
    value: string;
}

const StatBox = ({ label, value }: StatsProps) => (
    <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text variant="titleMedium" style={styles.statValue}>{value}</Text>
    </View>
);

export default function PortalPage() {
    const { role, user } = useAuth();
    const theme = useTheme();

    const openAppointments = () => {
        if (role === 'doctor') {
            navigateRoot(ROUTES.STACK.APPOINTMENTS);
            return;
        }

        navigateRoot(ROUTES.STACK.CONSULTATION);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header Identity Card */}
            {role === 'doctor' ? (
                <View style={[styles.headerCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <View style={styles.headerTop}>
                        <View style={styles.avatarPlaceholder} />
                        <View style={styles.headerTextContainer}>
                            <Text variant="labelSmall" style={{ color: theme.colors.surface }}>Welcome</Text>
                            <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                                {user?.name || "Dr. Arjun Sharma"}
                            </Text>
                            <View style={styles.idBadge}>
                                <Text style={{ color: '#fff', fontSize: 10 }}>ID: 143265</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.statsRow}>
                        <StatBox label="Total Patients" value="20" />
                        <StatBox label="New Patients" value="06" />
                        <StatBox label="Follow up" value="03" />
                    </View>
                </View>
            ) : (
                <View style={[styles.headerCard, { backgroundColor: theme.colors.primaryContainer }]}>
                     <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: 'bold', marginBottom: 8 }}>
                        Patient Portal
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.surface }}>
                        Manage your appointments securely.
                    </Text>
                </View>
            )}

            {/* Appointments Section */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Upcoming Appointments</Text>
                    <MaterialCommunityIcons name="calendar-month" size={24} color={theme.colors.primary} />
                </View>

                {/* Mock Appointment Card */}
                <TouchableOpacity onPress={openAppointments} activeOpacity={0.8}>
                    <Card style={styles.appointmentCard}>
                        <Card.Content>
                            <Text variant="labelMedium" style={{ color: theme.colors.primary, marginBottom: 4 }}>
                                {role === 'doctor' ? 'Appointments' : 'Tomorrow, 10:30 AM'}
                            </Text>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                {role === 'doctor' ? 'All Appointments' : 'Dental Checkup'}
                            </Text>
                            <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>
                                {role === 'doctor'
                                    ? 'View patient bookings, modes, hospitals, and statuses.'
                                    : 'Dr. Simran Kaur - City Hospital'}
                            </Text>
                        </Card.Content>
                        <Card.Actions style={{ borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 12 }}>
                            {role !== 'doctor' && <Button mode="text" textColor="#d32f2f">Cancel</Button>}
                            <Button mode="contained" onPress={openAppointments}>
                                {role === 'doctor' ? 'View All' : 'Join Call'}
                            </Button>
                        </Card.Actions>
                    </Card>
                </TouchableOpacity>

                {/* Mock Empty State for others */}
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="calendar-blank" size={48} color="#ccc" />
                    <Text variant="bodyMedium" style={{ color: '#666', marginTop: 8 }}>No other appointments scheduled.</Text>
                </View>

            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    headerCard: {
        margin: 16,
        marginTop: 60,
        borderRadius: 16,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTop: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    idBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statBox: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 8,
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    statValue: {
        color: '#0c7c7c',
        fontWeight: 'bold',
    },
    section: {
        padding: 16,
    },
    appointmentCard: {
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    }
});
