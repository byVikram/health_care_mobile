import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, TextInput, useTheme, Chip } from 'react-native-paper';
import DoctorSearchCard from './components/DoctorSearchCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const mockDoctors = [
    { id: '1', fullName: 'Dr. Arjun Sharma', speciality: 'Cardiologist', experience: '15 Years', rating: 4.8, consultationFee: 1500 },
    { id: '2', fullName: 'Dr. Neha Gupta', speciality: 'Dermatologist', experience: '8 Years', rating: 4.5, consultationFee: 800 },
    { id: '3', fullName: 'Dr. Rajesh Kumar', speciality: 'Pediatrician', experience: '20 Years', rating: 4.9, consultationFee: 1200 },
    { id: '4', fullName: 'Dr. Priya Singh', speciality: 'Orthopedist', experience: '12 Years', rating: 4.6, consultationFee: 1000 },
    { id: '5', fullName: 'Dr. Suresh Reddy', speciality: 'Neurologist', experience: '18 Years', rating: 4.7, consultationFee: 2000 },
];

const mockSpecialities = [
    { id: 'all', label: 'All', icon: 'format-list-bulleted' },
    { id: 'cardio', label: 'Cardiology', icon: 'heart-pulse' },
    { id: 'derma', label: 'Dermatology', icon: 'face-man-shimmer' },
    { id: 'pedia', label: 'Pediatrics', icon: 'baby-carriage' },
    { id: 'ortho', label: 'Orthopedics', icon: 'bone' },
];

export default function DoctorSearchPage() {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSpec, setActiveSpec] = useState('all');

    return (
        <View style={styles.container}>
            {/* Header / Search */}
            <View style={[styles.header, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary, marginBottom: 16 }}>
                    Find Doctors
                </Text>
                <TextInput
                    mode="outlined"
                    placeholder="Search by name, specialist..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    left={<TextInput.Icon icon="magnify" />}
                    style={styles.searchInput}
                    outlineStyle={{ borderRadius: 12 }}
                />
            </View>

            {/* Speciality Filters */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {mockSpecialities.map(spec => (
                        <Chip
                            key={spec.id}
                            selected={activeSpec === spec.id}
                            onPress={() => setActiveSpec(spec.id)}
                            style={[styles.chip, activeSpec === spec.id && { backgroundColor: theme.colors.primary }]}
                            textStyle={[activeSpec === spec.id && { color: theme.colors.onPrimary }]}
                            icon={() => <MaterialCommunityIcons 
                                name={spec.icon as any} 
                                size={18} 
                                color={activeSpec === spec.id ? theme.colors.onPrimary : theme.colors.primary} 
                            />}
                        >
                            {spec.label}
                        </Chip>
                    ))}
                </ScrollView>
            </View>

            {/* Results Title */}
            <View style={styles.resultsHeader}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {mockDoctors.length} Doctors Found
                </Text>
            </View>

            {/* List */}
            <FlatList
                data={mockDoctors}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <DoctorSearchCard doctor={item} />}
                contentContainerStyle={{ paddingBottom: 24 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        padding: 16,
        paddingTop: 60,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    searchInput: {
        backgroundColor: '#fff',
        height: 50,
    },
    filterSection: {
        paddingVertical: 16,
    },
    filterScroll: {
        paddingHorizontal: 16,
    },
    chip: {
        marginRight: 8,
        borderRadius: 20,
    },
    resultsHeader: {
        paddingHorizontal: 16,
        marginBottom: 12,
    }
});
