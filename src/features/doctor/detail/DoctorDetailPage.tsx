import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppButton, AppTypography, AppSkeleton } from '../../../components/common';
import { getDoctorById } from '../doctorService';
import { DoctorDetailData } from '../../../types/doctor-detail';

const MOCK_TIMESLOTS = [
    '09:00AM', '09:30AM', '10:00AM', '10:30AM',
    '11:00AM', '11:30AM', '12:00PM', '12:30PM',
    '01:00PM', '01:30PM', '02:00PM', '02:30PM',
    '03:00PM', '03:30PM', '04:00PM', '04:30PM',
    '05:00PM', '05:30PM', '06:00PM', '06:30PM'
];

export default function DoctorDetailPage() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    
    const [doctor, setDoctor] = useState<DoctorDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    // Form States
    const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
    const [apptType, setApptType] = useState<'offline'|'video'|null>('offline');
    const [selectedDate, setSelectedDate] = useState<number>(0); // index 0-6
    const [selectedTime, setSelectedTime] = useState<string | null>('01:00PM');

    // Generate 7 days loosely for UI
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
            id: i,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dateNum: d.getDate()
        };
    });

    useEffect(() => {
        const fetchDetail = async () => {
            if (!route.params?.id) return;
            try {
                const res = await getDoctorById(route.params.id);
                if (res.success && res.data) {
                    setDoctor(res.data);
                    if (res.data.hospitals?.length > 0) {
                        setSelectedHospital(res.data.hospitals[0].hospital.id);
                    }
                }
            } catch (error) {
                console.error('Error fetching doctor details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [route.params?.id]);

    if (loading) {
        return (
            <View style={[styles.container, { padding: 16 }]}>
                <AppSkeleton height={150} style={{ marginBottom: 16, marginTop: 40 }} />
                <AppSkeleton height={100} style={{ marginBottom: 16 }} />
                <AppSkeleton height={300} style={{ marginBottom: 16 }} />
            </View>
        );
    }

    if (!doctor) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <AppTypography>Doctor not found</AppTypography>
                <AppButton variant="text" onPress={() => navigation.goBack()}>Go Back</AppButton>
            </View>
        );
    }

    const { details, specialities, hospitals } = doctor;
    const avatarUrl = details?.avatar_s3_key || 'https://via.placeholder.com/150';

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Gradient / Background Placeholder */}
                <View style={styles.headerBackground}>
                    <View style={styles.headerTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                                <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
                            </TouchableOpacity>
                            <AppTypography variant="h3" style={{ color: '#fff', marginLeft: 8 }}>Appointment</AppTypography>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity style={{ padding: 8 }}>
                                <MaterialCommunityIcons name="heart-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={{ padding: 8 }}>
                                <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Overhead Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileTopRow}>
                        <View style={styles.avatarWrapper}>
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                            <View style={styles.verifiedBadge}>
                                <MaterialCommunityIcons name="check" size={12} color="#fff" />
                            </View>
                        </View>
                        <View style={styles.profileInfo}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <AppTypography variant="h3" style={styles.doctorName}>{doctor.name}</AppTypography>
                                    <AppTypography variant="caption" style={styles.doctorSpec}>
                                        {specialities?.[0] || 'Dentist Consultation'}
                                    </AppTypography>
                                </View>
                                <View style={styles.idPill}>
                                    <AppTypography variant="caption" style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>
                                        ID: 143285
                                    </AppTypography>
                                </View>
                            </View>

                            <View style={{ marginTop: 8 }}>
                                <View style={styles.locationRow}>
                                    <MaterialCommunityIcons name="map-marker" size={12} color="#2b7571" />
                                    <AppTypography variant="caption" style={styles.locationText} numberOfLines={1}>
                                        Arogya Clinic XR Market.
                                    </AppTypography>
                                    <AppTypography variant="caption" style={styles.distanceText}>&lt;1km</AppTypography>
                                </View>
                                <View style={styles.locationRow}>
                                    <MaterialCommunityIcons name="map-marker" size={12} color="#2b7571" />
                                    <AppTypography variant="caption" style={styles.locationText} numberOfLines={1}>
                                        Dhanavantri Clinic, marathalli.
                                    </AppTypography>
                                    <AppTypography variant="caption" style={styles.distanceText}>&lt;5km</AppTypography>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Stats Metrics Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <MaterialCommunityIcons name="account-group" size={24} color="#2b7571" />
                            <AppTypography variant="caption" style={styles.statVal}>7,500+</AppTypography>
                            <AppTypography variant="caption" style={styles.statLabel}>Patients</AppTypography>
                        </View>
                        <View style={styles.statBox}>
                            <MaterialCommunityIcons name="briefcase-outline" size={24} color="#2b7571" />
                            <AppTypography variant="caption" style={styles.statVal}>{details?.experience_years || 10}+</AppTypography>
                            <AppTypography variant="caption" style={styles.statLabel}>Experience</AppTypography>
                        </View>
                        <View style={styles.statBox}>
                            <MaterialCommunityIcons name="star" size={24} color="#2b7571" />
                            <AppTypography variant="caption" style={styles.statVal}>4.9+</AppTypography>
                            <AppTypography variant="caption" style={styles.statLabel}>Ratings</AppTypography>
                        </View>
                        <View style={styles.statBox}>
                            <MaterialCommunityIcons name="comment-text-outline" size={24} color="#2b7571" />
                            <AppTypography variant="caption" style={styles.statVal}>4,908</AppTypography>
                            <AppTypography variant="caption" style={styles.statLabel}>Reviews</AppTypography>
                        </View>
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <AppTypography variant="h4" style={styles.sectionTitle}>About</AppTypography>
                    <AppTypography variant="caption" style={styles.aboutText}>
                        {details?.about || 'Dr. Ashika rao is a highly experienced dentist and surgeon with over 10years of expertise in treating tooth and gum related issues Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua... '}
                        <AppTypography variant="caption" style={{ color: '#2b7571', fontWeight: 'bold' }}>Read more</AppTypography>
                    </AppTypography>
                </View>

                <View style={styles.divider} />

                {/* Working Time */}
                <View style={styles.section}>
                    <AppTypography variant="h4" style={styles.sectionTitle}>Working Time</AppTypography>
                    <AppTypography variant="caption" style={styles.greyText}>Mon-Fri, 09:00 AM - 10:30 PM</AppTypography>
                </View>

                <View style={styles.divider} />

                {/* Choose Hospital */}
                <View style={styles.section}>
                    <AppTypography variant="h4" style={styles.sectionTitle}>Choose Hospital</AppTypography>
                    
                    {hospitals && hospitals.length > 0 ? hospitals.map((h, index) => {
                        const isSelected = selectedHospital === h.hospital.id;
                        return (
                            <TouchableOpacity 
                                key={h.hospital.id} 
                                style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                                onPress={() => setSelectedHospital(h.hospital.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.hospitalNumIcon}>
                                    <AppTypography variant="caption" style={{ color: '#fff', fontWeight: 'bold' }}>{index + 1}</AppTypography>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <AppTypography variant="body" style={{ fontWeight: 'bold', color: '#333' }}>{h.hospital.name}</AppTypography>
                                    <AppTypography variant="caption" style={styles.greyText} numberOfLines={1}>
                                        {h.hospital.address}
                                    </AppTypography>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <AppTypography variant="caption" style={styles.greyText}>
                                        {index === 0 ? '<1 km' : '<5 km'}
                                    </AppTypography>
                                    <MaterialCommunityIcons 
                                        name={isSelected ? 'circle-slice-8' : 'circle-outline'} 
                                        size={22} 
                                        color={isSelected ? '#2b7571' : '#ccc'} 
                                        style={{ marginLeft: 8 }}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    }) : (
                        <AppTypography variant="caption">No hospitals listed</AppTypography>
                    )}
                </View>

                {/* Type of Appointment */}
                <View style={styles.section}>
                    <AppTypography variant="h4" style={styles.sectionTitle}>Type of appointment</AppTypography>
                    
                    <TouchableOpacity 
                        style={[styles.radioCard, apptType === 'offline' && styles.radioCardSelected]}
                        onPress={() => setApptType('offline')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.typeIconBox, { backgroundColor: '#e8faee' }]}>
                            <MaterialCommunityIcons name="home-plus" size={24} color="#00a82d" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <AppTypography variant="body" style={{ fontWeight: 'bold', color: '#333' }}>Clinic Visit</AppTypography>
                            <AppTypography variant="caption" style={styles.greyText}>In person consultation</AppTypography>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppTypography variant="caption" style={{ color: '#333', textAlign: 'right' }}>
                                ₹ 300/{'\n'}30min
                            </AppTypography>
                            <MaterialCommunityIcons 
                                name={apptType === 'offline' ? 'circle-slice-8' : 'circle-outline'} 
                                size={22} 
                                color={apptType === 'offline' ? '#2b7571' : '#ccc'} 
                                style={{ marginLeft: 8 }}
                            />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.radioCard, apptType === 'video' && styles.radioCardSelected]}
                        onPress={() => setApptType('video')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.typeIconBox, { backgroundColor: '#e6f0ff' }]}>
                            <MaterialCommunityIcons name="video" size={24} color="#0066ff" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <AppTypography variant="body" style={{ fontWeight: 'bold', color: '#333' }}>Video Call</AppTypography>
                            <AppTypography variant="caption" style={styles.greyText}>Virtual Consultation</AppTypography>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppTypography variant="caption" style={{ color: '#333', textAlign: 'right' }}>
                                ₹ 300/{'\n'}30min
                            </AppTypography>
                            <MaterialCommunityIcons 
                                name={apptType === 'video' ? 'circle-slice-8' : 'circle-outline'} 
                                size={22} 
                                color={apptType === 'video' ? '#2b7571' : '#ccc'} 
                                style={{ marginLeft: 8 }}
                            />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Select Date */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <AppTypography variant="h4" style={styles.sectionTitle}>Select Date</AppTypography>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="chevron-left" size={20} color="#2b7571" />
                            <AppTypography variant="body" style={{ color: '#333', fontWeight: 'bold', marginHorizontal: 8 }}>Feb 2025</AppTypography>
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#2b7571" />
                        </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                        {dates.map((d) => {
                            const isSelected = selectedDate === d.id;
                            return (
                                <TouchableOpacity 
                                    key={d.id} 
                                    style={[styles.dateBox, isSelected && styles.dateBoxSelected]}
                                    onPress={() => setSelectedDate(d.id)}
                                >
                                    <AppTypography variant="caption" style={[styles.dayName, isSelected && { color: '#fff' }]}>{d.dayName}</AppTypography>
                                    <AppTypography variant="body" style={[styles.dateNum, isSelected && { color: '#fff' }]}>{d.dateNum}</AppTypography>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                {/* Select Time */}
                <View style={[styles.section, { paddingBottom: 32 }]}>
                    <AppTypography variant="h4" style={styles.sectionTitle}>Select Time</AppTypography>
                    <View style={styles.timeGrid}>
                        {MOCK_TIMESLOTS.map((time, idx) => {
                            const isSelected = selectedTime === time;
                            return (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[styles.timeBox, isSelected && styles.timeBoxSelected]}
                                    onPress={() => setSelectedTime(time)}
                                    activeOpacity={0.6}
                                >
                                    <AppTypography variant="caption" style={[styles.timeText, isSelected && { color: '#fff', fontWeight: 'bold' }]}>
                                        {time}
                                    </AppTypography>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Sticky Button */}
            <View style={styles.bottomBar}>
                <AppButton 
                    variant="primary" 
                    style={styles.bookButton}
                    onPress={() => alert('Booked successfully!')}
                >
                    Book Appointment
                </AppButton>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    scrollArea: {
        flex: 1,
    },
    headerBackground: {
        backgroundColor: '#568b8b', // Custom teal mimicking mockup
        height: 180,
        paddingTop: Platform.OS === 'ios' ? 50 : 30, // Status bar padding
        paddingHorizontal: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: -60,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    profileTopRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 65,
        height: 65,
        borderRadius: 12,
        backgroundColor: '#eee',
    },
    verifiedBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#2b7571',
        borderRadius: 10,
        padding: 2,
    },
    profileInfo: {
        flex: 1,
    },
    doctorName: {
        fontWeight: 'bold',
        color: '#333',
        fontSize: 16,
    },
    doctorSpec: {
        color: '#888',
        marginTop: 2,
    },
    idPill: {
        backgroundColor: '#2b7571',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationText: {
        color: '#888',
        marginLeft: 4,
        flex: 1,
    },
    distanceText: {
        color: '#2b7571',
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statVal: {
        fontWeight: 'bold',
        color: '#333',
        marginTop: 4,
        fontSize: 11,
    },
    statLabel: {
        color: '#888',
        fontSize: 9,
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        color: '#333',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    aboutText: {
        color: '#666',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 16,
    },
    greyText: {
        color: '#888',
    },
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    radioCardSelected: {
        borderColor: '#2b7571',
        backgroundColor: '#f7fcfc',
    },
    hospitalNumIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#2b7571',
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeIconBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateBox: {
        width: 50,
        height: 65,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        backgroundColor: '#fff',
    },
    dateBoxSelected: {
        backgroundColor: '#2b7571',
        borderColor: '#2b7571',
    },
    dayName: {
        color: '#5b7282',
        marginBottom: 4,
    },
    dateNum: {
        fontWeight: 'bold',
        color: '#333',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    timeBox: {
        width: '23%', 
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 20,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    timeBoxSelected: {
        backgroundColor: '#568b8b',
        borderColor: '#568b8b',
    },
    timeText: {
        color: '#555',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    bookButton: {
        backgroundColor: '#2b7571',
        borderRadius: 8,
        paddingVertical: 6,
    }
});
