import React from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppTypography } from '../../components/common';
import { DOCTORS } from '../../constants/mockdata';
import MyDoctorCard from './components/MyDoctorCard';

export default function MyDoctorPage({ navigation }: any) {
    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.headerOverlayOne} />
                <View style={styles.headerOverlayTwo} />

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
                        My Doctor
                    </AppTypography>
                </View>
            </View>

            <FlatList
                data={DOCTORS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <MyDoctorCard {...item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f9fa',
    },
    header: {
        backgroundColor: '#245f67',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 18,
        overflow: 'hidden',
    },
    headerOverlayOne: {
        position: 'absolute',
        width: 320,
        height: 150,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -58,
        left: -90,
        transform: [{ rotate: '-5deg' }],
    },
    headerOverlayTwo: {
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
        paddingBottom: 24,
    },
});
