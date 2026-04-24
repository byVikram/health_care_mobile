import React, { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../../../components/common/AppHeader";

/**
 * SearchPage
 *
 * Shown after tapping the search bar on the Home screen.
 * The user types their query here and presses the keyboard's Search key
 * (or taps submit) to navigate to DoctorSearchPage with the query.
 *
 * Flow:  Home → SearchPage (type here) → DoctorSearchPage (results)
 */
export default function SearchPage() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigation.navigate("DoctorSearchPage", { query: trimmed });
  };

  return (
    <View style={styles.container}>
      {/*
        variant="search" → shows only location row + editable search bar.
        autoFocus={true} (via isSearchEditable) opens keyboard immediately.
        onSearchSubmit fires when the user presses the Search key.
      */}
      <AppHeader
        variant="search"
        location="KR Market"
        onAvatarPress={() => navigation.goBack()}
        isSearchEditable={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Empty state hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          Type a doctor name, symptom, or speciality and press Search
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  hintContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  hintText: {
    fontSize: 15,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 22,
  },
});


