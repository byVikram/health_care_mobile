import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import QRCodeImg from "../../assets/icons/QrCode.png";

type Props = {
  visible: boolean;
  onClose: () => void;

  name: string;
  patientId: string;
  phone: string;
  email: string;
  address: string;
  image?: any;
};

export default function PatientQrModal({
  visible,
  onClose,
  name,
  patientId,
  phone,
  email,
  address,
  image,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#333" />
        </TouchableOpacity>

        {/* Card */}
        <View style={styles.container}>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <Image source={image} style={styles.avatar} />
          </View>

          {/* Name */}
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.patientId}>({patientId})</Text>

          {/* QR */}
          <View style={styles.qrCard}>
            <Image source={QRCodeImg} style={styles.qrImage} />
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{phone}</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{address}</Text>
          </View>

        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#f2f4f5",
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },

  container: {
    alignItems: "center",
    width: "100%",
  },

  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
  },

  patientId: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },

  qrCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    elevation: 4,
    marginBottom: 20,
  },

  infoCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },

  label: {
    fontSize: 12,
    color: "#888",
  },
  qrImage: {
  width: 140,
  height: 140,
  resizeMode: "contain",
},

  value: {
    fontSize: 14,
    color: "#222",
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 6,
  },
});