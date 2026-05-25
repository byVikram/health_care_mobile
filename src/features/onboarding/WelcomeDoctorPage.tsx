import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import ProfileIcon from "../../assets/Register/profile.svg";
import ConsultIcon from "../../assets/Register/Consult.svg";
import FeedbackIcon from "../../assets/Register/Feedback.svg";
import DoctorTabletImage from "../../assets/Register/Welcome.svg";

import { AppSelect, AppSelectOption, AppTypography } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { ROUTES } from "../../navigation/routes";
import type { AppStackScreenProps } from "../../navigation/types";
import { getSpecialities } from "../doctor/doctorService";
import { doctorService } from "../consultation/ConsultationService";

type Speciality = {
  id: string;
  label: string;
  icon_key: string;
};

const MOCK_LOCATIONS: AppSelectOption[] = [
  { label: "Bangalore", value: "Bangalore" },
  { label: "Mumbai", value: "Mumbai" },
  { label: "Delhi", value: "Delhi" },
  { label: "Chennai", value: "Chennai" },
  { label: "Hyderabad", value: "Hyderabad" },
  { label: "Pune", value: "Pune" },
  { label: "Kolkata", value: "Kolkata" },
  { label: "Ahmedabad", value: "Ahmedabad" },
  { label: "Jaipur", value: "Jaipur" },
  { label: "Surat", value: "Surat" },
  { label: "Kochi", value: "Kochi" },
  { label: "Chandigarh", value: "Chandigarh" },
];

const pharmacistImage = require("../../assets/Banner/pharmacy.png");

export default function WelcomeDoctorPage({
  navigation,
}: AppStackScreenProps<typeof ROUTES.STACK.DOCTOR_WELCOME>) {
  const { role } = useAuth();
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSpeciality, setSelectedSpeciality] = useState("");
  const [specialityOptions, setSpecialityOptions] = useState<AppSelectOption[]>([]);
  const [loadingSpecialities, setLoadingSpecialities] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [specialityError, setSpecialityError] = useState("");
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 380;
  const isTablet = width >= 768;
  const isLandscape = width > height;
  const isCompactHeight = height < 620;
  const useSplitLayout = width >= 900 && isLandscape;
  const showIllustration = isTablet && isLandscape;

  const horizontalPadding = isTablet ? 48 : isSmallPhone ? 18 : 24;
  const verticalPadding = isCompactHeight ? 20 : isTablet ? 48 : 28;
  const contentMaxWidth = useSplitLayout ? 1180 : isTablet ? 680 : 520;
  const copyMaxWidth = useSplitLayout ? 560 : "100%";
  const logoSize = isTablet ? 60 : isSmallPhone ? 42 : 48;
  const iconSize = isSmallPhone ? 40 : 48;
  const titleSize = isTablet ? 36 : isSmallPhone ? 24 : 28;
  const subtitleSize = isTablet ? 16 : 13;
  const bodySize = isTablet ? 15 : 13;
  const illustrationSize = width >= 1180 ? 390 : 330;
  const accountIllustrationSize = width >= 1180 ? 360 : 300;
  const accountDropdownHeight = isSmallPhone || isCompactHeight ? 180 : 220;
  const accountDropdownBottomOffset = isTablet ? 40 : 96;
  const accountTopPadding = isTablet ? 40 : isCompactHeight ? 34 : 44;
  const canContinue = Boolean(selectedLocation && selectedSpeciality) && !loadingSpecialities && !isSaving;
  const isPharmacist = role === "pharmacy";

  const welcomeConfig = isPharmacist
    ? {
        title: "Welcome Pharmacist👋",
        subtitle: "Let's get your pharmacy listed and ready to serve patients.",
        buttonLabel: "Set Up Pharmacy Profile",
        features: [
          {
            Icon: ProfileIcon,
            title: "Profile",
            description: "Get discovered by patients looking for pharmacies on Whisper ai",
          },
          {
            Icon: ConsultIcon,
            title: "Inventory",
            description: "Manage your medicine inventory and keep availability up to date",
          },
          {
            Icon: FeedbackIcon,
            title: "Orders",
            description: "Receive and fulfil prescription orders from patients directly",
          },
        ],
      }
    : {
        title: "Welcome Doctor! \uD83D\uDC4B\uD83C\uDFFB",
        subtitle: "Let's help you get started on Whisper ai by making your Doctor Profile.",
        buttonLabel: "Create free profile",
        features: [
          {
            Icon: ProfileIcon,
            title: "Profile",
            description: "Makes you visible to the hundreds of patients searching on Whisper ai.com",
          },
          {
            Icon: ConsultIcon,
            title: "Consult",
            description: "Online consultations are convenient and a great way to maximise your earnings",
          },
          {
            Icon: FeedbackIcon,
            title: "Feedback",
            description: "You can view and reply to patients' feedback here",
          },
        ],
      };
  const welcomeTitleSize = isPharmacist && isTablet ? 44 : titleSize;
  const welcomeSubtitleSize = isPharmacist && isTablet ? 18 : subtitleSize;
  const welcomeBodySize = isPharmacist && isTablet ? 17 : bodySize;
  const welcomeButtonWidth = isPharmacist && useSplitLayout ? 430 : useSplitLayout ? 360 : 420;

  useEffect(() => {
    const fetchSpecialities = async () => {
      try {
        setLoadingSpecialities(true);
        const json = await getSpecialities();

        if (json.success && Array.isArray(json.data)) {
          const options: AppSelectOption[] = json.data.map((speciality: Speciality) => ({
            label: speciality.label,
            value: speciality.id,
          }));
          setSpecialityOptions(options);
        }
      } catch (error) {
        console.error("Specialities fetch error:", error);
      } finally {
        setLoadingSpecialities(false);
      }
    };

    fetchSpecialities();
  }, []);

  const handleContinue = async () => {
    let hasError = false;

    if (!selectedLocation) {
      setLocationError("Please select a location");
      hasError = true;
    } else {
      setLocationError("");
    }

    if (!selectedSpeciality) {
      setSpecialityError("Please select a speciality");
      hasError = true;
    } else {
      setSpecialityError("");
    }

    if (hasError) return;

    try {
      setIsSaving(true);
      await doctorService.updateDoctorProfile({
        location: selectedLocation,
        speciality_id: selectedSpeciality,
        specialization_id: selectedSpeciality,
        specialization: selectedSpeciality,
      });

      navigation.reset({
        index: 0,
        routes: [
          {
            name: ROUTES.MAIN.TABS,
            params: { screen: ROUTES.MAIN.PROFILE },
          },
        ],
      });
    } catch (error) {
      console.error("Doctor welcome profile save error:", error);
      Alert.alert("Error", "Unable to save your account details right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWelcomeCta = () => {
    if (isPharmacist) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: ROUTES.MAIN.TABS,
            params: { screen: ROUTES.PORTAL.PROFILE },
          },
        ],
      });
      return;
    }

    setShowAccountDetails(true);
  };

  if (showAccountDetails) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.accountScrollContent,
            !isTablet && styles.accountScrollContentMobile,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: accountTopPadding,
              paddingBottom: !isTablet ? accountDropdownHeight + accountDropdownBottomOffset : isCompactHeight ? 18 : 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.accountContainer,
              { maxWidth: useSplitLayout ? 1120 : isTablet ? 560 : 420 },
              !isTablet && styles.accountContainerMobile,
              useSplitLayout && styles.accountContainerSplit,
            ]}
          >
            <View style={[styles.accountForm, { maxWidth: useSplitLayout ? 420 : "100%" }]}>
              <View style={[styles.accountLogoRow, { marginBottom: isCompactHeight ? 22 : 34 }]}>
                <Image
                  source={require("../../assets/Banner/logo.png")}
                  style={[styles.accountLogoImage, { width: isTablet ? 68 : 56, height: isTablet ? 68 : 56 }]}
                  resizeMode="contain"
                />
                <View>
                  <AppTypography variant="h3" style={[styles.logoText, { fontSize: isTablet ? 24 : 21 }]}>
                    Whisper ai.
                  </AppTypography>
                  <AppTypography variant="caption" style={styles.logoSubText}>
                    Smart Care. Simple Access
                  </AppTypography>
                </View>
              </View>

              <AppTypography variant="h2" >
                Account Details
              </AppTypography>
              <AppTypography variant="body" >
                We just need some more details before we can get you started.
              </AppTypography>

              <AppSelect
                label=''
                placeholder="Select your location"
                options={MOCK_LOCATIONS}
                value={selectedLocation}
                onSelect={(value) => {
                  setSelectedLocation(value);
                  setLocationError("");
                }}
                borderRadius={4}
                borderColor="#9fc9ca"
                size="small"
                customCardStyle={[styles.accountSelect,styles.locationSelect]}
                errorText={locationError}
                dropdownPosition="bottom"
                maxDropdownHeight={accountDropdownHeight}
                bottomOffset={accountDropdownBottomOffset}
              />

              {loadingSpecialities ? (
                <View style={styles.fieldLoadingWrapper}>
                  <ActivityIndicator size="small" color="#2e7d74" />
                  <AppTypography variant="caption" style={styles.fieldLoadingText}>
                    Loading specialities...
                  </AppTypography>
                </View>
              ) : (
                <AppSelect
                  label=" "
                  placeholder="Select specialization"
                  options={specialityOptions}
                  value={selectedSpeciality}
                  onSelect={(value) => {
                    setSelectedSpeciality(value);
                    setSpecialityError("");
                  }}
                  borderRadius={4}
                  borderColor="#9fc9ca"
                  size="small"
                  customCardStyle={styles.accountSelect}
                  errorText={specialityError}
                  dropdownPosition="bottom"
                  maxDropdownHeight={accountDropdownHeight}
                  bottomOffset={accountDropdownBottomOffset}
                />
              )}

              <TouchableOpacity
                style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleContinue}
                disabled={!canContinue}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <AppTypography variant="body" style={styles.continueButtonText}>
                    Continue
                  </AppTypography>
                )}
              </TouchableOpacity>
            </View>

            {showIllustration ? (
              <View style={styles.accountImageSection}>
                <DoctorTabletImage width={accountIllustrationSize} height={accountIllustrationSize} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, isPharmacist && styles.pharmacistSafe]}>
      <StatusBar barStyle="dark-content" backgroundColor={isPharmacist ? "#ffffff" : "#f5f7fa"} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingVertical: verticalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.contentContainer,
            { maxWidth: contentMaxWidth },
            useSplitLayout && styles.contentContainerSplit,
          ]}
        >
          <View
            style={[
              styles.leftSection,
              { maxWidth: copyMaxWidth },
              !useSplitLayout && styles.centerContent,
            ]}
          >
            <View
              style={[
                styles.logoRow,
                !useSplitLayout && styles.centerLogoRow,
                { marginBottom: isCompactHeight ? 18 : isTablet ? 30 : 26 },
              ]}
            >
              <Image
                source={require("../../assets/Banner/logo.png")}
                style={[styles.logoImage, { width: logoSize, height: logoSize }]}
                resizeMode="contain"
              />

              <View>
                <AppTypography variant="h3" style={[styles.logoText, { fontSize: isTablet ? 24 : 18 }]}>
                  Whisper ai.
                </AppTypography>
                <AppTypography variant="caption" style={[styles.logoSubText, { fontSize: isTablet ? 13 : 11 }]}>
                  Smart Care. Simple Access
                </AppTypography>
              </View>
            </View>

            <AppTypography
              variant="h1"
              style={[
                styles.title,
                { fontSize: welcomeTitleSize, marginBottom: isCompactHeight ? 8 : 12 },
                !useSplitLayout && styles.centerText,
              ]}
            >
              {welcomeConfig.title}
            </AppTypography>
            
            <AppTypography
              variant="body"
              style={[
                styles.subtitle,
                {
                  fontSize: welcomeSubtitleSize,
                  lineHeight: isTablet ? 27 : 20,
                  marginBottom: isCompactHeight ? 22 : 32,
                },
                !useSplitLayout && styles.centerText,
              ]}
            >
              {welcomeConfig.subtitle}
            </AppTypography>

            <View style={[styles.section, { gap: isCompactHeight ? 18 : 24 }]}>
              {welcomeConfig.features.map(({ Icon, title, description }) => (
                <View key={title} style={styles.row}>
                  <View style={[styles.iconWrapper, { width: iconSize + 4, height: iconSize + 4 }]}>
                    <Icon width={iconSize} height={iconSize} />
                  </View>
                  <AppTypography variant="body" style={[styles.text, { fontSize: welcomeBodySize, lineHeight: isTablet ? 26 : 20 }]}>
                    <AppTypography variant="body" style={[styles.bold, { fontSize: welcomeBodySize, lineHeight: isTablet ? 26 : 20 }]}>{title} - </AppTypography>
                    {description}
                  </AppTypography>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  marginTop: isCompactHeight ? 24 : 34,
                  maxWidth: welcomeButtonWidth,
                  alignSelf: useSplitLayout ? "flex-start" : "center",
                  paddingVertical: isTablet ? 17 : 15,
                },
              ]}
              activeOpacity={0.85}
              onPress={handleWelcomeCta}
            >
              <AppTypography variant="body" style={styles.buttonText}>{welcomeConfig.buttonLabel}</AppTypography>
            </TouchableOpacity>
          </View>

          {showIllustration ? (
            <View style={styles.imageSection}>
              {isPharmacist ? (
                <Image
                  source={pharmacistImage}
                  style={[
                    styles.pharmacistImage,
                    {
                      width: illustrationSize,
                      height: illustrationSize,
                    },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <DoctorTabletImage width={illustrationSize} height={illustrationSize} />
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  pharmacistSafe: {
    backgroundColor: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  accountScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  accountScrollContentMobile: {
    justifyContent: "flex-start",
  },
  contentContainer: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
  },
  contentContainerSplit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 48,
  },
  leftSection: {
    width: "100%",
    alignSelf: "center",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerLogoRow: {
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  imageSection: {
    flex: 1,
    minWidth: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  pharmacistImage: {
    borderRadius: 18,
  },
  accountContainer: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
  },
  accountContainerMobile: {
    flexGrow: 0,
    justifyContent: "flex-start",
  },
  accountContainerSplit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 72,
  },
  accountForm: {
    width: "100%",
    overflow: "visible",
  },
  accountLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountLogoImage: {
    flexShrink: 0,
  },
  accountTitle: {
    color: "#1a1a1a",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  accountSubtitle: {
    color: "#40474d",
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 260,
    marginBottom: 28,
  },
  locationSelect: {
    marginTop: 16,
    marginBottom: 0,
  },
  accountSelect: {
    height: 38,
  },
  fieldLoadingWrapper: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  fieldLoadingText: {
    color: "#888888",
    fontSize: 12,
  },
  continueButton: {
    minHeight: 42,
    borderRadius: 4,
    backgroundColor: "#2e7d74",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  continueButtonDisabled: {
    backgroundColor: "#9bbfc0",
    opacity: 0.65,
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  accountImageSection: {
    flex: 1,
    minWidth: 340,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoImage: {
    flexShrink: 0,
  },
  logoText: {
    fontWeight: "700",
    color: "#2e7d74",
  },
  logoSubText: {
    color: "#2e7d74",
    marginTop: 2,
  },
  title: {
    fontWeight: "800",
    color: "#1a1a1a",
  },
  subtitle: {
    color: "#666",
    maxWidth: 520,
  },
  section: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  text: {
    flex: 1,
    color: "#444",
    paddingTop: 4,
  },
  bold: {
    fontWeight: "700",
    color: "#1a1a1a",
  },
  button: {
    backgroundColor: "#2e7d74",
    borderRadius: 12,
    width: "100%",
    elevation: 4,
  },
  buttonText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
