import React, { useMemo, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppTypography } from '../../components/common';
import { DOCTORS } from '../../constants/mockdata';
import MyDoctorCard from './components/MyDoctorCard';

export default function MyDoctorPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [savedDoctorIds, setSavedDoctorIds] = useState(
        () => new Set(DOCTORS.map((doctor) => doctor.id))
    );

    const filteredDoctors = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery) return DOCTORS;

        return DOCTORS.filter((doctor) => {
            const haystack = `${doctor.name} ${doctor.speciality}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [searchQuery]);

    const handleToggleSaved = (doctorId: string) => {
        setSavedDoctorIds((current) => {
            const next = new Set(current);
            if (next.has(doctorId)) {
                next.delete(doctorId);
            } else {
                next.add(doctorId);
            }

            return next;
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={22} color="#7d8b94" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search and add doctor"
                        placeholderTextColor="#8b9aa2"
                        style={styles.searchInput}
                    />
                    <TouchableOpacity style={styles.micButton} activeOpacity={0.75}>
                        <MaterialCommunityIcons name="microphone-outline" size={22} color="#245f67" />
                    </TouchableOpacity>
                </View>

                <View style={styles.savedHeader}>
                    <AppTypography variant="caption" style={styles.savedTitle}>
                        SAVED
                    </AppTypography>
                    <View style={styles.savedBadge}>
                        <AppTypography variant="caption" style={styles.savedBadgeText}>
                            {savedDoctorIds.size}
                        </AppTypography>
                    </View>
                </View>
            </View>

            <FlatList
                data={filteredDoctors}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MyDoctorCard
                        {...item}
                        saved={savedDoctorIds.has(item.id)}
                        onToggleSaved={() => handleToggleSaved(item.id)}
                    />
                )}
                ItemSeparatorComponent={() => <View style={styles.cardGap} />}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f9fa',
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: '#f5f9fa',
    },
    searchBar: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d9e6eb',
        backgroundColor: '#ffffff',
        paddingLeft: 14,
        paddingRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#12343b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        minHeight: 48,
        paddingHorizontal: 10,
        color: '#22343d',
        fontSize: 14,
    },
    micButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    savedTitle: {
        color: '#4e6670',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0,
    },
    savedBadge: {
        minWidth: 24,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 7,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dcecee',
        marginLeft: 8,
    },
    savedBadgeText: {
        color: '#245f67',
        fontSize: 12,
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 24,
    },
    cardGap: {
        height: 14,
    },
});
