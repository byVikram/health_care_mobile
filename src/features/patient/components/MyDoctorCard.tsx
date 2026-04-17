import React from 'react';
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppTypography } from '../../../components/common';

export type DoctorCardItem = {
    image: ImageSourcePropType | string;
    name: string;
    speciality: string;
    experience: string;
};

type MyDoctorCardProps = DoctorCardItem;

const FALLBACK_DOCTOR_IMAGE = require('../../../assets/Banner/doctor.png');

export default function MyDoctorCard({
    image,
    name,
    speciality,
    experience,
}: MyDoctorCardProps) {
    const imageSource =
        typeof image === 'string' ? { uri: image } : image || FALLBACK_DOCTOR_IMAGE;

    return (
        <View style={styles.card}>
            <View style={styles.imageFrame}>
                <Image
                    source={imageSource}
                    defaultSource={FALLBACK_DOCTOR_IMAGE}
                    style={styles.image}
                    resizeMode="cover"
                />
            </View>

            <View style={styles.content}>
                <AppTypography variant="h4" style={styles.name} numberOfLines={1}>
                    {name}
                </AppTypography>

                <AppTypography variant="caption" style={styles.speciality} numberOfLines={1}>
                    {speciality}
                </AppTypography>

                <View style={styles.metaRow}>
                    <MaterialCommunityIcons
                        name="briefcase-outline"
                        size={14}
                        color="#7f98a3"
                    />
                    <AppTypography variant="caption" style={styles.metaText}>
                        {experience}
                    </AppTypography>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d9e6eb',
        padding: 12,
        marginBottom: 14,
        shadowColor: '#12343b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    imageFrame: {
        width: 62,
        height: 62,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#edf4f6',
        marginRight: 12,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 17,
        lineHeight: 22,
        color: '#22343d',
        marginBottom: 2,
    },
    speciality: {
        color: '#8b9aa2',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        marginLeft: 5,
        color: '#7f98a3',
        fontSize: 11,
    },
});
