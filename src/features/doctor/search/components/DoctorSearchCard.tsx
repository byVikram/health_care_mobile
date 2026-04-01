import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface DoctorProps {
    doctor: {
        id: string;
        fullName: string;
        speciality: string;
        experience: string;
        rating: number;
        consultationFee: number;
    }
}

export default function DoctorSearchCard({ doctor }: DoctorProps) {
    const theme = useTheme();
    const navigation = useNavigation<any>();

    return (
        <Card style={styles.card}>
            <Card.Content style={styles.content}>
                <View style={styles.avatarBox}>
                    <MaterialCommunityIcons name="doctor" size={40} color={theme.colors.primary} />
                </View>
                <View style={styles.details}>
                    <Text variant="titleMedium" style={styles.name}>{doctor.fullName}</Text>
                    <Text variant="bodySmall" style={styles.speciality}>{doctor.speciality}</Text>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="briefcase" size={14} color="#666" />
                        <Text variant="bodySmall" style={styles.infoText}>{doctor.experience} Exp</Text>
                        <MaterialCommunityIcons name="star" size={14} color="#f57c00" style={{ marginLeft: 8 }} />
                        <Text variant="bodySmall" style={styles.infoText}>{doctor.rating}</Text>
                    </View>
                </View>
            </Card.Content>
            <Card.Actions style={styles.actions}>
                <View>
                    <Text variant="labelSmall" style={{ color: '#666' }}>Consultation Fee</Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        ₹{doctor.consultationFee}
                    </Text>
                </View>
                <Button mode="contained" onPress={() => navigation.navigate('DoctorDetail', { id: doctor.id })}>
                    Book Now
                </Button>
            </Card.Actions>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    content: {
        flexDirection: 'row',
        paddingBottom: 16,
    },
    avatarBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f4f8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    details: {
        flex: 1,
    },
    name: {
        fontWeight: 'bold',
    },
    speciality: {
        color: '#666',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        color: '#666',
        marginLeft: 4,
    },
    actions: {
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
    }
});
