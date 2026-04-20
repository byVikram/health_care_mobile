import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import ProfileIcon from "../../assets/Register/profile.svg";
import ConsultIcon from "../../assets/Register/Consult.svg";
import FeedbackIcon from "../../assets/Register/Feedback.svg";

export default function DoctorWelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <View style={styles.container}>

        {/* Logo Header */}
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/Banner/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.logoText}>Whisper ai.</Text>
            <Text style={styles.logoSubText}>Smart Care. Simple Access</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome Doctor! 👋🏻</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Let's help you get started on Whisper ai by making your Doctor Profile.
        </Text>

        {/* Feature List */}
        <View style={styles.section}>

          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <ProfileIcon width={48} height={48} />
            </View>
            <Text style={styles.text}>
              <Text style={styles.bold}>Profile - </Text>
              Makes you visible to the hundreds of patients searching on Whisper ai.com
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <ConsultIcon width={48} height={48} />
            </View>
            <Text style={styles.text}>
              <Text style={styles.bold}>Consult - </Text>
              Online consultations are convenient and a great way to maximise your earnings
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <FeedbackIcon width={48} height={48} />
            </View>
            <Text style={styles.text}>
              <Text style={styles.bold}>Feedback - </Text>
              You can view and reply to patients' feedback here
            </Text>
          </View>

        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("AccountPage")}
        >
          <Text style={styles.buttonText}>Create free profile</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 150,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
    gap: 10,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2e7d74",
  },
  logoSubText: {
    fontSize: 11,
    color: "#2e7d74",
    marginTop: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginBottom: 32,
  },
  section: {
    gap: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
    paddingTop: 6,
  },
  bold: {
    fontWeight: "700",
    color: "#1a1a1a",
  },
  button: {
    backgroundColor: "#2e7d74",
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 16,
    elevation: 4,
  },
  buttonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});