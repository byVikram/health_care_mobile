import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput as NativeInput,
  Modal,
} from "react-native";
import {
  useTheme,
  Card,
  Avatar,
  Button,
  IconButton,
  Divider,
  Text,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { SvgProps } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import DicomViewer from "./components/DicomViewer";
import Prescription from "../../assets/icons/consultation/prescription.svg";
import LaboratoryIcon from "../../assets/icons/consultation/lab.svg";
import RadiologyTabIcon from "../../assets/icons/consultation/radiology.svg";
import AncillaryIcon from "../../assets/icons/consultation/ancillary.svg";
import { patientService, PatientDetails , doctorService,DocterDetails} from "./ConsultationService";

const SAMPLE_DICOM_MODULE = require("../../assets/dicon/sample-dicon.dcm");

type TabItem = { id: string; Icon: React.FC<SvgProps> };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_PATIENT = {
  id: "p001",
  patientId: "PID1120",
  name: "Nitin S H",
  age: 31,
  gender: "Male",
  phone: "+91 9871236540",
  email: "nitin@gmail.com",
  avatar: "https://i.pravatar.cc/150?img=11",
  dateOfBirth: "06 April 1994",
  maritalStatus: "Single",
  weight: "78kg",
  height: "5 feet 5 inch",
  bloodGroup: "A+",
  address:
    "#201 1st floor beside colive pg near jeevika hospital bengaluru karnataka-560056",
  occupation: "IT Profession",
  emergencyContact: {
    name: "Sachin S H",
    relation: "Brother",
    number: "9876543210",
  },
  chronicDiseases: ["Diabetes", "Hypertension", "Asthma"],
  allergies: ["Pet allergy", "Egg", "Milk"],
  smokingStatus: "Non-smoker",
  alcoholConsumption: "Non-drinker",
  dietType: "Vegetarian",
};

const MOCK_DOCTOR = {
  name: "Dr. Ashika Rao",
  degree: "MBBS MD",
  specialization: "Dentist Consultation",
  clinicName: "Arogya Clinic",
  clinicAddress: "1 main, KR Market, Bengaluru - 580036",
};

function RowItem({ label, value, numberOfLines, ellipsizeMode }: { 
  label: string; 
  value: string; 
  numberOfLines?: number; 
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
      <Text style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}>{label}</Text>
      <Text 
        style={{ fontSize: 11, fontWeight: '500', color: '#333', flex: 1 }} 
        numberOfLines={numberOfLines || 1} 
        ellipsizeMode={ellipsizeMode || 'tail'}
      >
        {value || '--'}
      </Text>
    </View>
  );
}
function resolveAvatar(patient: PatientDetails | null): string | undefined {
  if (!patient) return undefined;
  const key = patient.avatar ?? patient.avatar_s3_key;
  if (!key) return undefined;
  if (typeof key === "string" && key.startsWith("http")) return key;
  return `https://your-cdn.example.com/${key}`;
}

// ─── Past Medical History ─────────────────────────────────────────────────────

function PastMedicalHistory() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("Laboratory");
  const [dicomBase64, setDicomBase64] = useState<string | null>(null);
  const [dicomLoading, setDicomLoading] = useState(false);
  const [dicomError, setDicomError] = useState<string | null>(null);
  const [isDicomExpanded, setIsDicomExpanded] = useState(false);

  const tabs: TabItem[] = [
    { id: "Prescription", Icon: Prescription },
    { id: "Laboratory", Icon: LaboratoryIcon },
    { id: "Radiology", Icon: RadiologyTabIcon },
    { id: "Ancillary", Icon: AncillaryIcon },
  ];

  useEffect(() => {
    if (activeTab !== "Radiology" || dicomBase64 || dicomLoading) return;
    const loadDicom = async () => {
      setDicomLoading(true);
      setDicomError(null);
      try {
        const asset = Asset.fromModule(SAMPLE_DICOM_MODULE);
        await asset.downloadAsync();
        if (!asset.localUri)
          throw new Error("Could not resolve local URI for DICOM asset.");
        const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setDicomBase64(base64);
      } catch (err: any) {
        setDicomError(err?.message ?? "Failed to load DICOM file.");
      } finally {
        setDicomLoading(false);
      }
    };
    loadDicom();
  }, [activeTab]);

  return (
    <Card style={[styles.card, { marginTop: 0 }]}>
      <Card.Content>
        <Text
          variant="titleMedium"
          style={{
            color: theme.colors.primary,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Past medical history
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            paddingBottom: 8,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{ alignItems: "center", flex: 1 }}
              >
                <TabIcon width={42} height={42} />
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? theme.colors.primary : "#999",
                    marginTop: 4,
                    fontWeight: isActive ? "bold" : "normal",
                  }}
                >
                  {tab.id}
                </Text>
                {isActive && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: -10,
                      height: 3,
                      backgroundColor: theme.colors.primary,
                      width: "100%",
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
            Select date
          </Text>
          <Button
            mode="outlined"
            style={{ alignSelf: "flex-start", borderRadius: 8 }}
            contentStyle={{ height: 32 }}
            labelStyle={{ fontSize: 12 }}
          >
            All
          </Button>
        </View>
        {activeTab === "Radiology" ? (
          <View style={{ marginTop: 16 }}>
            {dicomLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator size="large" />
                <Text style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
                  Loading DICOM image…
                </Text>
              </View>
            ) : dicomError ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={40}
                  color="#e53935"
                />
                <Text
                  style={{
                    color: "#e53935",
                    marginTop: 8,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  {dicomError}
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <MaterialCommunityIcons
                    name="radioactive"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.primary,
                      fontWeight: "bold",
                      marginLeft: 6,
                    }}
                  >
                    Radiology Scan DICOM Viewer
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginBottom: 8,
                  }}
                >
                  <Button
                    mode="outlined"
                    compact
                    icon="arrow-expand"
                    onPress={() => setIsDicomExpanded(true)}
                  >
                    Expand view
                  </Button>
                </View>
                <DicomViewer base64Data={dicomBase64} />
                <Text
                  style={{
                    fontSize: 10,
                    color: "#999",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Drag to adjust Window/Level · Pinch or +/- to zoom · ⊙ resets
                  view · ☀ inverts
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <MaterialCommunityIcons
              name="emoticon-sad-outline"
              size={48}
              color="#ccc"
            />
            <Text style={{ color: "#666", marginTop: 8, fontWeight: "500" }}>
              No past {activeTab.toLowerCase()} history!
            </Text>
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
            <IconButton
              icon="close"
              iconColor="#fff"
              onPress={() => setIsDicomExpanded(false)}
            />
          </View>
          <View style={styles.dicomModalBody}>
            <DicomViewer base64Data={dicomBase64} fullScreen />
          </View>
        </View>
      </Modal>
    </Card>
  );
}

// ─── Share With ───────────────────────────────────────────────────────────────

function ShareWith() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("Laboratory");
  const tabs: TabItem[] = [
    { id: "Pharmacy", Icon: Prescription },
    { id: "Laboratory", Icon: LaboratoryIcon },
    { id: "Radiology", Icon: RadiologyTabIcon },
    { id: "Ancillary", Icon: AncillaryIcon },
  ];
  const MOCK_PLACES = [
    {
      id: "1",
      name: "Apollo Pharmacy, KR Puram",
      address: "1st Block, 9th Main Rd, Bengaluru",
      phone: "+91 9876543250",
      distance: "300m away",
    },
    {
      id: "2",
      name: "Med Plus, KR Puram",
      address: "1st Block, 9th Main Rd, Bengaluru",
      phone: "+91 9876543250",
      distance: "1.2km away",
    },
  ];
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text
          variant="titleMedium"
          style={{
            color: theme.colors.primary,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Share with:
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            paddingBottom: 8,
            marginBottom: 16,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{ alignItems: "center", flex: 1 }}
              >
                <TabIcon width={42} height={42} />
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? theme.colors.primary : "#999",
                    marginTop: 4,
                    fontWeight: isActive ? "bold" : "normal",
                  }}
                >
                  {tab.id}
                </Text>
                {isActive && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: -10,
                      height: 3,
                      backgroundColor: theme.colors.primary,
                      width: "100%",
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
          Select address
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Button
            mode="outlined"
            style={{ flex: 1, borderRadius: 8 }}
            contentStyle={{ height: 32 }}
            labelStyle={{ fontSize: 10 }}
          >
            City ▼
          </Button>
          <Button
            mode="outlined"
            style={{ flex: 1, borderRadius: 8 }}
            contentStyle={{ height: 32 }}
            labelStyle={{ fontSize: 10 }}
          >
            Area ▼
          </Button>
          <Button
            mode="outlined"
            style={{ flex: 1, borderRadius: 8 }}
            contentStyle={{ height: 32 }}
            labelStyle={{ fontSize: 10 }}
          >
            Locality ▼
          </Button>
        </View>
        {MOCK_PLACES.map((place, i) => (
          <View
            key={place.id}
            style={{
              paddingTop: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: "#eee",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 13 }}>
              {place.name}
            </Text>
            <Text style={{ color: "#666", fontSize: 11, marginVertical: 4 }}>
              {place.address}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="phone"
                  size={12}
                  color={theme.colors.primary}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: theme.colors.primary,
                    marginLeft: 2,
                    marginRight: 8,
                  }}
                >
                  {place.phone}
                </Text>
                <Text style={{ fontSize: 11, color: "#ccc", marginRight: 8 }}>
                  |
                </Text>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={12}
                  color="#666"
                />
                <Text style={{ fontSize: 11, color: "#666", marginLeft: 2 }}>
                  {place.distance}
                </Text>
              </View>
              <Button mode="contained" compact style={{ borderRadius: 8 }}>
                Share
              </Button>
            </View>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [doctor, setDoctor] = useState<DocterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    patient_id,
    patientId: patientIdParam,
    appointmentId,
    doctor_id,
    doctorID:
 doctorIdParam,
  } = route.params as any;
  const patientId: string = patient_id ?? patientIdParam;
  const doctorID: string = doctor_id ?? doctorIdParam;
  console.log("ConsultationPage received patientId:", appointmentId, patientId,doctorID);

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails();
    } else {
      setLoading(false);
      Alert.alert("Error", "Patient ID is missing");
    }
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const data = await patientService.getPatientDetails(patientId);
      setPatient(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    
    if(doctorID){
      fetchDoctorDetails();

    } 
    else{
      setLoading(false);
      Alert.alert("Error", "Doctor ID is missing");
    }
    return;
    
  }, [doctorID]);	
	const fetchDoctorDetails = async () => {
	  try {
		setLoading(true);
		const data = await doctorService.getDoctorDetails(doctorID);
		setDoctor(data);
	  } catch (err: any) {
		Alert.alert("Error", err?.message ?? "Failed to load doctor details");
	  } finally {
		setLoading(false);
	  }	
	};
	
  
  
  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      Alert.alert("Info", "Please add some consultation notes");
      return;
    }
    setSaving(true);
    try {
      Alert.alert("Success", "Consultation notes saved successfully");
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to save consultation notes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: "#666" }}>
          Loading patient details…
        </Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color="#e53935"
        />
        <Text style={{ marginTop: 16, color: "#e53935", textAlign: "center" }}>
          Patient not found
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        >
          Go Back
        </Button>
      </View>
    );
  }

  const avatarUri = resolveAvatar(patient);

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
          <Avatar.Image
            size={42}
            source={{ uri: patient.avatar }}
            style={{ marginHorizontal: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
              {patient.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text variant="bodySmall" style={{ color: "#666", fontSize: 11 }}>
                {patient.age} yrs / {patient.gender} |{" "}
              </Text>
              <MaterialCommunityIcons
                name="phone"
                size={10}
                color="#666"
                style={{ marginHorizontal: 2 }}
              />
              <Text variant="bodySmall" style={{ color: "#666", fontSize: 11 }}>
                {patient.phone}
              </Text>
            </View>
          </View>
          <Button mode="contained" compact style={{ borderRadius: 20 }}>
            + Follow up
          </Button>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 0 && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(0)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 0 && {
                  color: theme.colors.primary,
                  fontWeight: "bold",
                },
              ]}
            >
              Info & Timeline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 1 && {
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(1)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 1 && {
                  color: theme.colors.primary,
                  fontWeight: "bold",
                },
              ]}
            >
              Vitals
            </Text>
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
                <Text
                  variant="titleMedium"
                  style={{
                    color: theme.colors.primary,
                    fontWeight: "bold",
                    marginBottom: 16,
                  }}
                >
                  Patient Details
                </Text>

                <View style={{ flexDirection: "row", marginBottom: 12 }}>
                  <View style={{ marginRight: 16 }}>
                    <Avatar.Image
                      size={70}
                      source={{ uri: patient.avatar }}
                      style={{ borderRadius: 8 }}
                    />
                  </View>
                  <View style={{ flex: 1, flexDirection: "row" }}>
                    <View style={{ flex: 1 }}>
                      <RowItem label="Name:" value={patient.name} />
                      <RowItem 
    label="Patient ID:" 
    value={patient.id} 
    numberOfLines={1} 
    ellipsizeMode="tail" 
  />
                      <RowItem
                        label="Age:"
                        value={patient.age ? `${patient.age} years` : "-"}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.colors.primary,
                            marginRight: 4,
                          }}
                        >
                          Phone:
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "500",
                            color: "#333",
                          }}
                        >
                          {patient.phone}
                        </Text>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={12}
                          color="green"
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                    </View>
                    <View
                      style={{
                        width: 1,
                        backgroundColor: "#e0e0e0",
                        marginHorizontal: 8,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <RowItem label="Gender:" value={patient.gender} />
                      <RowItem label="Blood:" value={patient.blood_group} />
                      <RowItem label="Height:" value={patient.height} />
                      <RowItem label="Weight:" value={patient.weight} />
                    </View>
                  </View>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View style={{ flexDirection: "row" }}>
                  <View style={{ flex: 1 }}>
                    <RowItem label="D.O.B:" value={patient.date_of_birth} />
                    <RowItem label="Marital:" value={patient.marital_status} />
                    <RowItem label="Email:" value={patient.email} />
                  </View>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: "#e0e0e0",
                      marginHorizontal: 8,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.primary }}>
                      Address:
                    </Text>
                    <Text style={{ fontSize: 10, lineHeight: 14 }}>
                      {patient.address}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: "#e0e0e0",
                      marginHorizontal: 8,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.primary }}>
                      Emergency Contact:
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "bold" }}>
                      {patient.emergency_contact.name}
                    </Text>
                    {/* <Text style={{ fontSize: 10, color: '#666' }}>({patient.emergency_contact.relation})</Text> */}
                    <Text style={{ fontSize: 10, color: "#666" }}>
                      {patient.emergency_contact.relation
                        ? `${patient.emergency_contact.relation} years`
                        : "-"}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#d32f2f" }}>
                      {patient.emergency_contact.number}
                    </Text>
                  </View>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View style={{ flexDirection: "row" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.primary }}>
                      Chronic diseases:
                    </Text>
                    {patient.chronic_diseases.map((d, i) => (
                      <Text key={i} style={{ fontSize: 10 }}>
                        {" "}
                        {d}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <RowItem label="Occupation:" value={patient.occupation} />
                    <RowItem label="Smoking:" value={patient.smoking_status} />
                    <RowItem
                      label="Alcohol:"
                      value={patient.alcohol_consumption}
                    />
                    <RowItem label="Diet:" value={patient.diet_type} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.primary }}>
                      Allergies:
                    </Text>
                    {patient.allergies.map((a, i) => (
                      <Text key={i} style={{ fontSize: 10 }}>
                        {" "}
                        {a}
                      </Text>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* NEW: Past Medical History Component */}
            <PastMedicalHistory />

            {/* Consultation Notes Emulator */}
            <Card
              style={[
                styles.card,
                { borderColor: theme.colors.primary, borderWidth: 1 },
              ]}
            >
              {/* Doctor Header Banner inside notes */}
              <View style={styles.notesHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {doctor?.name}, {doctor?.degree}
                  </Text>
                  <Text style={{ color: theme.colors.primary, fontSize: 10 }}>
                    {doctor?.specialization}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {doctor?.clinicName}
                  </Text>
                  <Text style={{ color: theme.colors.primary, fontSize: 10 }}>
                    {doctor?.clinicAddress}
                  </Text>
                </View>
              </View>
              <Divider />
              {/* Editor Toolbar Mock */}
              <View style={styles.editorToolbar}>
                <MaterialCommunityIcons
                  name="undo"
                  size={18}
                  color="#666"
                  style={{ marginHorizontal: 6 }}
                />
                <MaterialCommunityIcons
                  name="redo"
                  size={18}
                  color="#666"
                  style={{ marginHorizontal: 6 }}
                />
                <MaterialCommunityIcons
                  name="format-text"
                  size={18}
                  color="#666"
                  style={{ marginHorizontal: 6 }}
                />
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={18}
                  color="#666"
                  style={{ marginHorizontal: 6 }}
                />
                <MaterialCommunityIcons
                  name="microphone-outline"
                  size={18}
                  color="#666"
                  style={{ marginHorizontal: 6 }}
                />
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={18}
                  color="#666"
                  style={{ marginHorizontal: 6 }}
                />
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

            <Button
              mode="contained"
              style={{ marginHorizontal: 16, marginBottom: 32 }}
            >
              Save & Confirm Session
            </Button>
          </View>
        )}

        {activeTab === 1 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", marginBottom: 16 }}
              >
                Vitals History
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f0f0f0",
                }}
              >
                <Text style={{ color: "#666", fontWeight: "500" }}>
                  Heart Rate
                </Text>
                <Text style={{ fontWeight: "bold" }}>72 bpm</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f0f0f0",
                }}
              >
                <Text style={{ color: "#666", fontWeight: "500" }}>
                  Blood Pressure
                </Text>
                <Text style={{ fontWeight: "bold", color: "#d32f2f" }}>
                  140/90 mmHg
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#666", fontWeight: "500" }}>
                  Temperature
                </Text>
                <Text style={{ fontWeight: "bold" }}>98.6 Â°F</Text>
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
    backgroundColor: "#f5f7fa",
  },
  header: {
    paddingTop: 48,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    color: "#666",
  },
  content: {
    paddingTop: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  notesHeader: {
    backgroundColor: "#e0f2f1",
    padding: 12,
    flexDirection: "row",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  editorToolbar: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 160,
    padding: 12,
    fontSize: 14,
    color: "#333",
  },
  dicomModalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  dicomModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 36,
    paddingHorizontal: 8,
    backgroundColor: "#000",
  },
  dicomModalTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 12,
  },
  dicomModalBody: {
    flex: 1,
  },
});
