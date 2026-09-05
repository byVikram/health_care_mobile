import React from 'react';
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppTypography } from '../../../components/common';

export type DoctorCardItem = {
    id?: string;
    image: ImageSourcePropType | string;
    name: string;
    speciality: string;
    experience: string;
    location?: string;
};

type MyDoctorCardProps = DoctorCardItem & {
    saved?: boolean;
    disabled?: boolean;
    onToggleSaved?: () => void;
    onPress?: () => void;
};

const FALLBACK_DOCTOR_IMAGE = require('../../../assets/Banner/doctor.png');

export default function MyDoctorCard({
    image,
    name,
    speciality,
    experience,
    location,
    saved = false,
    disabled = false,
    onToggleSaved,
    onPress,
}: MyDoctorCardProps) {
    const imageSource =
        typeof image === 'string' ? { uri: image } : image || FALLBACK_DOCTOR_IMAGE;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
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

                {!!location && (
                    <View style={[styles.metaRow, styles.locationRow]}>
                        <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={14}
                            color="#7f98a3"
                        />
                        <AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
                            {location}
                        </AppTypography>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={[styles.bookmarkButton, disabled && styles.bookmarkButtonDisabled]}
                onPress={onToggleSaved}
                disabled={disabled}
                activeOpacity={0.75}
            >
                <MaterialCommunityIcons
                    name={saved ? 'bookmark' : 'bookmark-outline'}
                    size={24}
                    color={saved ? '#245f67' : '#8ca0a9'}
                />
            </TouchableOpacity>
        </TouchableOpacity>
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
        paddingRight: 10,
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
    locationRow: {
        marginTop: 3,
    },
    bookmarkButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f2f7f8',
    },
    bookmarkButtonDisabled: {
        opacity: 0.55,
    },
});
