import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type StatusModalProps = {
  visible: boolean;

  // status type
  status?: "success" | "error" | "info";

  title: string;
  description: string;

  submitText?: string;
  onSubmit?: () => void;

  cancelText?: string;
  onCancel?: () => void;
};

const StatusModal: React.FC<StatusModalProps> = ({
  visible,
  status = "success",
  title,
  description,
  submitText,
  onSubmit,
  cancelText,
  onCancel,
}) => {
  const getIconMeta = () => {
    if (status === "info") {
      return {
        bg: "#EBF3FF",
        icon: "bell-outline" as const,
        color: "#1976D2",
      };
    }
    if (status === "error") {
      return {
        bg: "#FDECEA",
        icon: "close" as const,
        color: "#D32F2F",
      };
    }
    return {
      bg: "#E6F4EA",
      icon: "check" as const,
      color: "#2E7D32",
    };
  };

  const meta = getIconMeta();

  return (
    <Modal transparent visible={visible} animationType="fade">
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onCancel}>
        
        {/* Prevent closing when clicking inside card */}
        <Pressable style={styles.card}>

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: meta.bg,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={meta.icon}
              size={32}
              color={meta.color}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            
            {/* Submit Button */}
            {submitText && (
              <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit}>
                <Text style={styles.primaryText}>{submitText}</Text>
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            {cancelText && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
                <Text style={styles.secondaryText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default StatusModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "85%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },

  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },

  description: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },

  buttonContainer: {
    width: "100%",
  },

  primaryBtn: {
    backgroundColor: "#2E7D6B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2E7D6B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryText: {
    color: "#2E7D6B",
    fontWeight: "bold",
    fontSize: 14,
  },
});