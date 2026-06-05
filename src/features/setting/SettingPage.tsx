import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Linking,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowIcon from "../../assets/Settings/arrow.svg";
// SVG Icons
import FrameIcon from "../../assets/Settings/Frame.svg";
import StarIcon from "../../assets/Settings/star.svg";
import VectorIcon from "../../assets/Settings/Vector.svg";

const SettingPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ─── Handlers ─────────────────────────────
  const handleAbout = () => {
    Alert.alert("About Whisper AI", "Version 1.0.0");
  };

  const handleRateUs = () => {
    Linking.openURL("https://apps.apple.com").catch(() =>
      Alert.alert("Error", "Unable to open store")
    );
  };

  const handleShare = async () => {
    await Share.share({
      message: "Check out Whisper AI!",
    });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel" },
      { text: "Logout", style: "destructive" },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete Account", "Permanent action!", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive" },
    ]);
  };

  // ✅ ALL ITEMS IN ONE LIST
  const menuItems = [
    {
      label: "About whisper ai",
      icon: <FrameIcon width={22} height={22} />,
      onPress: handleAbout,
      destructive: false,
    },
    {
      label: "Rate us on app store",
      icon: <StarIcon width={22} height={22} />,
      onPress: handleRateUs,
      destructive: false,
    },
    {
      label: "Share the app with family & friends",
      icon: <VectorIcon width={22} height={22} />,
      onPress: handleShare,
      destructive: false,
    },
    {
      label: "Logout",
      onPress: handleLogout,
      destructive: true,
    },
    {
      label: "Delete account",
      onPress: handleDelete,
      destructive: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      
    
      <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
        <View style={styles.waveOne} />
        <View style={styles.waveTwo} />

        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowIcon />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Settings</Text>

          <View style={{ width: 22 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* ✅ SINGLE CARD */}
        <View style={styles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.row,
                index !== menuItems.length - 1 && styles.borderBottom,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.left}>
                {item.icon && item.icon}

                <Text
                  style={[
                    styles.text,
                    item.destructive && styles.destructive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={item.destructive ? "#FF3B30" : "#999"}
              />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f5",
  },

  // 🔥 Header
  headerWrapper: {
    backgroundColor: "#1f5f68",
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },

  waveOne: {
    position: "absolute",
    width: 420,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.06)",
    left: -140,
    top: -70,
    transform: [{ rotate: "-4deg" }],
  },

  waveTwo: {
    position: "absolute",
    width: 430,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    left: -95,
    top: -22,
    transform: [{ rotate: "-4deg" }],
  },

  // Card
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  text: {
    fontSize: 15,
    color: "#333",
  },

  destructive: {
    color: "#FF3B30",
  },
});

export default SettingPage;