import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import HealthProfileField from "./HealthProfileField";
import { PROFILE_TABS } from "./profileFieldsConfig";
import type { TabConfig } from "./profileFieldsConfig";
import {
  getPatientDetails,
  patchPatientDetails,
  mapApiDataToLocalState,
} from "./ProfileService";

type Tab = "Personal" | "Medical" | "Life style";
const TEAL = "#1a8c8c";

function calcCompletion(data: Record<string, string>): number {
  let total = 0, filled = 0;
  PROFILE_TABS.forEach((t) =>
    t.fields.forEach((f) => { total++; if (data[f.key]) filled++; })
  );
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

type Props = {
  onUploadPhoto?: () => void;
};

export default function HealthProfileScreen({ onUploadPhoto }: Props) {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<Tab>("Personal");
  const [data, setData]           = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // ── Load profile from API on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getPatientDetails();
      if (res.success && res.data) {
        setData(mapApiDataToLocalState(res.data));
      } else {
        Alert.alert("Error", res.message ?? "Could not load profile.");
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (key: string, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const completion = calcCompletion(data);

  // ── Save to API ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const res = await patchPatientDetails(data);
    setSaving(false);
    if (res.success) {
      Alert.alert("Saved", "Profile updated successfully.");
    } else {
      Alert.alert("Error", res.message ?? "Failed to save. Try again.");
    }
  };

  // ── Render fields from config ───────────────────────────────────────────────
  const renderTab = (tabCfg: TabConfig) => (
    <>
      {tabCfg.tab === "Personal" && (
        <>
          <View style={styles.nameAvatarRow}>
            <View>
              <Text style={styles.fieldSmallLabel}>Name</Text>
              <Text style={styles.nameValue}>{data.name || "—"}</Text>
            </View>
            <View style={styles.avatarCol}>
              <TouchableOpacity onPress={onUploadPhoto} activeOpacity={0.8}>
                {data.photoUrl ? (
                  <Image source={{ uri: data.photoUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons name="account" size={32} color="#9aabb0" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onUploadPhoto} style={styles.uploadRow} activeOpacity={0.7}>
                <MaterialCommunityIcons name="camera-outline" size={13} color="#7a8c91" />
                <Text style={styles.uploadTxt}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
        </>
      )}

      {tabCfg.fields.map((fieldCfg) => (
        <HealthProfileField
          key={fieldCfg.key}
          config={fieldCfg}
          value={data[fieldCfg.key]}
          onChange={handleChange}
        />
      ))}
    </>
  );

  const currentTabConfig = PROFILE_TABS.find((t) => t.tab === activeTab)!;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={TEAL} />
          <Text style={styles.backTxt}>Your health profile</Text>
          <Text style={styles.progressTxt}>({completion}% Complete)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving
            ? <ActivityIndicator size="small" color={TEAL} />
            : <Text style={styles.saveTxt}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${completion}%` as any }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {PROFILE_TABS.map(({ tab }) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as Tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fields */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {renderTab(currentTabConfig)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e8ecee",
  },
  backBtn:     { flexDirection: "row", alignItems: "center", gap: 2 },
  backTxt:     { fontSize: 14, color: TEAL, fontWeight: "600" },
  progressTxt: { fontSize: 13, color: TEAL, marginLeft: 4 },
  saveTxt:     { fontSize: 14, color: TEAL, fontWeight: "700" },
  progressBarBg:  { height: 3, backgroundColor: "#e0ecee" },
  progressBarFill:{ height: "100%", backgroundColor: TEAL },
  tabRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 22,
    borderWidth: 1, borderColor: "#c5d0d3", alignItems: "center",
  },
  tabActive:    { backgroundColor: "#1a6e6e", borderColor: "#1a6e6e" },
  tabTxt:       { fontSize: 13, fontWeight: "500", color: "#5a6c72" },
  tabTxtActive: { color: "#fff" },
  scroll: { flex: 1 },
  nameAvatarRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  fieldSmallLabel: { fontSize: 12, color: "#9aabb0", marginBottom: 3 },
  nameValue:       { fontSize: 18, fontWeight: "700", color: "#1a2226" },
  avatarCol:       { alignItems: "center", gap: 5 },
  avatarPlaceholder: {
    width: 60, height: 60, borderRadius: 10,
    backgroundColor: "#dde8ea", alignItems: "center", justifyContent: "center",
  },
  avatarImg:   { width: 60, height: 60, borderRadius: 10, resizeMode: "cover" },
  uploadRow:   { flexDirection: "row", alignItems: "center", gap: 3 },
  uploadTxt:   { fontSize: 11, color: "#7a8c91" },
  divider:     { height: 0.5, backgroundColor: "#e8ecee", marginHorizontal: 16, marginBottom: 2 },
});