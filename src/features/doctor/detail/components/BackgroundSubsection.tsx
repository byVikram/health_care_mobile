import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTypography } from "../../../../components/common";
import { DETAIL_PRIMARY } from "./constants";
import type { BackgroundListItem } from "./types";

interface BackgroundSubsectionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  items: BackgroundListItem[];
  emptyText?: string;
}

export function BackgroundSubsection({
  icon,
  title,
  items,
  emptyText,
}: BackgroundSubsectionProps) {
  return (
    <View style={styles.backgroundSection}>
      <View style={styles.backgroundSectionHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={DETAIL_PRIMARY} />
        <AppTypography variant="body" style={styles.backgroundSectionTitle}>
          {title}
        </AppTypography>
      </View>
      {items.length > 0 ? (
        items.map((item) => (
          <View key={item.id} style={styles.backgroundListItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={14}
              color={DETAIL_PRIMARY}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppTypography variant="caption" style={styles.backgroundItemLabel}>
                {item.label}
              </AppTypography>
              {!!item.sublabel && (
                <AppTypography variant="caption" style={styles.backgroundItemSublabel}>
                  {item.sublabel}
                </AppTypography>
              )}
            </View>
          </View>
        ))
      ) : emptyText ? (
        <AppTypography variant="caption" style={styles.backgroundEmptyText}>
          {emptyText}
        </AppTypography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f4f4",
  },
  backgroundSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backgroundSectionTitle: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
    marginLeft: 8,
  },
  backgroundListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  backgroundItemLabel: {
    color: "#444",
    fontWeight: "600",
  },
  backgroundItemSublabel: {
    color: "#999",
    marginTop: 2,
  },
  backgroundEmptyText: {
    color: "#999",
    fontStyle: "italic",
    lineHeight: 18,
  },
});
