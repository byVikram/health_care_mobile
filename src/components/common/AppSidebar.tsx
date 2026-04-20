import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import PatientQR from "../../assets/icons/PatientQR.svg";
import ORCode  from "../../assets/icons/QrCode.png";
import PatientQr from "../../features/patientQr/PatientQr"; // adjust path if needed
export interface AppSidebarItem {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap | React.ReactNode;
  onPress: () => void;
}

interface AppSidebarProps {
  visible: boolean;
  profileCompletion?: number;
  onClose: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
  menuItems: AppSidebarItem[];
}

const SIDEBAR_WIDTH = 290;
const FALLBACK_IMAGE = require("../../assets/Banner/doctor.png");

export default function AppSidebar({
  visible,
  profileCompletion = 22,
  onClose,
  onLogout,
  onEditProfile,
  menuItems,
}: AppSidebarProps) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
const [showQR, setShowQR] = useState(false);
  const userName = user?.name ?? user?.full_name ?? user?.username ?? "User";
  const profileImageUrl = user?.profile_image ?? user?.photo ?? user?.avatar ?? null;
  const imageSource = profileImageUrl ? { uri: profileImageUrl } : FALLBACK_IMAGE;

  const progress =
    typeof profileCompletion === "number"
      ? Math.min(100, Math.max(0, profileCompletion))
      : null;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleEditProfile = () => {
    onClose();
    onEditProfile?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.sidebar,
            { paddingTop: insets.top + 8, transform: [{ translateX }] },
          ]}
        >
          {/* ── Profile Section ── */}
         <View style={styles.profileSection}>

  {/* Avatar */}
  <View style={styles.avatarWrapper}>
    <Image source={imageSource} style={styles.avatarImage} />
  </View>

  {/* Center Info */}
  <View style={styles.profileInfo}>
    <Text style={styles.nameText}>{userName}</Text>

    <TouchableOpacity onPress={handleEditProfile}>
      <Text style={styles.profileLink}>View and Edit profile</Text>
    </TouchableOpacity>

    {progress !== null && (
      <Text style={styles.profileCompletion}>
        {progress}% Profile completed
      </Text>
    )}
  </View>

  {/* QR Code Right */}
 <TouchableOpacity
  style={styles.qrRight}
  onPress={() => setShowQR(true)}
>
 <Image source={ORCode} style={styles.qrRight} />
</TouchableOpacity>
<PatientQr
  visible={showQR}
  onClose={() => setShowQR(false)}
  name={userName}
  patientId="PID1120"
  phone="+91 9876543210"
  email="email@address.com"
  address="KR Market Bengaluru"
  image={imageSource}
/>
</View>
          <View style={styles.separator} />

          {/* ── Menu Items ── */}
          <ScrollView style={styles.menuSection} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {typeof item.icon === "string" ? (
                  <MaterialCommunityIcons
                    name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={20}
                    color="#41565c"
                  />
                ) : (
                  item.icon
                )}
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9aa4a8" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Logout ── */}
          <TouchableOpacity style={styles.logoutItem} onPress={onLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#c63e3e" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: "#ffffff",
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  profileSection: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between", // 🔥 important
  paddingVertical: 14,
},
  avatarWrapper: { width: 70, height: 80, borderRadius: 12, overflow: "hidden", backgroundColor: "#e8f0f2" },
  avatarImage: { width: "100%", height: "100%" },
 profileInfo: {
  flex: 1,
  marginHorizontal: 2, // 🔥 spacing between avatar & QR
},
  nameText: { fontSize: 16, fontWeight: "700", color: "#142b30", marginBottom: 2 },
  profileLink: { fontSize: 12, color: "#1f8c9e", marginTop: 2, textDecorationLine: "underline" },
  progressBarBg: { marginTop: 6, height: 4, borderRadius: 2, backgroundColor: "#e0ecee", overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 2, backgroundColor: "#2f8c58" },
  profileCompletion: { fontSize: 11, color: "#2f8c58", marginTop: 3 },
  separator: { height: 1, backgroundColor: "#e9eef0" },
  menuSection: { flex: 1, paddingTop: 10 },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f3f4",
  },
qrRight: {
  width: 65,
  height: 65,

  borderRadius: 8,
  justifyContent: "center",
  alignItems: "center",
},
  menuLabel: { flex: 1, fontSize: 14, color: "#24373d" },
  logoutItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#e9eef0",
  },
  logoutText: { color: "#c63e3e", fontWeight: "700", fontSize: 14 },
});