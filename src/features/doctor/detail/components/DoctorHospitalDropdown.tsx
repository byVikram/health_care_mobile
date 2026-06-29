import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DETAIL_PRIMARY } from "./constants";
import type { HospitalItem } from "./types";

interface DoctorHospitalDropdownProps {
  hospitals: HospitalItem[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospitalId: string) => void;
  loading?: boolean;
}

export function DoctorHospitalDropdown({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  loading = false,
}: DoctorHospitalDropdownProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<any>(null);

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  const openDropdown = () => {
    if (hospitals.length <= 1) return;
    buttonRef.current?.measure(
      (_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
        setDropdownPos({ top: py + height, left: px, width });
        setDropdownVisible(true);
      }
    );
  };

  const handleSelect = (item: HospitalItem) => {
    onSelectHospital(item.id);
    setDropdownVisible(false);
  };

  return (
    <>
      <Pressable ref={buttonRef} style={styles.selector} onPress={openDropdown}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#fff" />
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedHospital?.label || (loading ? "Loading..." : "Select Hospital")}
        </Text>
        {hospitals.length > 1 && <Text style={styles.extraCount}>+{hospitals.length - 1}</Text>}
        {hospitals.length > 1 && (
          <MaterialCommunityIcons name="chevron-down" size={18} color="#fff" />
        )}
      </Pressable>

      <Modal visible={dropdownVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          <View
            style={[
              styles.dropdownBox,
              { top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width },
            ]}
          >
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={DETAIL_PRIMARY} />
              </View>
            ) : (
              <FlatList
                data={hospitals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedHospitalId === item.id && {
                        backgroundColor: `${DETAIL_PRIMARY}15`,
                      },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.dropdownTitle}>{item.label}</Text>
                    {!!item.address && <Text style={styles.dropdownAddress}>{item.address}</Text>}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#276668",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: 320,
  },
  selectorText: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  extraCount: {
    color: "#d8f3f5",
    fontSize: 12,
    marginHorizontal: 6,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  dropdownBox: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 300,
    elevation: 10,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  dropdownTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#222",
  },
  dropdownAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  centerBox: {
    padding: 20,
    alignItems: "center",
  },
});
