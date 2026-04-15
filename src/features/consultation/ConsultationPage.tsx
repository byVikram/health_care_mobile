import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as NativeInput, Modal } from 'react-native';
import { Text, Card, Avatar, Button, useTheme, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SvgProps } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import DicomViewer from './components/DicomViewer';
import Prescription from '../../assets/icons/consultation/prescription.svg';
import LaboratoryIcon from '../../assets/icons/consultation/lab.svg';
import RadiologyTabIcon from '../../assets/icons/consultation/radiology.svg';
import AncillaryIcon from '../../assets/icons/consultation/ancillary.svg';

const SAMPLE_DICOM_MODULE = require('../../assets/dicon/sample-dicon.dcm');

type TabItem = {
    id: string;
    Icon: React.FC<SvgProps>;
};


const MOCK_PATIENT = {
	id: 'p001',
	patientId: 'PID1120',
	name: 'Nitin S H',
	age: 31,
	gender: 'Male',
	phone: '+91 9871236540',
	email: 'nitin@gmail.com',
	avatar: 'https://i.pravatar.cc/150?img=11',
	dateOfBirth: '06 April 1994',
	maritalStatus: 'Single',
	weight: '78kg',
	height: '5 feet 5 inch',
	bloodGroup: 'A+',
	address: '#201 1st floor beside colive pg near jeevika hospital bengaluru karnataka-560056',
	occupation: 'IT Profession',
	emergencyContact: {
		name: 'Sachin S H',
		relation: 'Brother',
		number: '9876543210',
	},
	chronicDiseases: ['Diabetes', 'Hypertension', 'Asthma'],
	allergies: ['Pet allergy', 'Egg', 'Milk'],
	smokingStatus: 'Non-smoker',
	alcoholConsumption: 'Non-drinker',
	dietType: 'Vegetarian',
};

const MOCK_DOCTOR = {
	name: 'Dr. Ashika Rao',
	degree: 'MBBS MD',
	specialization: 'Dentist Consultation',
	clinicName: 'Arogya Clinic',
	clinicAddress: '1 main, KR Market, Bengaluru - 580036',
};

function RowItem({ label, value }: { label: string; value: string }) {
    const theme = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
            <Text style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}>{label}</Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#333' }}>{value}</Text>
        </View>
    );
}

// -------------------------------------------------------------
// PAST MEDICAL HISTORY
// -------------------------------------------------------------
function PastMedicalHistory() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState('Laboratory');
    const [dicomBase64, setDicomBase64] = useState<string | null>(null);
    const [dicomLoading, setDicomLoading] = useState(false);
    const [dicomError, setDicomError] = useState<string | null>(null);
    const [isDicomExpanded, setIsDicomExpanded] = useState(false);

    const tabs: TabItem[] = [
        { id: 'Prescription', Icon: Prescription },
        { id: 'Laboratory', Icon: LaboratoryIcon },
        { id: 'Radiology', Icon: RadiologyTabIcon },
        { id: 'Ancillary', Icon: AncillaryIcon },
    ];

    // Load the DICOM file as Base64 when the Radiology tab is first activated
    useEffect(() => {
        if (activeTab !== 'Radiology' || dicomBase64 || dicomLoading) return;

        const loadDicom = async () => {
            setDicomLoading(true);
            setDicomError(null);
            try {
                // Resolve the bundled asset so Expo gives us a local URI
                const asset = Asset.fromModule(SAMPLE_DICOM_MODULE);
                await asset.downloadAsync();

                if (!asset.localUri) {
                    throw new Error('Could not resolve local URI for DICOM asset.');
                }

                // Read as Base64 â€” large file, so this may take a moment
                const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setDicomBase64(base64);
            } catch (err: any) {
                setDicomError(err?.message ?? 'Failed to load DICOM file.');
            } finally {
                setDicomLoading(false);
            }
        };

        loadDicom();
    }, [activeTab]);

    return (
        <Card style={[styles.card, { marginTop: 0 }]}>
            <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}>Past medical history</Text>
                
                {/* Tabs */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 }}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.Icon;
                        return (
                            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={{ alignItems: 'center', flex: 1 }}>
                                <TabIcon width={24} height={24} />
                                <Text style={{ fontSize: 10, color: isActive ? theme.colors.primary : '#999', marginTop: 4, fontWeight: isActive ? 'bold' : 'normal' }}>
                                    {tab.id}
                                </Text>
                                {isActive && <View style={{ position: 'absolute', bottom: -10, height: 3, backgroundColor: theme.colors.primary, width: '100%' }} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Filter Mock */}
                <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Select date</Text>
                    <Button mode="outlined" style={{ alignSelf: 'flex-start', borderRadius: 8 }} contentStyle={{ height: 32 }} labelStyle={{ fontSize: 12 }}>
                        All
                    </Button>
                </View>

                {/* â”€â”€ RADIOLOGY TAB: DICOM Viewer â”€â”€ */}
                {activeTab === 'Radiology' ? (
                    <View style={{ marginTop: 16 }}>
                        {dicomError ? (
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#e53935" />
                                <Text style={{ color: '#e53935', marginTop: 8, fontSize: 12, textAlign: 'center' }}>
                                    {dicomError}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                    <MaterialCommunityIcons name="radioactive" size={16} color={theme.colors.primary} />
                                    <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 'bold', marginLeft: 6 }}>
                                        Radiology Scan DICOM Viewer
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                                    <Button
                                        mode="outlined"
                                        compact
                                        icon="arrow-expand"
                                        onPress={() => setIsDicomExpanded(true)}
                                    >
                                        Expand view
                                    </Button>
                                </View>

                                {/* The DICOM WebView viewer */}
                                <DicomViewer base64Data={dicomBase64} />

                                <Text style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
                                    Drag to adjust Window/Level:·Pinch or +/- to zoom:⊙ resets view:☀ inverts:
                                </Text>
                                <Text style={{ fontSize: 10, color: '#bbb', marginTop: 4, textAlign: 'center' }}>
                                    Powered by CornerstoneJS · Requires internet on first load
                                </Text>
                            </>
                        )}
                    </View>
                ) : (
                    /* â”€â”€ OTHER TABS: Empty State â”€â”€ */
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#ccc" />
                        <Text style={{ color: '#666', marginTop: 8, fontWeight: '500' }}>No past {activeTab.toLowerCase()} history!</Text>
                    </View>
                )}
            </Card.Content>

            <Modal
                visible={isDicomExpanded}
                animationType="slide"
                onRequestClose={() => setIsDicomExpanded(false)}
            >
                <View style={styles.dicomModalContainer}>
                    <View style={styles.dicomModalHeader}>
                        <Text style={styles.dicomModalTitle}>Radiology Image</Text>
                        <IconButton icon="close" iconColor="#fff" onPress={() => setIsDicomExpanded(false)} />
                    </View>
                    <View style={styles.dicomModalBody}>
                        <DicomViewer base64Data={dicomBase64} fullScreen />
                    </View>
                </View>
            </Modal>
        </Card>
    );
}

// -------------------------------------------------------------
// SHARE WITH
// -------------------------------------------------------------
function ShareWith() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState('Laboratory');
    const tabs: TabItem[] = [
        { id: 'Pharmacy', Icon: Prescription },
        { id: 'Laboratory', Icon: LaboratoryIcon },
        { id: 'Radiology', Icon: RadiologyTabIcon },
        { id: 'Ancillary', Icon: AncillaryIcon },
    ];

    const MOCK_PLACES = [
        { id: '1', name: 'Apollo Pharmacy, KR Puram', address: '1st Block, 9th Main Rd, Bengaluru', phone: '+91 9876543250', distance: '300m away' },
        { id: '2', name: 'Med Plus, KR Puram', address: '1st Block, 9th Main Rd, Bengaluru', phone: '+91 9876543250', distance: '1.2km away' },
    ];

    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}>Share with:</Text>
                
                {/* Tabs */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 16 }}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.Icon;
                        return (
                            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={{ alignItems: 'center', flex: 1 }}>
                                <TabIcon width={24} height={24} />
                                <Text style={{ fontSize: 10, color: isActive ? theme.colors.primary : '#999', marginTop: 4, fontWeight: isActive ? 'bold' : 'normal' }}>
                                    {tab.id}
                                </Text>
                                {isActive && <View style={{ position: 'absolute', bottom: -10, height: 3, backgroundColor: theme.colors.primary, width: '100%' }} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Filters Mock */}
                <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Select address</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <Button mode="outlined" style={{ flex: 1, borderRadius: 8 }} contentStyle={{ height: 32 }} labelStyle={{ fontSize: 10 }}>City â–¾</Button>
                    <Button mode="outlined" style={{ flex: 1, borderRadius: 8 }} contentStyle={{ height: 32 }} labelStyle={{ fontSize: 10 }}>Area â–¾</Button>
                    <Button mode="outlined" style={{ flex: 1, borderRadius: 8 }} contentStyle={{ height: 32 }} labelStyle={{ fontSize: 10 }}>Locality â–¾</Button>
                </View>

                {/* Places */}
                {MOCK_PLACES.map((place, i) => (
                    <View key={place.id} style={{ paddingTop: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#eee', marginBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{place.name}</Text>
                        <Text style={{ color: '#666', fontSize: 11, marginVertical: 4 }}>{place.address}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="phone" size={12} color={theme.colors.primary} />
                                <Text style={{ fontSize: 11, color: theme.colors.primary, marginLeft: 2, marginRight: 8 }}>{place.phone}</Text>
                                <Text style={{ fontSize: 11, color: '#ccc', marginRight: 8 }}>|</Text>
                                <MaterialCommunityIcons name="map-marker-outline" size={12} color="#666" />
                                <Text style={{ fontSize: 11, color: '#666', marginLeft: 2 }}>{place.distance}</Text>
                            </View>
                            <Button mode="contained" compact style={{ borderRadius: 8 }}>Share</Button>
                        </View>
                    </View>
                ))}
            </Card.Content>
        </Card>
    );
}


// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
export default function ConsultationPage() {
    const theme = useTheme();
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState(0);

    const [notes, setNotes] = useState('');

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.headerTop}>
                    <IconButton 
                        icon="arrow-left" 
                        onPress={() => navigation.goBack()} 
                        style={{ margin: 0, padding: 0 }}
                    />
                    <Avatar.Image size={42} source={{ uri: MOCK_PATIENT.avatar }} style={{ marginHorizontal: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{MOCK_PATIENT.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text variant="bodySmall" style={{ color: '#666', fontSize: 11 }}>{MOCK_PATIENT.age} yrs / {MOCK_PATIENT.gender} | </Text>
                            <MaterialCommunityIcons name="phone" size={10} color="#666" style={{ marginHorizontal: 2 }} />
                            <Text variant="bodySmall" style={{ color: '#666', fontSize: 11 }}>{MOCK_PATIENT.phone}</Text>
                        </View>
                    </View>
                    <Button mode="contained" compact style={{ borderRadius: 20 }}>+ Follow up</Button>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 0 && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab(0)}>
                        <Text style={[styles.tabText, activeTab === 0 && { color: theme.colors.primary, fontWeight: 'bold' }]}>Info & Timeline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 1 && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab(1)}>
                        <Text style={[styles.tabText, activeTab === 1 && { color: theme.colors.primary, fontWeight: 'bold' }]}>Vitals</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Container */}
            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 0 && (
                    <View>
                        {/* Patient Details EXACT Mapping */}
                        <Card style={styles.card}>
                            <Card.Content>
                                <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}>Patient Details</Text>
                                
                                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                                    <View style={{ marginRight: 16 }}>
                                        <Avatar.Image size={70} source={{ uri: MOCK_PATIENT.avatar }} style={{ borderRadius: 8 }} />
                                    </View>
                                    <View style={{ flex: 1, flexDirection: 'row' }}>
                                        <View style={{ flex: 1 }}>
                                            <RowItem label="Name:" value={MOCK_PATIENT.name} />
                                            <RowItem label="Patient ID:" value={MOCK_PATIENT.patientId} />
                                            <RowItem label="Age:" value={`${MOCK_PATIENT.age} years`} />
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                                                <Text style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}>Phone:</Text>
                                                <Text style={{ fontSize: 11, fontWeight: '500', color: '#333' }}>{MOCK_PATIENT.phone}</Text>
                                                <MaterialCommunityIcons name="check-circle" size={12} color="green" style={{ marginLeft: 4 }} />
                                            </View>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }} />
                                        <View style={{ flex: 1 }}>
                                            <RowItem label="Gender:" value={MOCK_PATIENT.gender} />
                                            <RowItem label="Blood:" value={MOCK_PATIENT.bloodGroup} />
                                            <RowItem label="Height:" value={MOCK_PATIENT.height} />
                                            <RowItem label="Weight:" value={MOCK_PATIENT.weight} />
                                        </View>
                                    </View>
                                </View>

                                <Divider style={{ marginVertical: 12 }} />

                                <View style={{ flexDirection: 'row' }}>
                                    <View style={{ flex: 1 }}>
                                        <RowItem label="D.O.B:" value={MOCK_PATIENT.dateOfBirth} />
                                        <RowItem label="Marital:" value={MOCK_PATIENT.maritalStatus} />
                                        <RowItem label="Email:" value={MOCK_PATIENT.email} />
                                    </View>
                                    <View style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: theme.colors.primary }}>Address:</Text>
                                        <Text style={{ fontSize: 10, lineHeight: 14 }}>{MOCK_PATIENT.address}</Text>
                                    </View>
                                    <View style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: theme.colors.primary }}>Emergency Contact:</Text>
                                        <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{MOCK_PATIENT.emergencyContact.name}</Text>
                                        <Text style={{ fontSize: 10, color: '#666' }}>({MOCK_PATIENT.emergencyContact.relation})</Text>
                                        <Text style={{ fontSize: 10, color: '#d32f2f' }}>{MOCK_PATIENT.emergencyContact.number}</Text>
                                    </View>
                                </View>

                                <Divider style={{ marginVertical: 12 }} />

                                <View style={{ flexDirection: 'row' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: theme.colors.primary }}>Chronic diseases:</Text>
                                        {MOCK_PATIENT.chronicDiseases.map((d, i) => (
                                            <Text key={i} style={{ fontSize: 10 }}>â€¢ {d}</Text>
                                        ))}
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <RowItem label="Occupation:" value={MOCK_PATIENT.occupation} />
                                        <RowItem label="Smoking:" value={MOCK_PATIENT.smokingStatus} />
                                        <RowItem label="Alcohol:" value={MOCK_PATIENT.alcoholConsumption} />
                                        <RowItem label="Diet:" value={MOCK_PATIENT.dietType} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: theme.colors.primary }}>Allergies:</Text>
                                        {MOCK_PATIENT.allergies.map((a, i) => (
                                            <Text key={i} style={{ fontSize: 10 }}>â€¢ {a}</Text>
                                        ))}
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>

                        {/* NEW: Past Medical History Component */}
                        <PastMedicalHistory />

                        {/* Consultation Notes Emulator */}
                        <Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
                            {/* Doctor Header Banner inside notes */}
                            <View style={styles.notesHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>{MOCK_DOCTOR.name}, {MOCK_DOCTOR.degree}</Text>
                                    <Text style={{ color: theme.colors.primary, fontSize: 10 }}>{MOCK_DOCTOR.specialization}</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>{MOCK_DOCTOR.clinicName}</Text>
                                    <Text style={{ color: theme.colors.primary, fontSize: 10 }}>{MOCK_DOCTOR.clinicAddress}</Text>
                                </View>
                            </View>
                            <Divider />
                            {/* Editor Toolbar Mock */}
                            <View style={styles.editorToolbar}>
                                <MaterialCommunityIcons name="undo" size={18} color="#666" style={{ marginHorizontal: 6 }} />
                                <MaterialCommunityIcons name="redo" size={18} color="#666" style={{ marginHorizontal: 6 }} />
                                <MaterialCommunityIcons name="format-text" size={18} color="#666" style={{ marginHorizontal: 6 }} />
                                <MaterialCommunityIcons name="camera-outline" size={18} color="#666" style={{ marginHorizontal: 6 }} />
                                <MaterialCommunityIcons name="microphone-outline" size={18} color="#666" style={{ marginHorizontal: 6 }} />
                                <MaterialCommunityIcons name="format-list-bulleted" size={18} color="#666" style={{ marginHorizontal: 6 }} />
                            </View>
                            <Divider />
                            {/* Multiline TextInput substituting Canvas */}
                            <NativeInput
                                placeholder="Type or draw consultation notes here..."
                                multiline
                                textAlignVertical="top"
                                value={notes}
                                onChangeText={setNotes}
                                style={styles.textArea}
                            />
                        </Card>

                        {/* NEW: Share With Component */}
                        <ShareWith />

                        <Button mode="contained" style={{ marginHorizontal: 16, marginBottom: 32 }}>Save & Confirm Session</Button>
                    </View>
                )}

                {activeTab === 1 && (
                     <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Vitals History</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                                <Text style={{ color: '#666', fontWeight: '500' }}>Heart Rate</Text>
                                <Text style={{ fontWeight: 'bold' }}>72 bpm</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                                <Text style={{ color: '#666', fontWeight: '500' }}>Blood Pressure</Text>
                                <Text style={{ fontWeight: 'bold', color: '#d32f2f' }}>140/90 mmHg</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                                <Text style={{ color: '#666', fontWeight: '500' }}>Temperature</Text>
                                <Text style={{ fontWeight: 'bold' }}>98.6 Â°F</Text>
                            </View>
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        paddingTop: 48,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingBottom: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabText: {
        color: '#666',
    },
    content: {
        paddingTop: 16,
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    notesHeader: {
        backgroundColor: '#e0f2f1',
        padding: 12,
        flexDirection: 'row',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    editorToolbar: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#fafafa',
    },
    textArea: {
        height: 160,
        padding: 12,
        fontSize: 14,
        color: '#333',
    },
    dicomModalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    dicomModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 36,
        paddingHorizontal: 8,
        backgroundColor: '#000',
    },
    dicomModalTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 12,
    },
    dicomModalBody: {
        flex: 1,
    }
});

