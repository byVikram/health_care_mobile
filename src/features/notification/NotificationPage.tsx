import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppTypography } from '../../components/common';
import { NOTIFICATIONS } from '../../constants/mockdata';
import NotificationCard from './components/NotificationCard';

export default function NotificationPage({ navigation }: any) {
    const renderHeaderLabel = (index: number) => {
        if (index === 0) {
            return (
                <AppTypography variant="caption" style={styles.sectionLabel}>
                    Today, Oct 28-2025
                </AppTypography>
            );
        }

        if (index === 6) {
            return (
                <AppTypography variant="caption" style={styles.sectionLabel}>
                    Yesterday, Oct 27-2025
                </AppTypography>
            );
        }

        return null;
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.waveOne} />
                <View style={styles.waveTwo} />

                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => navigation?.goBack?.()}
                        hitSlop={10}
                        style={styles.backButton}
                    >
                        <MaterialCommunityIcons
                            name="chevron-left"
                            size={24}
                            color="#ffffff"
                        />
                    </Pressable>

                    <AppTypography variant="h4" style={styles.headerTitle}>
                        Notification
                    </AppTypography>
                </View>
            </View>

            <FlatList
                data={NOTIFICATIONS}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                    <View>
                        {renderHeaderLabel(index)}
                        <NotificationCard
                            image={item.image}
                            title={item.title}
                            description={item.description}
                            showCallIcon={index < 4}
                        />
                    </View>
                )}
                ListFooterComponent={
                    <AppTypography variant="caption" style={styles.sectionLabel}>
                        Monday, Oct 26-2025
                    </AppTypography>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f7f8',
    },
    header: {
        backgroundColor: '#346d74',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 18,
        overflow: 'hidden',
    },
    waveOne: {
        position: 'absolute',
        width: 320,
        height: 150,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -58,
        left: -90,
        transform: [{ rotate: '-5deg' }],
    },
    waveTwo: {
        position: 'absolute',
        width: 320,
        height: 150,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.05)',
        top: -30,
        left: -45,
        transform: [{ rotate: '-5deg' }],
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 28,
    },
    sectionLabel: {
        color: '#31373b',
        fontSize: 13,
        marginBottom: 10,
        marginTop: 4,
    },
});
