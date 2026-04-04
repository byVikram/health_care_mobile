import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DoctorSearchCard from './components/DoctorSearchCard';
import { AppTypography, AppInput, AppSkeleton } from '../../../components/common';
import { getDoctors, getSpecialities } from '../doctorService';
import { DoctorSearchItem } from '../../../types/doctor-search';

export default function DoctorSearchPage() {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSpec, setActiveSpec] = useState('all');
    
    const [doctors, setDoctors] = useState<DoctorSearchItem[]>([]);
    const [specialities, setSpecialities] = useState<{ id: string; label: string; icon?: string }[]>([
        { id: 'all', label: 'All', icon: 'format-list-bulleted' }
    ]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSpecialities = async () => {
        try {
            const res = await getSpecialities();
            if (res.success && res.data) {
                const specMap = res.data.map(s => ({ id: s.id, label: s.label, icon: 'medical-bag' }));
                setSpecialities([{ id: 'all', label: 'All', icon: 'format-list-bulleted' }, ...specMap]);
            }
        } catch (error) {
            console.error('Error fetching specialities:', error);
        }
    };

    const fetchDoctorsList = async (isRefetch = false) => {
        if (!isRefetch) setLoading(true);
        try {
            const res = await getDoctors({
                search: searchQuery,
                speciality_id: activeSpec === 'all' ? undefined : activeSpec,
                limit: 50
            });
            if (res.success && res.data) {
                setDoctors(res.data);
            }
        } catch (error) {
            console.error('Error fetching doctors:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSpecialities();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDoctorsList();
        }, 500); // debounce search
        
        return () => clearTimeout(timer);
    }, [searchQuery, activeSpec]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDoctorsList(true);
    }, [searchQuery, activeSpec]);

    return (
        <View style={styles.container}>
            {/* Header / Search */}
            <View style={[styles.header, { backgroundColor: theme.colors.primaryContainer }]}>
                <AppTypography variant="h3" style={{ color: theme.colors.onPrimary, marginBottom: 16 }}>
                    Find Doctors
                </AppTypography>
                <AppInput
                    placeholder="Search by name, specialist..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                />
            </View>

            {/* Speciality Filters */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {specialities.map(spec => (
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
                <AppTypography variant="h4">
                    {loading ? 'Finding Doctors...' : `${doctors.length} Doctors Found`}
                </AppTypography>
            </View>

            {/* List */}
            {loading && !refreshing ? (
                <View style={{ paddingHorizontal: 16 }}>
                    <AppSkeleton height={140} style={{ marginBottom: 16 }} />
                    <AppSkeleton height={140} style={{ marginBottom: 16 }} />
                    <AppSkeleton height={140} style={{ marginBottom: 16 }} />
                </View>
            ) : (
                <FlatList
                    data={doctors}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ paddingHorizontal: 8, justifyContent: 'space-between' }}
                    renderItem={({ item }) => <DoctorSearchCard doctor={item} />}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 40 }}>
                            <AppTypography>No doctors found matching criteria.</AppTypography>
                        </View>
                    }
                />
            )}
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
