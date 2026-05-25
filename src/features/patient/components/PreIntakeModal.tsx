import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export type PreIntakeSeverity = "mild" | "moderate" | "severe" | "";

type PreIntakeModalProps = {
  visible: boolean;
  symptoms: string;
  duration: string;
  severity: PreIntakeSeverity;
  onSymptomsChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onSeverityChange: (value: PreIntakeSeverity) => void;
  onSkip: () => void;
  onSubmit: () => void;
  title?: string;
  subtitle?: string;
};

const severityStyles = {
  mild: { bg: "#e8f5e9", border: "#4caf50", text: "#2e7d32" },
  moderate: { bg: "#fff8e1", border: "#ffa726", text: "#e65100" },
  severe: { bg: "#ffebee", border: "#ef5350", text: "#c62828" },
};

export default function PreIntakeModal({
  visible,
  symptoms,
  duration,
  severity,
  onSymptomsChange,
  onDurationChange,
  onSeverityChange,
  onSkip,
  onSubmit,
  title = "Share Symptoms Before You Visit",
  subtitle = "Help your doctor understand your condition better by adding symptoms or concerns before the consultation.",
}: PreIntakeModalProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const canSubmit = Boolean(symptoms.trim() || severity);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.symptomsCard, isTablet && styles.symptomsCardTablet]}>
          <View style={styles.symptomsHeader}>
            <Text style={styles.symptomsTitle}>{title}</Text>
            <Text style={styles.symptomsSubtitle}>{subtitle}</Text>
          </View>

          <View style={styles.symptomsBody}>
            <View>
              <Text style={styles.fieldLabel}>Symptoms / Reason for Visit</Text>
              <TextInput
                value={symptoms}
                onChangeText={onSymptomsChange}
                placeholder="Describe your symptoms or reason for visit..."
                placeholderTextColor="#9aa5ad"
                style={[styles.textInput, styles.symptomsInput]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Duration of Symptoms</Text>
              <TextInput
                value={duration}
                onChangeText={onDurationChange}
                placeholder="e.g. 2 days, 1 week, 3 months"
                placeholderTextColor="#9aa5ad"
                style={styles.textInput}
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Severity Level</Text>
              <View style={styles.severityRow}>
                {(["mild", "moderate", "severe"] as const).map((item) => {
                  const selected = severity === item;
                  const severityStyle = severityStyles[item];

                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.severityChip,
                        {
                          borderColor: selected
                            ? severityStyle.border
                            : "#d7dfe5",
                          backgroundColor: selected
                            ? severityStyle.bg
                            : "transparent",
                        },
                      ]}
                      onPress={() => onSeverityChange(item)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          {
                            color: selected ? severityStyle.text : "#6b7280",
                            fontWeight: selected ? "700" : "400",
                          },
                        ]}
                      >
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.symptomsActions}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                activeOpacity={0.85}
              >
                <Text style={styles.skipButtonText}>Skip for Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitSymptomsButton,
                  !canSubmit && styles.submitSymptomsDisabled,
                ]}
                disabled={!canSubmit}
                onPress={onSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.submitSymptomsText}>Submit Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  symptomsCard: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  symptomsCardTablet: {
    maxWidth: 600,
  },
  symptomsHeader: {
    backgroundColor: "#2B7A78",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  symptomsTitle: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  symptomsSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  symptomsBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  fieldLabel: {
    color: "#222",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d7dfe5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#222",
    fontSize: 13,
    backgroundColor: "#fff",
  },
  symptomsInput: {
    minHeight: 92,
  },
  severityRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  severityChip: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  severityText: {
    fontSize: 13,
  },
  symptomsActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 4,
  },
  skipButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2B7A78",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  skipButtonText: {
    color: "#2B7A78",
    fontSize: 14,
    fontWeight: "700",
  },
  submitSymptomsButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#2B7A78",
    alignItems: "center",
    justifyContent: "center",
  },
  submitSymptomsDisabled: {
    opacity: 0.5,
  },
  submitSymptomsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
