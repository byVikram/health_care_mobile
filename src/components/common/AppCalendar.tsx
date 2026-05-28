import React, { useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTypography } from "./AppTypography";

export interface AppCalendarProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  isMobile?: boolean;
  modalTitle?: string;
}

const today = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const defaultDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 25);
  date.setHours(12, 0, 0, 0);
  return date;
};

const getDateFromDisplayValue = (value: string) => {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day, 12, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  if (date > today()) return null;

  return date;
};

const formatDisplayValue = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

export const AppCalendar = ({
  label,
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  isMobile = false,
  modalTitle = "Select DOB",
}: AppCalendarProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => getDateFromDisplayValue(value) ?? defaultDate());
  const maximumDate = useMemo(() => today(), []);
  const displayValue = value || placeholder;

  const openPicker = () => {
    setPickerDate(getDateFromDisplayValue(value) ?? defaultDate());
    setShowPicker(true);
  };

  const closePicker = () => setShowPicker(false);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) return;

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(12, 0, 0, 0);
    const nextDate = normalizedDate > maximumDate ? maximumDate : normalizedDate;

    setPickerDate(nextDate);
    onChange(formatDisplayValue(nextDate));
  };

  const picker = (
    <DateTimePicker
      value={pickerDate}
      mode="date"
      display={Platform.OS === "ios" ? "inline" : Platform.OS === "android" ? "calendar" : "default"}
      maximumDate={maximumDate}
      onChange={handleDateChange}
    />
  );

  return (
    <View style={styles.fieldGroup}>
      {label ? (
        <AppTypography variant="caption" style={styles.fieldLabel}>
          {label}
          {required ? (
            <AppTypography variant="caption" style={styles.requiredMark}>
              {" "}
              *
            </AppTypography>
          ) : null}
        </AppTypography>
      ) : null}
      <Pressable style={styles.inputShell} onPress={openPicker}>
        <AppTypography variant="body" style={[styles.selectText, !value && styles.placeholderText]}>
          {displayValue}
        </AppTypography>
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#2c7b80" />
      </Pressable>
      {showPicker && Platform.OS === "android" ? picker : null}
      {Platform.OS !== "android" ? (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable style={styles.modalOverlay} onPress={closePicker}>
            <Pressable
              style={[styles.calendarModalCard, isMobile && styles.modalCardMobile]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <AppTypography variant="h4" style={styles.modalTitle}>
                  {modalTitle}
                </AppTypography>
                <TouchableOpacity onPress={closePicker} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={22} color="#45636d" />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarPickerBody}>{picker}</View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.doneButton} onPress={closePicker}>
                  <AppTypography variant="body" style={styles.doneButtonText}>
                    Done
                  </AppTypography>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    width: "100%",
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#8f8f8f",
    fontWeight: "500",
  },
  requiredMark: {
    color: "#d84545",
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    textAlignVertical: "top",
  },
  inputShell: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#a7d3db",
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#2f2f2f",
  },
  placeholderText: {
    color: "#9a9a9a",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 28, 33, 0.28)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCardMobile: {
    maxWidth: "100%",
  },
  calendarModalCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    maxHeight: "78%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  modalTitle: {
    color: "#343434",
  },
  calendarPickerBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  modalActions: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eef4f5",
    alignItems: "flex-end",
  },
  doneButton: {
    minWidth: 96,
    borderRadius: 8,
    backgroundColor: "#0c7c7c",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
