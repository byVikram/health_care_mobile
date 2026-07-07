import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTypography } from "../../../../components/common";
import { DETAIL_PRIMARY } from "./constants";
import type { AchievementItem } from "./types";

interface AchievementDetailsContentProps {
  achievement: AchievementItem;
}

export function AchievementDetailsContent({ achievement }: AchievementDetailsContentProps) {
  return (
    <View style={styles.achievementDetailsContent}>
      <Image
        source={{ uri: achievement.imageUrl }}
        style={styles.achievementDetailsImage}
        resizeMode="cover"
      />

      <AppTypography variant="h3" style={styles.achievementDetailsTitle}>
        {achievement.title}
      </AppTypography>

      <View style={styles.achievementDetailsSection}>
        <View style={styles.achievementDetailsIconBox}>
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={DETAIL_PRIMARY} />
        </View>
        <View style={styles.achievementDetailsTextBlock}>
          <AppTypography variant="caption" style={styles.achievementDetailsLabel}>
            Awarded On
          </AppTypography>
          <AppTypography variant="caption" style={styles.achievementDetailsValue}>
            {achievement.awardedOn}
          </AppTypography>
        </View>
      </View>

      <View style={styles.achievementDetailsSection}>
        <View style={styles.achievementDetailsIconBox}>
          <MaterialCommunityIcons name="bank-outline" size={18} color={DETAIL_PRIMARY} />
        </View>
        <View style={styles.achievementDetailsTextBlock}>
          <AppTypography variant="caption" style={styles.achievementDetailsLabel}>
            Issuing Organization
          </AppTypography>
          <AppTypography variant="caption" style={styles.achievementDetailsValue}>
            {achievement.issuingOrganization}
          </AppTypography>
        </View>
      </View>

      <View style={[styles.achievementDetailsSection, styles.achievementDetailsSectionLast]}>
        <View style={styles.achievementDetailsIconBox}>
          <MaterialCommunityIcons name="text-box-outline" size={18} color={DETAIL_PRIMARY} />
        </View>
        <View style={styles.achievementDetailsTextBlock}>
          <AppTypography variant="caption" style={styles.achievementDetailsLabel}>
            Description
          </AppTypography>
          <AppTypography variant="caption" style={styles.achievementDetailsDescription}>
            {achievement.description}
          </AppTypography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  achievementDetailsContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 34,
  },
  achievementDetailsImage: {
    width: "100%",
    aspectRatio: 1.75,
    borderRadius: 14,
    backgroundColor: "#edf3f3",
    marginBottom: 16,
  },
  achievementDetailsTitle: {
    color: "#111",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "800",
    marginBottom: 14,
  },
  achievementDetailsSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#eef1f1",
  },
  achievementDetailsSectionLast: {
    paddingBottom: 4,
  },
  achievementDetailsIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${DETAIL_PRIMARY}12`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  achievementDetailsTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  achievementDetailsLabel: {
    color: "#333",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  achievementDetailsValue: {
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
  },
  achievementDetailsDescription: {
    color: "#555",
    fontSize: 13,
    lineHeight: 20,
  },
});
