import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { API_ENDPOINTS } from "../../constants/apiUrls";
// import { AppSelect, AppSelectOption } from "../../components/AppSelect";
import { AppSelect, AppSelectOption } from "../../components/common/AppSelect";
import { ROUTES } from "../../navigation/routes";
import type { AppStackScreenProps } from "../../navigation/types";

type Speciality = {
  id: string;
  label: string;
  icon_key: string;
};

const MOCK_LOCATIONS: AppSelectOption[] = [
  { label: "Bangalore", value: "bangalore" },
  { label: "Mumbai", value: "mumbai" },
  { label: "Delhi", value: "delhi" },
  { label: "Chennai", value: "chennai" },
  { label: "Hyderabad", value: "hyderabad" },
  { label: "Pune", value: "pune" },
  { label: "Kolkata", value: "kolkata" },
  { label: "Ahmedabad", value: "ahmedabad" },
  { label: "Jaipur", value: "jaipur" },
  { label: "Surat", value: "surat" },
  { label: "Kochi", value: "kochi" },
  { label: "Chandigarh", value: "chandigarh" },
];

export default function AccountPage({
  navigation,
}: AppStackScreenProps<typeof ROUTES.STACK.ACCOUNT>) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>("");

  const [locationOptions] = useState<AppSelectOption[]>(MOCK_LOCATIONS);
  const [specialityOptions, setSpecialityOptions] = useState<AppSelectOption[]>([]);

  const [loadingSpecialities, setLoadingSpecialities] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [locationError, setLocationError] = useState("");
  const [specialityError, setSpecialityError] = useState("");

  // Fetch specialities from API
  useEffect(() => {
    fetch(API_ENDPOINTS.SPECIALITIES.LIST)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const options: AppSelectOption[] = json.data.map((s: Speciality) => ({
            label: s.label,
            value: s.id,
          }));
          setSpecialityOptions(options);
        }
      })
      .catch((err) => console.error("Specialities fetch error:", err))
      .finally(() => setLoadingSpecialities(false));
  }, []);

  const canContinue = !!selectedLocation && !!selectedSpeciality;

  const handleContinue = async () => {
    // Validate
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

    setSubmitting(true);
    try {
      // Uncomment when API is ready:
      // await fetch(API_ENDPOINTS.DOCTOR_PROFILE.DETAILS, {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     location_id: selectedLocation,
      //     speciality_id: selectedSpeciality,
      //   }),
      // });
      navigation.navigate(ROUTES.MAIN.TABS);
    } catch (err) {
      console.error("Continue error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <View style={styles.container}>

        {/* ── Logo ── */}
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

        {/* ── Title ── */}
        <Text style={styles.title}>Account Details</Text>
        <Text style={styles.subtitle}>
          We just need some more details before we can get you started
        </Text>

        {/* ── Location (mock data — always ready) ── */}
        <AppSelect
          label="Location *"
          placeholder="Select your location"
          options={locationOptions}
          value={selectedLocation}
          onSelect={(val) => {
            setSelectedLocation(val);
            setLocationError("");
          }}
          borderRadius={8}
          borderColor="#dde3e8"
          errorText={locationError}
        />

        {/* ── Speciality (from API) ── */}
        {loadingSpecialities ? (
          <View style={styles.fieldLoadingWrapper}>
            <ActivityIndicator size="small" color="#2e7d74" />
            <Text style={styles.fieldLoadingText}>Loading specialities...</Text>
          </View>
        ) : (
          <AppSelect
            label="Speciality *"
            placeholder="Select specialization"
            options={specialityOptions}
            value={selectedSpeciality}
            onSelect={(val) => {
              setSelectedSpeciality(val);
              setSpecialityError("");
            }}
            borderRadius={8}
            borderColor="#dde3e8"
            errorText={specialityError}
          />
        )}

        <View style={{ flex: 1 }} />

        {/* ── Continue Button ── */}
        <TouchableOpacity
          style={[
            styles.button,
            (!canContinue || submitting) && styles.buttonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleContinue}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    backgroundColor: "#f5f7fa",
  },

  /* Logo */
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    gap: 10,
  },
  logoImage: {
    width: 44,
    height: 44,
    marginRight: 2,
  },
  logoText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2e7d74",
    letterSpacing: 0.2,
  },
  logoSubText: {
    fontSize: 10,
    color: "#5a9e98",
    marginTop: 1,
  },

  /* Title */
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 19,
    marginBottom: 32,
  },

  /* Field loading */
  fieldLoadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  fieldLoadingText: {
    fontSize: 13,
    color: "#888888",
  },

  /* Button */
  button: {
    backgroundColor: "#2e7d74",
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: "#a8ccc9",
  },
  buttonText: {
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
