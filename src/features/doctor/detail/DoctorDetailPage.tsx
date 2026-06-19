import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import {
  AppButton,
  AppTypography,
  AppSkeleton,
  DateSlotPicker,
  AppBottomSheet,
} from "../../../components/common";
import {
  getDoctorById,
  getDoctorAvailability,
  SlotGroup,
} from "../doctorService";
import {
  AppointmentType,
  DoctorDetailData,
} from "../../../types/doctor-detail";
import { ROUTES } from "../../../navigation/routes";
import type { AppStackParamList } from "../../../navigation/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ----------------------------------------------------------------------
// Hospital Dropdown Component (kept as-is, retained for reference)
// ----------------------------------------------------------------------
interface HospitalItem {
  id: string;
  label: string;
  address?: string;
}

interface DoctorHospitalDropdownProps {
  hospitals: HospitalItem[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospitalId: string) => void;
  loading?: boolean;
}

type AppointmentModeKey = "clinic" | "video";

type AvailabilityAppointmentMode = "clinic_visit" | "video_call" | "offline" | "online";

interface AvailabilityApiSlot {
  start_time: string;
  end_time: string;
  status?: "AVAILABLE" | "BOOKED" | "UNAVAILABLE" | "BLOCKED" | "OCCUPIED" | "";
  is_enabled?: boolean;
  is_booked?: boolean;
  can_toggle?: boolean;
}

interface AvailabilityApiSession {
  label?: string;
  range?: string;
  period?: string;
  slots?: AvailabilityApiSlot[];
}

interface AvailabilityApiModeGroup {
  appointment_mode?: AvailabilityAppointmentMode;
  sessions?: AvailabilityApiSession[];
  label?: string;
  period?: string;
  range?: string;
  slots?: AvailabilityApiSlot[];
}

const PRIMARY = "#2B6F71";
const HEADER_BACKGROUND_HEIGHT = Platform.OS === "ios" ? 104 : 84;
const COMPACT_HEADER_HEIGHT = Platform.OS === "ios" ? 106 : 86;
const HEADER_COLLAPSE_START = 0;
const HEADER_COLLAPSE_END = 150;

const STAT_LOGOS = {
  experience: { uri: "https://img.icons8.com/ios-filled/50/2b7571/briefcase.png" },
  instagram: { uri: "https://img.icons8.com/ios-filled/50/2b7571/instagram-new.png" },
  facebook: { uri: "https://img.icons8.com/ios-filled/50/2b7571/facebook-new.png" },
  twitter: { uri: "https://img.icons8.com/ios-filled/50/2b7571/twitter.png" },
};

const emptyAvailabilityByMode: Record<AppointmentModeKey, SlotGroup[]> = {
  clinic: [],
  video: [],
};

const getModeKey = (mode?: string): AppointmentModeKey => {
  if (mode === "video_call" || mode === "online" || mode === "video") {
    return "video";
  }
  return "clinic";
};

const normalizeSlotStatus = (slot: AvailabilityApiSlot) => {
  if (slot.is_booked) return "BOOKED";
  if (slot.is_enabled === false) return "UNAVAILABLE";
  if (slot.status === "OCCUPIED") return "BOOKED";
  return slot.status || "AVAILABLE";
};

const normalizeAvailabilityByMode = (
  response: unknown
): Record<AppointmentModeKey, SlotGroup[]> => {
  const rawData = Array.isArray(response)
    ? response
    : Array.isArray((response as { data?: unknown })?.data)
      ? ((response as { data: AvailabilityApiModeGroup[] }).data)
      : [];

  const grouped: Record<AppointmentModeKey, SlotGroup[]> = {
    clinic: [],
    video: [],
  };

  rawData.forEach((item: AvailabilityApiModeGroup) => {
    const modeKey = getModeKey(item.appointment_mode);
    const sessions =
      Array.isArray(item.sessions) && item.sessions.length > 0
        ? item.sessions
        : [{ label: item.label, range: item.range, period: item.period, slots: item.slots }];

    const normalizedSessions = sessions
      .map((session, sessionIndex): SlotGroup => {
        const range = session.range || session.period || "";
        const label = session.label || `Session ${sessionIndex + 1}`;

        return {
          label: range ? `${label} (${range})` : label,
          period: range,
          slots: (session.slots || []).map((slot, slotIndex) => ({
            id: `${modeKey}-${label}-${slot.start_time}-${slotIndex}`,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: normalizeSlotStatus(slot),
            is_enabled: slot.is_enabled,
            can_toggle: slot.can_toggle,
          })),
        };
      })
      .filter((session) => session.slots.length > 0);

    grouped[modeKey] = [...grouped[modeKey], ...normalizedSessions];
  });

  return grouped;
};

function DoctorHospitalDropdown({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  loading = false,
}: DoctorHospitalDropdownProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<any>(null);

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  const openDropdown = () => {
    if (hospitals.length <= 1) return;
    buttonRef.current?.measure(
      (_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
        setDropdownPos({ top: py + height, left: px, width });
        setDropdownVisible(true);
      }
    );
  };

  const handleSelect = (item: HospitalItem) => {
    onSelectHospital(item.id);
    setDropdownVisible(false);
  };

  return (
    <>
      <Pressable ref={buttonRef} style={styles.selector} onPress={openDropdown}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#fff" />
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedHospital?.label || (loading ? "Loading..." : "Select Hospital")}
        </Text>
        {hospitals.length > 1 && (
          <Text style={styles.extraCount}>+{hospitals.length - 1}</Text>
        )}
        {hospitals.length > 1 && (
          <MaterialCommunityIcons name="chevron-down" size={18} color="#fff" />
        )}
      </Pressable>

      <Modal visible={dropdownVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          <View
            style={[
              styles.dropdownBox,
              { top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width },
            ]}
          >
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : (
              <FlatList
                data={hospitals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedHospitalId === item.id && { backgroundColor: `${PRIMARY}15` },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.dropdownTitle}>{item.label}</Text>
                    {!!item.address && (
                      <Text style={styles.dropdownAddress}>{item.address}</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ----------------------------------------------------------------------
// Professional Background section - mock data
// ----------------------------------------------------------------------
interface BackgroundListItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface AchievementItem {
  id: string;
  category: string;
  title: string;
  imageUrl: string;
  awardedOn: string;
  issuingOrganization: string;
  description: string;
}

const MOCK_SPECIALIZATIONS: BackgroundListItem[] = [
  { id: "spec-1", label: "Coronary Angioplasty" },
  { id: "spec-2", label: "Heart Failure" },
  { id: "spec-3", label: "Pacemaker Implantation" },
  { id: "spec-4", label: "Echocardiography" },
  { id: "spec-5", label: "Valvular Heart Disease" },
  { id: "spec-6", label: "Lipid Management" },
];

const MOCK_CERTIFICATIONS: BackgroundListItem[] = [
  { id: "cert-1", label: "Fellow of the American College of Cardiology (FACC)" },
  { id: "cert-2", label: "Cardiological Society of India (CSI) Lifetime Member" },
  { id: "cert-3", label: "Certified Heart Failure Specialist - ESC" },
  { id: "cert-4", label: "Advanced Cardiac Life Support (ACLS) Certified" },
];

const MOCK_MEMBERSHIPS: BackgroundListItem[] = [
  { id: "mem-1", label: "Member of the Cardiological Society of India (CSI)" },
  { id: "mem-2", label: "Member of the Indian Medical Association (IMA)" },
  { id: "mem-3", label: "Fellow of the American Heart Association (AHA)" },
];

const MOCK_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: "ach-1",
    category: "Award",
    title: "Excellence in Interventional Cardiology Award 2024",
    imageUrl: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=600&q=80",
    awardedOn: "15 March 2024",
    issuingOrganization: "Indian Cardiology Association (ICA)",
    description:
      "This award is presented to cardiologists who have demonstrated outstanding expertise, leadership, and innovation in interventional cardiology. It recognizes meaningful contributions to improving patient outcomes, advancing minimally invasive cardiac procedures, and setting high standards for clinical excellence.",
  },
  {
    id: "ach-2",
    category: "Recognition",
    title: "Best Cardiologist Recognition by Medical Association",
    imageUrl: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?w=600&q=80",
    awardedOn: "22 January 2024",
    issuingOrganization: "National Medical Association",
    description:
      "Recognized for consistent excellence in cardiac care, patient communication, and clinical outcomes across complex cardiology cases.",
  },
  {
    id: "ach-3",
    category: "Conference",
    title: "International Cardiology Conference Speaker",
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
    awardedOn: "08 November 2023",
    issuingOrganization: "Global Heart Summit",
    description:
      "Invited as a speaker to present clinical insights on contemporary interventional cardiology practices, emerging technologies, and multidisciplinary cardiac care.",
  },
  {
    id: "ach-4",
    category: "Research",
    title: "Published Research on Advanced Heart Failure Management",
    imageUrl: "https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=600&q=80",
    awardedOn: "17 August 2023",
    issuingOrganization: "Journal of Cardiac Medicine",
    description:
      "Published peer-reviewed research focused on improving treatment pathways for advanced heart failure management, with emphasis on early diagnosis, medication optimization, and long-term patient monitoring.",
  },
  {
    id: "ach-5",
    category: "Fellowship",
    title: "Advanced Cardiac Care Fellowship",
    imageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&q=80",
    awardedOn: "03 May 2022",
    issuingOrganization: "International College of Cardiology",
    description:
      "Completed an advanced fellowship program focused on high-risk cardiac interventions, complex case planning, and evidence-based cardiac care delivery.",
  },
];

interface BackgroundSubsectionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  items: BackgroundListItem[];
  emptyText?: string;
}

function BackgroundSubsection({ icon, title, items, emptyText }: BackgroundSubsectionProps) {
  return (
    <View style={styles.backgroundSection}>
      <View style={styles.backgroundSectionHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={PRIMARY} />
        <AppTypography variant="body" style={styles.backgroundSectionTitle}>
          {title}
        </AppTypography>
      </View>
      {items.length > 0 ? (
        items.map((item) => (
          <View key={item.id} style={styles.backgroundListItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={14}
              color={PRIMARY}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppTypography variant="caption" style={styles.backgroundItemLabel}>
                {item.label}
              </AppTypography>
              {!!item.sublabel && (
                <AppTypography variant="caption" style={styles.backgroundItemSublabel}>
                  {item.sublabel}
                </AppTypography>
              )}
            </View>
          </View>
        ))
      ) : emptyText ? (
        <AppTypography variant="caption" style={styles.backgroundEmptyText}>
          {emptyText}
        </AppTypography>
      ) : null}
    </View>
  );
}

interface AchievementsSubsectionProps {
  achievements: AchievementItem[];
  onAchievementPress: (achievement: AchievementItem) => void;
}

function AchievementsSubsection({
  achievements,
  onAchievementPress,
}: AchievementsSubsectionProps) {
  return (
    <View style={styles.achievementsSection}>
      <View style={styles.achievementsHeader}>
        <MaterialCommunityIcons name="trophy-outline" size={18} color={PRIMARY} />
        <AppTypography variant="body" style={styles.backgroundSectionTitle}>
          Achievements
        </AppTypography>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsScrollContent}
      >
        {achievements.map((achievement) => (
          <TouchableOpacity
            key={achievement.id}
            style={styles.achievementCard}
            activeOpacity={0.86}
            onPress={() => onAchievementPress(achievement)}
          >
            <Image
              source={{ uri: achievement.imageUrl }}
              style={styles.achievementImage}
              resizeMode="cover"
            />
            <View style={styles.achievementContent}>
              <AppTypography variant="caption" style={styles.achievementCategory}>
                {achievement.category}
              </AppTypography>
              <AppTypography variant="body" style={styles.achievementTitle} numberOfLines={3}>
                {achievement.title}
              </AppTypography>
              <AppTypography
                variant="caption"
                style={styles.achievementSummary}
                numberOfLines={3}
              >
                {achievement.description}
              </AppTypography>
              <View style={styles.achievementViewMoreRow}>
                <Text style={styles.achievementViewMoreText}>View More</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={PRIMARY} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------------------------
// Expandable Hospital / Clinic Card
// ----------------------------------------------------------------------
interface HospitalEntry {
  hospital: {
    id: string;
    name: string;
    address?: string;
    distance?: string;
  };
  is_primary?: boolean;
  offline_consultation_fee?: string | number;
  video_consultation_fee?: string | number;
}

interface HospitalAppointmentCardProps {
  entry: HospitalEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  apptType: "offline" | "video" | null;
  onAppointmentTypeChange: (type: AppointmentModeKey) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedTime: string | null;
  onTimeChange: (time: string) => void;
  availableSlots: SlotGroup[];
  slotsLoading: boolean;
  selectedAppointmentType: AppointmentModeKey;
}

function HospitalAppointmentCard({
  entry,
  isExpanded,
  onToggleExpand,
  apptType,
  onAppointmentTypeChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  availableSlots,
  slotsLoading,
  selectedAppointmentType,
}: HospitalAppointmentCardProps) {
  const { width } = useWindowDimensions();
  const { hospital, is_primary, offline_consultation_fee, video_consultation_fee } = entry;
  const datePickerHorizontalOffset = width >= 768 ? -20 : -16;

  const fee =
    apptType === "video"
      ? Number(video_consultation_fee) || 0
      : Number(offline_consultation_fee) || 0;

  // Derive a simple working-hours display for the collapsed/expanded header.
  // Falls back to a generic range if not provided by data.
  const timeRange = "09:00 AM - 10:30 PM";

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleExpand();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleToggle}
      style={[styles.hospitalCard, isExpanded && styles.hospitalCardExpanded]}
    >
      {/* Header row - always visible */}
      <View style={styles.hospitalCardHeader}>
        <Image
          source={{ uri: "https://via.placeholder.com/80" }}
          style={styles.hospitalImage}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppTypography variant="body" style={styles.hospitalName} numberOfLines={1}>
              {hospital.name}
            </AppTypography>
            {is_primary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
              </View>
            )}
          </View>
          {!!hospital.address && (
            <AppTypography variant="caption" style={styles.greyText} numberOfLines={1}>
              {hospital.address}
            </AppTypography>
          )}
          {!!hospital.distance && (
            <AppTypography variant="caption" style={styles.distanceText}>
              {hospital.distance} away
            </AppTypography>
          )}
          <View style={styles.feeTimeRow}>
            <AppTypography variant="caption" style={styles.feeText}>
              ₹{Number(offline_consultation_fee) || 0} Fee
            </AppTypography>
            <AppTypography variant="caption" style={styles.greyText}>
              {timeRange}
            </AppTypography>
          </View>
        </View>
        <MaterialCommunityIcons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#999"
        />
      </View>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* 1. Select Appointment Type */}
          <AppTypography variant="caption" style={styles.expandedSectionLabel}>
            1. SELECT APPOINTMENT TYPE
          </AppTypography>
          <View style={styles.apptTypeRow}>
            <TouchableOpacity
              style={[
                styles.apptTypeButton,
                selectedAppointmentType === "clinic" && styles.apptTypeButtonSelected,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onAppointmentTypeChange("clinic");
              }}
            >
              <MaterialCommunityIcons
                name="account"
                size={16}
                color={selectedAppointmentType === "clinic" ? PRIMARY : "#888"}
              />
              <Text
                style={[
                  styles.apptTypeText,
                  selectedAppointmentType === "clinic" && styles.apptTypeTextSelected,
                ]}
              >
                In-Clinic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.apptTypeButton,
                selectedAppointmentType === "video" && styles.apptTypeButtonSelected,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onAppointmentTypeChange("video");
              }}
            >
              <MaterialCommunityIcons
                name="video-outline"
                size={16}
                color={selectedAppointmentType === "video" ? PRIMARY : "#888"}
              />
              <Text
                style={[
                  styles.apptTypeText,
                  selectedAppointmentType === "video" && styles.apptTypeTextSelected,
                ]}
              >
                Video
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2. Select Date + Slots - delegated to DateSlotPicker */}
          <AppTypography
            variant="caption"
            style={[styles.expandedSectionLabel, { marginTop: 16 }]}
          >
            2. SELECT DATE
          </AppTypography>

          <View
            style={{ marginHorizontal: datePickerHorizontalOffset }}
            onStartShouldSetResponder={() => true}
          >
            <DateSlotPicker
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              selectedTime={selectedTime}
              onTimeChange={onTimeChange}
              availableSlots={availableSlots}
              loading={slotsLoading}
              selectedAppointmentType={selectedAppointmentType}
              onAppointmentTypeChange={onAppointmentTypeChange}
              hideHeader
            />
          </View>

          {/* Action buttons */}
          <View style={styles.expandedActionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: open maps / directions to hospital
              }}
            >
              <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={PRIMARY} />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: trigger call to hospital
              }}
            >
              <MaterialCommunityIcons name="phone-outline" size={18} color={PRIMARY} />
              <Text style={styles.actionButtonText}>Call Hospital</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ----------------------------------------------------------------------
// Main Doctor Detail Page
// ----------------------------------------------------------------------
export default function DoctorDetailPage() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_DETAIL>>();
  const { width } = useWindowDimensions();

  const [doctor, setDoctor] = useState<DoctorDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [apptType, setApptType] = useState<"offline" | "video" | null>("offline");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Tracks which hospital card is expanded inline (null = none expanded)
  const [expandedHospitalId, setExpandedHospitalId] = useState<string | null>(null);

  // About section "Read More" toggle
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Professional Background "View More" toggle
  const [backgroundExpanded, setBackgroundExpanded] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  const [availableSlotsByMode, setAvailableSlotsByMode] =
    useState<Record<AppointmentModeKey, SlotGroup[]>>(emptyAvailabilityByMode);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeForApi = (timeLabel: string) => {
    const trimmed = timeLabel.trim().toUpperCase();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
    if (!match) return timeLabel;
    const [, hText, mText, suffix] = match;
    let hour = Number.parseInt(hText, 10);
    if (suffix === "PM" && hour !== 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${mText}`;
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!route.params?.id) return;
      try {
        const res = await getDoctorById(route.params.id);
        if (res.success && res.data) {
          setDoctor(res.data);
          if (res.data.hospitals?.length > 0) {
            const primary =
              res.data.hospitals.find((h) => h.is_primary) || res.data.hospitals[0];
            setSelectedHospital(primary.hospital.id);
            // Auto-expand the primary hospital card by default
            setExpandedHospitalId(primary.hospital.id);
          }
        }
      } catch (error) {
        console.error("Error fetching doctor details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [route.params?.id]);

  useEffect(() => {
    const id = route.params?.id;
    if (!id || !selectedHospital || !selectedDate) return;
    let active = true;

    const fetchAvailability = async () => {
      try {
        setSlotsLoading(true);
        const res = await getDoctorAvailability({
          doctor_id: id,
          hospital_id: selectedHospital,
          date: formatDateForApi(selectedDate),
        });
        if (!active) return;
        setAvailableSlotsByMode(normalizeAvailabilityByMode(res));
      } catch (err) {
        if (!active) return;
        setAvailableSlotsByMode(emptyAvailabilityByMode);
      } finally {
        if (active) {
          setSlotsLoading(false);
        }
      }
    };

    fetchAvailability();
    return () => {
      active = false;
    };
  }, [route.params?.id, selectedHospital, selectedDate]);

  const primaryHospital =
    doctor?.hospitals.find((h) => h.is_primary) ||
    (doctor?.hospitals.length ? doctor.hospitals[0] : null);

  const selectedHospitalEntry =
    doctor?.hospitals.find((h) => h.hospital.id === selectedHospital) ||
    primaryHospital;

  const selectedAppointmentType: AppointmentModeKey =
    apptType === "video" ? "video" : "clinic";

  const visibleSlotGroups = availableSlotsByMode[selectedAppointmentType] || [];

  const handleAppointmentTypeChange = (type: AppointmentModeKey) => {
    setApptType(type === "clinic" ? "offline" : "video");
    setSelectedTime(null);
  };

  const getSelectedFee = () => {
    if (apptType === "offline") {
      return Number(selectedHospitalEntry?.offline_consultation_fee) || 0;
    } else {
      return Number(selectedHospitalEntry?.video_consultation_fee) || 0;
    }
  };

  // Toggle which hospital card is expanded; switching expands the new
  // hospital, sets it as the booking target, and resets slot selection.
  const handleToggleExpand = (hospitalId: string) => {
    const isCurrentlyExpanded = expandedHospitalId === hospitalId;
    setExpandedHospitalId(isCurrentlyExpanded ? null : hospitalId);

    if (!isCurrentlyExpanded) {
      setSelectedHospital(hospitalId);
      setSelectedTime(null);
    }
  };

  const handleToggleBackground = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBackgroundExpanded((prev) => !prev);
  };

  const handleToggleAbout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAboutExpanded((prev) => !prev);
  };

  const handleCloseAchievementSheet = () => {
    setSelectedAchievement(null);
  };

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
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <AppTypography>Doctor not found</AppTypography>
        <AppButton variant="text" onPress={() => navigation.goBack()}>
          Go Back
        </AppButton>
      </View>
    );
  }

  const { details, specialities, hospitals } = doctor;
  const isTablet = width >= 768;

  const educationItems: BackgroundListItem[] =
    details?.degrees?.map((deg, idx) => ({
      id: String(deg.id ?? idx),
      label: deg.degree,
      sublabel: deg.college
        ? `${deg.college}${deg.year_of_passing ? `, ${deg.year_of_passing}` : ""}`
        : undefined,
    })) ?? [];
  const detailRecord = (details || {}) as Record<string, unknown>;
  const avatarValue =
    detailRecord.avatar_s3_key ||
    detailRecord.avatar ||
    detailRecord.profile_image ||
    detailRecord.profile_image_url;
  const avatarUrl =
    typeof avatarValue === "string" && avatarValue.trim()
      ? avatarValue
      : "https://via.placeholder.com/600x440";
  const socialDetails = detailRecord;
  const qualificationText =
    details?.degrees
      ?.map((degree) => degree.degree)
      .filter(Boolean)
      .join(", ") ||
    details?.degree ||
    "Qualifications not available";
  const experienceText =
    details?.experience_years != null
      ? `${details.experience_years}+ Years`
      : "-- Years";
  const socialLinks = [
    {
      key: "facebook",
      logo: STAT_LOGOS.facebook,
      url: socialDetails.facebook_url || socialDetails.facebook,
    },
    {
      key: "twitter",
      logo: STAT_LOGOS.twitter,
      url: socialDetails.twitter_url || socialDetails.twitter,
    },
    {
      key: "instagram",
      logo: STAT_LOGOS.instagram,
      url: socialDetails.instagram_url || socialDetails.instagram,
    },
  ];

  const openSocialLink = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;

    const url = /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`;
    Linking.openURL(url).catch((error) => {
      console.warn("[DoctorDetailPage] Unable to open social link:", error);
    });
  };

  const aboutText =
    details?.about ||
    "Dr. Anjali Singh is a highly skilled Interventional Cardiologist with over 14 years of experience in managing complex cardiac conditions. She has extensive expertise in coronary angioplasty, heart failure management, and pacemaker implantation, and is committed to providing compassionate, evidence-based care to every patient.";

  const compactSpeciality = specialities?.[0] || "Doctor Consultation";

  const appointmentTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_COLLAPSE_START, HEADER_COLLAPSE_END],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [HEADER_COLLAPSE_START, HEADER_COLLAPSE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const compactHeaderTranslateY = scrollY.interpolate({
    inputRange: [HEADER_COLLAPSE_START, HEADER_COLLAPSE_END],
    outputRange: [6, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Header Gradient / Background Placeholder */}
        <View style={styles.headerBackground}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <Animated.View style={{ opacity: appointmentTitleOpacity }}>
                <AppTypography variant="h3" style={styles.headerTitle}>
                  Appointment
                </AppTypography>
              </Animated.View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconButton}>
                <MaterialCommunityIcons name="heart-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconButton}>
                <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Overhead Profile Card */}
        <View style={[styles.profileCard, isTablet && styles.profileCardTablet]}>
          <Image
            source={{ uri: avatarUrl }}
            style={[
              styles.profileHeroImage,
              { height: isTablet ? 190 : 125 },
            ]}
            resizeMode="contain"
          />

          <View style={styles.profileContent}>
            <AppTypography variant="h3" style={styles.doctorName} numberOfLines={1}>
              {doctor.name}
            </AppTypography>

            <AppTypography variant="body" style={styles.doctorSpec} numberOfLines={1}>
              {specialities?.[0] || "Doctor Consultation"}
            </AppTypography>

            <AppTypography variant="caption" style={styles.qualificationText} numberOfLines={1}>
              {qualificationText}
            </AppTypography>

            <View style={styles.profileFooterRow}>
              <View style={styles.experienceBadge}>
                <AppTypography variant="caption" style={styles.experienceLabel}>
                  EXP:
                </AppTypography>
                <AppTypography variant="caption" style={styles.experienceValue}>
                  {experienceText}
                </AppTypography>
              </View>

              <View style={styles.socialRow}>
                {socialLinks.map((item) => {
                  const hasUrl = typeof item.url === "string" && item.url.trim().length > 0;

                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.socialButton}
                      activeOpacity={0.75}
                      disabled={!hasUrl}
                      onPress={() => openSocialLink(item.url)}
                    >
                      <Image source={item.logo} style={styles.socialIcon} resizeMode="contain" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

     

        {/* Clinic & Appointment Section - expandable hospital cards */}
        <View style={styles.section}>
          <AppTypography variant="h4" style={styles.sectionTitle}>
            Clinic &amp; Appointment
          </AppTypography>

          {hospitals.length > 0 ? (
            hospitals.map((entry) => (
              <HospitalAppointmentCard
                key={entry.hospital.id}
                entry={entry as HospitalEntry}
                isExpanded={expandedHospitalId === entry.hospital.id}
                onToggleExpand={() => handleToggleExpand(entry.hospital.id)}
                apptType={apptType}
                onAppointmentTypeChange={handleAppointmentTypeChange}
                selectedDate={selectedDate}
                onDateChange={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                selectedTime={selectedTime}
                onTimeChange={setSelectedTime}
                availableSlots={
                  expandedHospitalId === entry.hospital.id ? visibleSlotGroups : []
                }
                slotsLoading={expandedHospitalId === entry.hospital.id ? slotsLoading : false}
                selectedAppointmentType={selectedAppointmentType}
              />
            ))
          ) : (
            <AppTypography variant="caption" style={styles.greyText}>
              No hospitals available for this doctor
            </AppTypography>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <AppTypography variant="h4" style={styles.sectionTitle}>
            Location
          </AppTypography>

          <View style={styles.locationMapCard}>
            <View style={styles.mapGridLineHorizontal} />
            <View style={[styles.mapGridLineHorizontal, { top: 76 }]} />
            <View style={[styles.mapGridLineHorizontal, { top: 124 }]} />
            <View style={styles.mapGridLineVertical} />
            <View style={[styles.mapGridLineVertical, { left: "68%" }]} />
            <View style={styles.mapRouteLine} />
            <View style={styles.mapPin}>
              <MaterialCommunityIcons name="map-marker" size={22} color="#fff" />
            </View>

            <View style={styles.locationOverlayCard}>
              <View style={styles.locationOverlayHeader}>
                <View style={styles.locationIconBox}>
                  <MaterialCommunityIcons name="hospital-building" size={18} color={PRIMARY} />
                </View>
                <View style={styles.locationInfo}>
                  <AppTypography variant="body" style={styles.locationHospitalName} numberOfLines={1}>
                    {selectedHospitalEntry?.hospital.name || "Hospital"}
                  </AppTypography>
                  <AppTypography variant="caption" style={styles.locationHospitalAddress} numberOfLines={2}>
                    {selectedHospitalEntry?.hospital.address || details?.location || "Address not available"}
                  </AppTypography>
                </View>
              </View>

              <TouchableOpacity style={styles.getDirectionsButton} activeOpacity={0.85}>
                <MaterialCommunityIcons name="navigation-variant" size={18} color="#fff" />
                <Text style={styles.getDirectionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* About the Doctor */}
        <View style={styles.section}>
          <AppTypography variant="h4" style={styles.sectionTitle}>
            About the Doctor
          </AppTypography>

          {/* <View style={styles.aboutProfileHeader}>
            <Image source={{ uri: avatarUrl }} style={styles.aboutProfileImage} />
            <View style={styles.aboutProfileInfo}>
              <View style={styles.aboutProfileNameRow}>
                <AppTypography variant="h3" style={styles.aboutProfileName} numberOfLines={1}>
                  {doctor.name}
                </AppTypography>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={16}
                  color={PRIMARY}
                  style={{ marginLeft: 6 }}
                />
              </View>
              <AppTypography variant="caption" style={styles.aboutProfileSpec} numberOfLines={1}>
                {specialities?.[0] || "Doctor Consultation"}
              </AppTypography>
              <View style={styles.aboutCouncilVerifiedBadge}>
                <MaterialCommunityIcons name="shield-check-outline" size={13} color={PRIMARY} />
                <Text style={styles.councilVerifiedText}>COUNCIL VERIFIED</Text>
              </View>
            </View>
          </View> */}

          <View style={styles.aboutCard}>
            <AppTypography variant="caption" style={styles.aboutCardTitle}>
              About
            </AppTypography>
            <AppTypography
              variant="caption"
              style={styles.aboutBodyText}
              numberOfLines={aboutExpanded ? undefined : 3}
            >
              {aboutText}
            </AppTypography>
            <TouchableOpacity onPress={handleToggleAbout} activeOpacity={0.7}>
              <AppTypography variant="caption" style={styles.readMoreText}>
                {aboutExpanded ? "Show Less" : "Read More"}
              </AppTypography>
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Background */}
        <View style={styles.section}>
          <View
            style={styles.professionalCard}
          >
            <View style={styles.professionalCardHeader}>
              <View style={styles.professionalIconBox}>
                <MaterialCommunityIcons name="briefcase-outline" size={18} color={PRIMARY} />
              </View>
              <AppTypography variant="body" style={styles.professionalCardTitle}>
                Professional Background
              </AppTypography>
            </View>

            <AppTypography variant="caption" style={styles.professionalCardSubtitle}>
              Explore the doctor's qualifications, experience, certifications, and professional
              affiliations.
            </AppTypography>

            <TouchableOpacity
              style={styles.viewMoreRow}
              activeOpacity={0.75}
              onPress={handleToggleBackground}
            >
              <AppTypography variant="caption" style={styles.readMoreText}>
                {backgroundExpanded ? "View Less" : "View More"}
              </AppTypography>
              <MaterialCommunityIcons
                name={backgroundExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={PRIMARY}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            {/* Expanded Professional Background content */}
            {backgroundExpanded && (
              <View style={styles.professionalExpandedContainer}>
                <BackgroundSubsection
                  icon="school-outline"
                  title="Education"
                  items={educationItems}
                  emptyText="No educational qualifications available"
                />
                <BackgroundSubsection
                  icon="stethoscope"
                  title="Specializations"
                  items={MOCK_SPECIALIZATIONS}
                />
                <BackgroundSubsection
                  icon="certificate-outline"
                  title="Certifications"
                  items={MOCK_CERTIFICATIONS}
                />
                <BackgroundSubsection
                  icon="account-group-outline"
                  title="Memberships"
                  items={MOCK_MEMBERSHIPS}
                />
              </View>
            )}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <AchievementsSubsection
            achievements={MOCK_ACHIEVEMENTS}
            onAchievementPress={setSelectedAchievement}
          />
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.compactHeaderOverlay,
          {
            opacity: compactHeaderOpacity,
            transform: [{ translateY: compactHeaderTranslateY }],
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>

        <Image
          source={{ uri: avatarUrl }}
          style={styles.compactDoctorAvatar}
          resizeMode="cover"
        />

        <View style={styles.compactHeaderText}>
          <AppTypography variant="h3" style={styles.compactDoctorName} numberOfLines={1}>
            {doctor.name}
          </AppTypography>
          <AppTypography
            variant="caption"
            style={styles.compactDoctorSpeciality}
            numberOfLines={1}
          >
            {compactSpeciality}
          </AppTypography>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton}>
            <MaterialCommunityIcons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <AppBottomSheet
        visible={!!selectedAchievement}
        title="Achievement Details"
        onClose={handleCloseAchievementSheet}
        maxHeightRatio={0.9}
      >
        {selectedAchievement ? (
          <View style={styles.achievementDetailsContent}>
            <Image
              source={{ uri: selectedAchievement.imageUrl }}
              style={styles.achievementDetailsImage}
              resizeMode="cover"
            />

            <AppTypography variant="h3" style={styles.achievementDetailsTitle}>
              {selectedAchievement.title}
            </AppTypography>

            <View style={styles.achievementDetailsSection}>
              <View style={styles.achievementDetailsIconBox}>
                <MaterialCommunityIcons name="calendar-month-outline" size={18} color={PRIMARY} />
              </View>
              <View style={styles.achievementDetailsTextBlock}>
                <AppTypography variant="caption" style={styles.achievementDetailsLabel}>
                  Awarded On
                </AppTypography>
                <AppTypography variant="caption" style={styles.achievementDetailsValue}>
                  {selectedAchievement.awardedOn}
                </AppTypography>
              </View>
            </View>

            <View style={styles.achievementDetailsSection}>
              <View style={styles.achievementDetailsIconBox}>
                <MaterialCommunityIcons name="bank-outline" size={18} color={PRIMARY} />
              </View>
              <View style={styles.achievementDetailsTextBlock}>
                <AppTypography variant="caption" style={styles.achievementDetailsLabel}>
                  Issuing Organization
                </AppTypography>
                <AppTypography variant="caption" style={styles.achievementDetailsValue}>
                  {selectedAchievement.issuingOrganization}
                </AppTypography>
              </View>
            </View>

            <View style={[styles.achievementDetailsSection, styles.achievementDetailsSectionLast]}>
              <View style={styles.achievementDetailsIconBox}>
                <MaterialCommunityIcons name="text-box-outline" size={18} color={PRIMARY} />
              </View>
              <View style={styles.achievementDetailsTextBlock}>
                <AppTypography variant="caption" style={styles.achievementDetailsLabel}>
                  Description
                </AppTypography>
                <AppTypography variant="caption" style={styles.achievementDetailsDescription}>
                  {selectedAchievement.description}
                </AppTypography>
              </View>
            </View>
          </View>
        ) : null}
      </AppBottomSheet>

      {/* Bottom Sticky Button */}
      <View style={styles.bottomBar}>
        <AppButton
          variant="primary"
          style={styles.bookButton}
          loading={booking}
          disabled={!selectedTime || !selectedHospital}
          onPress={async () => {
            if (!doctor || !selectedTime || !selectedHospital) return;

            const targetHospitalEntry = doctor?.hospitals.find(
              (h) => h.hospital.id === selectedHospital
            );
            const fee = getSelectedFee();
            const formattedDate = formatDateForApi(selectedDate);
            const formattedTime = formatTimeForApi(selectedTime);

            navigation.navigate(ROUTES.STACK.CONSENT_FORM, {
              paymentParams: {
                doctor: doctor,
                hospitalId: selectedHospital,
                hospitalName: targetHospitalEntry?.hospital.name || "",
                appointmentDate: formattedDate,
                appointmentDateDisplay: selectedDate.toDateString(),
                startTime: formattedTime,
                startTimeDisplay: selectedTime,
                appointmentMode: apptType === "offline" ? "offline" : "online",
                consultationTypeLabel: apptType === "offline" ? "Clinic Visit" : "Video Call",
                fee: fee,
              },
            });
          }}
        >
          {selectedTime ? `Book at ${selectedTime}` : "Select a Time Slot"}
        </AppButton>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  scrollArea: { flex: 1 },
  headerBackground: {
    backgroundColor: "#568b8b",
    height: HEADER_BACKGROUND_HEIGHT,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    marginLeft: 8,
  },
  compactHeaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: COMPACT_HEADER_HEIGHT,
    zIndex: 20,
    elevation: 12,
    backgroundColor: "#568b8b",
    paddingTop: Platform.OS === "ios" ? 44 : 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  compactHeaderText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  compactDoctorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#dfecec",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  compactDoctorName: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
  },
  compactDoctorSpeciality: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileCardTablet: {
    width: "78%",
    maxWidth: 560,
    alignSelf: "center",
  },
  profileHeroImage: {
    width: "100%",
    backgroundColor: "#dfecec",
  },
  profileContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  doctorName: {
    fontWeight: "500",
    color: "#050c14",
    fontSize: 20,
    lineHeight: 24,
  },
  doctorSpec: {
    color: PRIMARY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 1,
  },
  qualificationText: {
    color: "#6f7378",
    fontSize: 13,
    lineHeight: 17,
    marginTop: 1,
  },
  profileFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  experienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f5f6",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    minHeight: 28,
  },
  experienceLabel: {
    color: "#9ba1a6",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    marginRight: 5,
  },
  experienceValue: {
    color: PRIMARY,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#eef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: {
    width: 15,
    height: 15,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  locationText: { color: "#888", marginLeft: 4, flex: 1 },
  distanceText: { color: "#2b7571", fontWeight: "bold" },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    paddingHorizontal: 4,
  },
  statsDivider: { width: 1, backgroundColor: "#edf1f1", marginHorizontal: 6 },
  statLogo: { width: 22, height: 22, marginBottom: 8 },
  statTitle: {
    maxWidth: "100%",
    fontWeight: "700",
    color: "#111111",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  statSubtitle: {
    maxWidth: "100%",
    color: "#7a7a7a",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 2,
  },
  councilVerifiedRow: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  councilVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${PRIMARY}12`,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  councilVerifiedText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  section: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { color: "#333", fontWeight: "bold", marginBottom: 8 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginHorizontal: 16 },
  greyText: { color: "#888" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  bookButton: { backgroundColor: "#2b7571", borderRadius: 8, paddingVertical: 6 },

  // ----------------------------------------------------------------
  // About the Doctor card
  // ----------------------------------------------------------------
  aboutProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aboutProfileImage: {
    width: 82,
    height: 82,
    borderRadius: 14,
    backgroundColor: "#eee",
    marginRight: 14,
  },
  aboutProfileInfo: {
    flex: 1,
    minWidth: 0,
  },
  aboutProfileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  aboutProfileName: {
    color: "#111",
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
  },
  aboutProfileSpec: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  aboutCouncilVerifiedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${PRIMARY}12`,
    borderWidth: 1,
    borderColor: `${PRIMARY}30`,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 8,
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eef1f1",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  aboutCardTitle: {
    color: "#333",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 6,
  },
  aboutBodyText: {
    color: "#666",
    lineHeight: 18,
  },
  readMoreText: {
    color: PRIMARY,
    fontWeight: "700",
    marginTop: 8,
  },

  // ----------------------------------------------------------------
  // Professional Background card
  // ----------------------------------------------------------------
  professionalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eef1f1",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  professionalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  professionalIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: `${PRIMARY}15`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  professionalCardTitle: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
  },
  professionalCardSubtitle: {
    color: "#888",
    lineHeight: 18,
  },
  viewMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  professionalExpandedContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eef1f1",
  },
  backgroundSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f4f4",
  },
  backgroundSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backgroundSectionTitle: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
    marginLeft: 8,
  },
  backgroundListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  backgroundItemLabel: {
    color: "#444",
    fontWeight: "600",
  },
  backgroundItemSublabel: {
    color: "#999",
    marginTop: 2,
  },
  backgroundEmptyText: {
    color: "#999",
    fontStyle: "italic",
    lineHeight: 18,
  },
  achievementsSection: {
    paddingVertical: 2,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  achievementsScrollContent: {
    paddingTop: 2,
    paddingBottom: 6,
    paddingRight: 6,
  },
  achievementCard: {
    width: 210,
    minHeight: 286,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eef1f1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  achievementImage: {
    width: "100%",
    height: 112,
    backgroundColor: "#edf3f3",
  },
  achievementContent: {
    flex: 1,
    padding: 12,
  },
  achievementCategory: {
    color: PRIMARY,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  achievementTitle: {
    color: "#111",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  achievementSummary: {
    color: "#666",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  achievementViewMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  achievementViewMoreText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "800",
  },
  achievementDetailsContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 34,
  },
  achievementDetailsImage: {
    width: "100%",
    aspectRatio: 1.75,
    borderRadius: 14,
    backgroundColor: "#edf3f3",
    marginBottom: 16,
  },
  achievementDetailsTitle: {
    color: "#111",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "800",
    marginBottom: 14,
  },
  achievementDetailsSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#eef1f1",
  },
  achievementDetailsSectionLast: {
    paddingBottom: 4,
  },
  achievementDetailsIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${PRIMARY}12`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  achievementDetailsTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  achievementDetailsLabel: {
    color: "#333",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  achievementDetailsValue: {
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
  },
  achievementDetailsDescription: {
    color: "#555",
    fontSize: 13,
    lineHeight: 20,
  },

  // ----------------------------------------------------------------
  // Hospital appointment card (collapsed + expanded states)
  // ----------------------------------------------------------------
  hospitalCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 12,
    overflow: "hidden",
  },
  hospitalCardExpanded: {
    borderColor: PRIMARY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  hospitalCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hospitalImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  hospitalName: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
    marginRight: 8,
  },
  primaryBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  feeTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  feeText: {
    color: "#333",
    fontWeight: "600",
  },

  // Expanded content
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  expandedSectionLabel: {
    color: "#999",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  apptTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  apptTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  apptTypeButtonSelected: {
    borderColor: PRIMARY,
    backgroundColor: `${PRIMARY}10`,
  },
  apptTypeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  apptTypeTextSelected: {
    color: PRIMARY,
  },
  expandedActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    marginLeft: 6,
    color: PRIMARY,
    fontWeight: "600",
    fontSize: 13,
  },

  // ----------------------------------------------------------------
  // Location map card
  // ----------------------------------------------------------------
  locationMapCard: {
    minHeight: 230,
    borderRadius: 14,
    backgroundColor: "#e7f1f1",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dceaea",
    position: "relative",
    justifyContent: "flex-end",
    padding: 14,
  },
  mapGridLineHorizontal: {
    position: "absolute",
    left: -20,
    right: -20,
    top: 34,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    transform: [{ rotate: "-8deg" }],
  },
  mapGridLineVertical: {
    position: "absolute",
    top: -20,
    bottom: -20,
    left: "35%",
    width: 14,
    backgroundColor: "rgba(255,255,255,0.68)",
    transform: [{ rotate: "18deg" }],
  },
  mapRouteLine: {
    position: "absolute",
    left: 20,
    right: 54,
    top: 106,
    height: 4,
    borderRadius: 2,
    backgroundColor: `${PRIMARY}55`,
    transform: [{ rotate: "12deg" }],
  },
  mapPin: {
    position: "absolute",
    top: 64,
    right: 58,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  locationOverlayCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  locationOverlayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${PRIMARY}12`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationInfo: {
    flex: 1,
    minWidth: 0,
  },
  locationHospitalName: {
    color: "#222",
    fontSize: 14,
    fontWeight: "700",
  },
  locationHospitalAddress: {
    color: "#777",
    lineHeight: 17,
    marginTop: 3,
  },
  getDirectionsButton: {
    marginTop: 12,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  getDirectionsText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 8,
  },

  // Dropdown styles (kept for DoctorHospitalDropdown, if still used elsewhere)
  selector: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#276668",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: 320,
  },
  selectorText: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  extraCount: {
    color: "#d8f3f5",
    fontSize: 12,
    marginHorizontal: 6,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  dropdownBox: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 300,
    elevation: 10,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  dropdownTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#222",
  },
  dropdownAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  centerBox: {
    padding: 20,
    alignItems: "center",
  },
});
