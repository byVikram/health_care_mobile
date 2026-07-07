import React from "react";
import {
  Image,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTypography, DateSlotPicker } from "../../../../components/common";
import type { SlotGroup } from "../../doctorService";
import { DETAIL_PRIMARY } from "./constants";
import type { AppointmentModeKey, HospitalEntry } from "./types";

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

export function HospitalAppointmentCard({
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
      <View style={styles.hospitalCardHeader}>
        <Image source={{ uri: "https://via.placeholder.com/80" }} style={styles.hospitalImage} />
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
              {`₹${Number(offline_consultation_fee) || 0} Fee`}
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

      {isExpanded && (
        <View style={styles.expandedContent}>
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
                color={selectedAppointmentType === "clinic" ? DETAIL_PRIMARY : "#888"}
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
                color={selectedAppointmentType === "video" ? DETAIL_PRIMARY : "#888"}
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

          <View style={styles.expandedActionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: open maps / directions to hospital
              }}
            >
              <MaterialCommunityIcons
                name="navigation-variant-outline"
                size={18}
                color={DETAIL_PRIMARY}
              />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: trigger call to hospital
              }}
            >
              <MaterialCommunityIcons name="phone-outline" size={18} color={DETAIL_PRIMARY} />
              <Text style={styles.actionButtonText}>Call Hospital</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    borderColor: DETAIL_PRIMARY,
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
    backgroundColor: DETAIL_PRIMARY,
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
  greyText: { color: "#888" },
  distanceText: { color: "#2b7571", fontWeight: "bold" },
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
    borderColor: DETAIL_PRIMARY,
    backgroundColor: `${DETAIL_PRIMARY}10`,
  },
  apptTypeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  apptTypeTextSelected: {
    color: DETAIL_PRIMARY,
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
    color: DETAIL_PRIMARY,
    fontWeight: "600",
    fontSize: 13,
  },
});
