import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthContext";
import { AppButton } from "../buttons/AppButton";
import { AppModal } from "./AppModal";
import { AppTypography } from "../display/AppTypography";
import PatientQR from "../../../assets/icons/PatientQR.svg";
import LogoutIcon from "../../../assets/icons/logout.svg";
const ORCode = require("../../../assets/icons/QrCode.png");

import PatientQr from "../../../features/patient-qr/PatientQr";
import { USER_ROLES } from "../../../constants/constants"; // adjust path if needed

export interface AppSidebarItem {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap | React.ReactNode;
  onPress: () => void;
}

export interface AppSidebarProfile {
  id: string;
  label: string;
  variant?: "smile" | "mom" | "dad" | "add";
  avatar?: ImageSourcePropType;
  avatarUrl?: string;
}

type ProfileAvatarVariant = Exclude<
  NonNullable<AppSidebarProfile["variant"]>,
  "add"
>;

interface AppSidebarProps {
  visible: boolean;
  profileCompletion?: number;
  onClose: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
  menuItems: AppSidebarItem[];
  profiles?: AppSidebarProfile[];
}

const SIDEBAR_WIDTH = 290;
const FALLBACK_IMAGE = require("../../../assets/Banner/doctor.png");
const PROFILE_AVATAR_FALLBACKS: Record<
  ProfileAvatarVariant,
  ImageSourcePropType
> = {
  smile: require("../../../assets/Banner/patient.png"),
  mom: require("../../../assets/Banner/doctor.png"),
  dad: require("../../../assets/Banner/welcome-doctor.png"),
};

export default function AppSidebar({
  visible,
  profileCompletion = 22,
  onClose,
  onLogout,
  onEditProfile,
  menuItems,
  profiles = [],
}: AppSidebarProps) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, role, ancillarySpecialty } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const userName = user?.name ?? "User";

  const profileImageUrl = user?.avatar ?? null;

  useEffect(() => {
    setImageError(false);
  }, [profileImageUrl]);

  const isPhysiotherapy =
    (role === USER_ROLES.ANCILLARY || role === USER_ROLES.NURSE) &&
    (ancillarySpecialty === 'physiotherapy' || !ancillarySpecialty);

  const fallbackAvatar = isPhysiotherapy
    ? require("../../../assets/physiotherapy/physiotherapist.png")
    : FALLBACK_IMAGE;

  const imageSource = profileImageUrl && !imageError ? { uri: profileImageUrl } : fallbackAvatar;

  const isPatient = role === USER_ROLES.PATIENT;

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

  const handleLogoutPress = () => {
    setLogoutConfirmVisible(true);
  };

  const handleCancelLogout = () => {
    setLogoutConfirmVisible(false);
  };

  const handleConfirmLogout = () => {
    setLogoutConfirmVisible(false);
    onLogout();
  };

  return (
    <>
    <Modal
      visible={visible && !logoutConfirmVisible}
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
          {/* Entire section reuses the same "View and Edit profile" navigation
              (handleEditProfile) so tapping the photo, name, or any empty space
              in this card goes to the Profile screen. The QR button keeps its
              own distinct action (opening the QR view) since that's a separate
              existing feature, not part of this navigation. */}
          <Pressable style={styles.profileSection} onPress={handleEditProfile}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <Image
                source={imageSource}
                onError={() => setImageError(true)}
                style={styles.avatarImage}
              />
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

            {/* QR Code - only for Patient */}
            {isPatient && (
              <TouchableOpacity
                style={styles.qrRight}
                onPress={() => setShowQR(true)}
              >
                <Image source={ORCode} style={styles.qrRight} />
              </TouchableOpacity>
            )}
          </Pressable>

          <View style={styles.separator} />

          {isPatient && profiles.length > 0 && (
            <>
              <View style={styles.profilesSection}>
                <Text style={styles.profilesTitle}>Profiles</Text>
                <View style={styles.profilesRow}>
                  {profiles.map((profile) => {
                    const isAdd = profile.variant === "add";
                    const profileAvatarVariant: ProfileAvatarVariant =
                      profile.variant && profile.variant !== "add"
                        ? profile.variant
                        : "smile";
                    const profileAvatarSource =
                      profile.avatar ??
                      (profile.avatarUrl ? { uri: profile.avatarUrl } : null) ??
                      PROFILE_AVATAR_FALLBACKS[profileAvatarVariant];

                    return (
                      <TouchableOpacity
                        key={profile.id}
                        style={styles.profileOption}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.profileCircle,
                            isAdd && styles.profileCircleAdd,
                          ]}
                        >
                          {isAdd ? (
                            <MaterialCommunityIcons name="plus" size={34} color="#ffffff" />
                          ) : (
                            <Image
                              source={profileAvatarSource}
                              style={styles.profileCircleImage}
                            />
                          )}
                        </View>
                        <Text style={styles.profileOptionLabel} numberOfLines={1}>
                          {profile.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.separator} />
            </>
          )}

          {/* ── Menu Items ── */}
          <ScrollView
            style={styles.menuSection}
            showsVerticalScrollIndicator={false}
          >
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
                    name={
                      item.icon as keyof typeof MaterialCommunityIcons.glyphMap
                    }
                    size={20}
                    color="#41565c"
                  />
                ) : (
                  item.icon
                )}
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color="#9aa4a8"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Logout ── */}
          <TouchableOpacity style={styles.logoutItem} onPress={handleLogoutPress}>
            <MaterialCommunityIcons name="logout" size={20} color="#c63e3e" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* QR Modal - only for Patient */}
      {isPatient && (
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
      )}
    </Modal>

    <AppModal
      visible={logoutConfirmVisible}
      onDismiss={handleCancelLogout}
      contentContainerStyle={styles.logoutModalContainer}
    >
      <View style={styles.logoutModalContent}>
        <View style={styles.logoutIconCircle}>
          <LogoutIcon width={27} height={27} />
        </View>

        <AppTypography variant="h3" align="center" style={styles.logoutModalTitle}>
          Logout
        </AppTypography>

        <AppTypography
          variant="body"
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.logoutModalMessage}
        >
          Are you sure you want to logout?
        </AppTypography>
      </View>

      <View style={styles.logoutModalActions}>
        <AppButton
          variant="outline"
          style={[
            styles.logoutModalButton,
            styles.cancelLogoutButton,
            { borderColor: theme.colors.outline },
          ]}
          textColor={theme.colors.onSurfaceVariant}
          onPress={handleCancelLogout}
        >
          Cancel
        </AppButton>
        <AppButton
          style={styles.logoutModalButton}
          buttonColor={theme.colors.error || "#EF4C5A"}
          textColor="#ffffff"
          onPress={handleConfirmLogout}
        >
          Logout
        </AppButton>
      </View>
    </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.35)" },
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
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  avatarWrapper: {
    width: 70,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e8f0f2",
  },
  avatarImage: { width: "100%", height: "100%" },
  profileInfo: {
    flex: 1,
    marginHorizontal: 2,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#142b30",
    marginBottom: 2,
  },
  profileLink: {
    fontSize: 12,
    color: "#1f8c9e",
    marginTop: 2,
    textDecorationLine: "underline",
  },
  profileCompletion: {
    fontSize: 11,
    color: "#2f8c58",
    marginTop: 3,
  },
  separator: { height: 1, backgroundColor: "#e9eef0" },
  profilesSection: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  profilesTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#142b30",
    marginBottom: 14,
  },
  profilesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  profileOption: {
    width: 58,
    alignItems: "center",
  },
  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    backgroundColor:'#d1cacad8',
    borderColor:'#474646',
    borderWidth:0.8,
  },
  profileCircleAdd: {
    backgroundColor: "#252525",
  },
  profileCircleImage: {
    width: "100%",
    height: "100%",
  },
  profileOptionLabel: {
    fontSize: 12,
    color: "#142b30",
    textAlign: "center",
  },
  menuSection: { flex: 1, paddingTop: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f3f4",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#e9eef0",
  },
  logoutText: { color: "#c63e3e", fontWeight: "700", fontSize: 14 },
  logoutModalContainer: {
    width: "84%",
    maxWidth: 340,
    alignSelf: "center",
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
  },
  logoutModalContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  logoutIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fde3e3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoutModalTitle: {
    color: "#142b30",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    marginBottom: 4,
  },
  logoutModalMessage: {
    color: "#5d6670",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: "100%",
  },
  logoutModalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#eef0f2",
  },
  logoutModalButton: {
    flex: 1,
    borderRadius: 10,
  },
  cancelLogoutButton: {
    backgroundColor: "#ffffff",
  },
});
