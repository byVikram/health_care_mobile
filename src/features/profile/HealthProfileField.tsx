import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { ProfileFieldConfig } from "./profileFieldsConfig";

const TEAL = "#1a8c8c";

interface Props {
  config: ProfileFieldConfig;
  value?: string;
  onChange: (key: string, value: string) => void;
}

export default function HealthProfileField({ config, value, onChange }: Props) {
  const { key, label, type, placeholder, options, unit, verified } = config;

  const [editing, setEditing]         = useState(false);
  const [draft, setDraft]             = useState(value ?? "");
  const [showPicker, setShowPicker]   = useState(false);
  const [showSelect, setShowSelect]   = useState(false);

  // ── commit text/number input ──────────────────────────────────────────────
  const commitText = () => {
    if (draft.trim()) onChange(key, draft.trim());
    setEditing(false);
  };

  // ── date picker ───────────────────────────────────────────────────────────
  const handleDateChange = (_: any, selected?: Date) => {
    setShowPicker(Platform.OS === "ios"); // keep open on iOS
    if (selected) {
      const formatted = selected.toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      onChange(key, formatted);
    }
  };

  const parsedDate = (() => {
    if (!value) return new Date();
    const [d, m, y] = value.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? new Date() : dt;
  })();

  // ── render value row (filled state) ──────────────────────────────────────
  const renderValue = () => (
    <TouchableOpacity
      style={styles.valueRow}
      onPress={() => {
        if (type === "date")   { setShowPicker(true); return; }
        if (type === "select") { setShowSelect(true); return; }
        setDraft(value ?? "");
        setEditing(true);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.value}>
        {value}{unit ? ` ${unit}` : ""}
      </Text>
      {verified && (
        <MaterialCommunityIcons name="check-circle" size={16} color={TEAL} style={{ marginLeft: 6 }} />
      )}
      <MaterialCommunityIcons name="pencil-outline" size={14} color="#aab4b8" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  // ── render "+ add" / inline input ─────────────────────────────────────────
  const renderEmpty = () => {
    if (type === "date") {
      return (
        <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addBtn}>+ add</Text>
        </TouchableOpacity>
      );
    }
    if (type === "select") {
      return (
        <TouchableOpacity onPress={() => setShowSelect(true)} activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addBtn}>+ add</Text>
        </TouchableOpacity>
      );
    }
    if (editing) {
      return (
        <View style={styles.inlineInputWrap}>
          <TextInput
            style={styles.inlineInput}
            value={draft}
            onChangeText={setDraft}
            autoFocus
            keyboardType={
              type === "phone"  ? "phone-pad"     :
              type === "email"  ? "email-address" :
              type === "number" ? "numeric"        : "default"
            }
            onBlur={commitText}
            onSubmitEditing={commitText}
            returnKeyType="done"
            placeholder={placeholder}
            placeholderTextColor="#b0bcc0"
          />
          {!!unit && <Text style={styles.unitTxt}>{unit}</Text>}
          <TouchableOpacity onPress={commitText} style={styles.doneBtn}>
            <Text style={styles.doneTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity
        onPress={() => { setDraft(""); setEditing(true); }}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.addBtn}>+ add</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.row, editing && styles.rowEditing]}>
      {/* Left: label */}
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        {!!value && !editing && renderValue()}
      </View>

      {/* Right: add button or input */}
      {!value && !editing && renderEmpty()}
      {!value && editing  && renderEmpty()}

      {/* Date picker */}
      {showPicker && (
        <DateTimePicker
          value={parsedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* Select bottom sheet modal */}
      {showSelect && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowSelect(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSelect(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options ?? []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, value === item && styles.optionRowActive]}
                  onPress={() => { onChange(key, item); setShowSelect(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionTxt, value === item && styles.optionTxtActive]}>
                    {item}
                  </Text>
                  {value === item && (
                    <MaterialCommunityIcons name="check" size={18} color={TEAL} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8ecee",
    backgroundColor: "#fff",
    minHeight: 52,
  },
  rowEditing: {
    paddingVertical: 8,
  },
  left: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 12,
    color: "#7a8c91",
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  value: {
    fontSize: 14,
    color: "#1a2226",
    fontWeight: "500",
  },
  addBtn: {
    fontSize: 13,
    color: TEAL,
    fontWeight: "600",
  },

  // inline text input
  inlineInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  inlineInput: {
    flex: 1,
    fontSize: 14,
    color: "#1a2226",
    padding: 0,
  },
  unitTxt: {
    fontSize: 13,
    color: "#7a8c91",
    marginLeft: 4,
  },
  doneBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: TEAL,
    borderRadius: 6,
  },
  doneTxt: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  // bottom sheet
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: "#d0dadd",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2226",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8ecee",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f3f4",
  },
  optionRowActive: {
    backgroundColor: "#f0fafa",
  },
  optionTxt: {
    fontSize: 14,
    color: "#2a3a3e",
  },
  optionTxtActive: {
    color: TEAL,
    fontWeight: "600",
  },
});