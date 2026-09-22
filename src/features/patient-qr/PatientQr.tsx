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

// ✅ FIXED IMAGE IMPORT
const QRCodeImg = require("../../assets/icons/QrCode.png");

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

        {/* CLOSE BUTTON */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>

        {/* CARD */}
        <View style={styles.container}>

          {/* PROFILE IMAGE */}
          <View style={styles.avatarWrapper}>
            <Image source={image} style={styles.avatar} />
          </View>

          {/* NAME */}
          <Text style={styles.name}>{name}</Text>

          <Text style={styles.patientId}>
            ({patientId})
          </Text>

          {/* QR CODE */}
          <View style={styles.qrCard}>
            <Image
              source={QRCodeImg}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>

          {/* INFO */}
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
    elevation: 4,
  },

  container: {
    alignItems: "center",
    width: "100%",
  },

  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#ddd",
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  patientId: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },

  qrCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    elevation: 5,
    marginBottom: 20,
  },

  qrImage: {
    width: 160,
    height: 160,
  },

  infoCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    elevation: 3,
  },

  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },

  value: {
    fontSize: 14,
    color: "#222",
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
});