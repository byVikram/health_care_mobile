import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // ✅ CHANGED
import DoctorSearchCard from './components/DoctorSearchCard';
import { AppTypography, AppInput, AppSkeleton } from '../../../components/common';
import { getDoctors, getSpecialities } from '../doctorService';
import { DoctorSearchItem } from '../../../types/doctor-search';

// ✅ ICON MAP
const SPECIALITY_ICON_MAP: Record<string, string> = {
    all: 'format-list-bulleted',
    dentistry: 'tooth-outline',
    cardiology: 'heart-multiple-outline',
    orthopedic: 'bone',
    neurology: 'brain',
    kidney: 'kidney',
};

type Speciality = {
    id: string;
    label: string;
    icon: string;
};

type SpecialityChipProps = {
    spec: Speciality;
    selected: boolean;
    onPress: () => void;
};

function SpecialityChip({ spec, selected, onPress }: SpecialityChipProps) {
    const theme = useTheme();

    return (
        <TouchableOpacity
            style={styles.chipWrapper}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View style={[
                styles.chipIconBox,
                selected
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: '#e8eef2' }
            ]}>
                <MaterialCommunityIcons
                    name={spec.icon}
                    size={28}
                    color={selected ? '#ffffff' : theme.colors.primary}
                />
            </View>

            <AppTypography
                variant="caption"
                style={[
                    styles.chipLabel,
                    { color: selected ? theme.colors.primary : '#888' }
                ]}
            >
                {spec.label}
            </AppTypography>
        </TouchableOpacity>
    );
}

export default function DoctorSearchPage() {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSpec, setActiveSpec] = useState('all');

    const [doctors, setDoctors] = useState<DoctorSearchItem[]>([]);
    const [specialities, setSpecialities] = useState<Speciality[]>([
        { id: 'all', label: 'All', icon: 'format-list-bulleted' }
    ]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSpecialities = async () => {
        try {
            const res = await getSpecialities();
            if (res.success && res.data) {
                const specMap: Speciality[] = res.data.map(s => {
                    const label = s.label.toLowerCase().trim();

                    let icon =
                        SPECIALITY_ICON_MAP[label] ??
                        (label.includes('dent') ? 'tooth-outline' : 'medical-bag');

                    return {
                        id: s.id,
                        label: s.label,
                        icon,
                    };
                });

                setSpecialities([
                    { id: 'all', label: 'All', icon: 'format-list-bulleted' },
                    ...specMap
                ]);
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
                limit: 50,
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
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeSpec]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDoctorsList(true);
    }, [searchQuery, activeSpec]);

    return (
        <View style={styles.container}>

            {/* Header */}
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

            {/* Specialities */}
            <View style={styles.filterSection}>
                <AppTypography variant="subtitle1" style={styles.filterTitle}>
                    Search by Specialities
                </AppTypography>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {specialities.map(spec => (
                        <SpecialityChip
                            key={spec.id}
                            spec={spec}
                            selected={activeSpec === spec.id}
                            onPress={() => setActiveSpec(spec.id)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Results */}
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
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: { padding: 16, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    searchInput: { backgroundColor: '#fff', height: 50 },
    filterSection: { paddingTop: 20, paddingBottom: 8 },
    filterTitle: { paddingHorizontal: 16, marginBottom: 14, fontSize: 15, fontWeight: '600' },
    filterScroll: { paddingHorizontal: 16, gap: 14 },
    chipWrapper: { alignItems: 'center', gap: 8, width: 72 },
    chipIconBox: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    chipLabel: { fontSize: 11, textAlign: 'center' },
    resultsHeader: { paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
});