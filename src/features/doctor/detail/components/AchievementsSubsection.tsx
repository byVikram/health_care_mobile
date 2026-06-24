import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTypography } from "../../../../components/common";
import { DETAIL_PRIMARY } from "./constants";
import type { AchievementItem } from "./types";

interface AchievementsSubsectionProps {
  achievements: AchievementItem[];
  onAchievementPress: (achievement: AchievementItem) => void;
}

export function AchievementsSubsection({
  achievements,
  onAchievementPress,
}: AchievementsSubsectionProps) {
  return (
    <View style={styles.achievementsSection}>
      <View style={styles.achievementsHeader}>
        <MaterialCommunityIcons name="trophy-outline" size={18} color={DETAIL_PRIMARY} />
        <AppTypography variant="body" style={styles.backgroundSectionTitle}>
          Achievements
        </AppTypography>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsScrollContent}
      >
        {achievements.map((achievement) => (
          <TouchableOpacity
            key={achievement.id}
            style={styles.achievementCard}
            activeOpacity={0.86}
            onPress={() => onAchievementPress(achievement)}
          >
            <Image
              source={{ uri: achievement.imageUrl }}
              style={styles.achievementImage}
              resizeMode="cover"
            />
            <View style={styles.achievementContent}>
              <AppTypography variant="caption" style={styles.achievementCategory}>
                {achievement.category}
              </AppTypography>
              <AppTypography variant="body" style={styles.achievementTitle} numberOfLines={3}>
                {achievement.title}
              </AppTypography>
              <AppTypography
                variant="caption"
                style={styles.achievementSummary}
                numberOfLines={3}
              >
                {achievement.description}
              </AppTypography>
              <View style={styles.achievementViewMoreRow}>
                <Text style={styles.achievementViewMoreText}>View More</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={DETAIL_PRIMARY} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  achievementsSection: {
    paddingVertical: 2,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backgroundSectionTitle: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
    marginLeft: 8,
  },
  achievementsScrollContent: {
    paddingTop: 2,
    paddingBottom: 6,
    paddingRight: 6,
  },
  achievementCard: {
    width: 210,
    minHeight: 286,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eef1f1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  achievementImage: {
    width: "100%",
    height: 112,
    backgroundColor: "#edf3f3",
  },
  achievementContent: {
    flex: 1,
    padding: 12,
  },
  achievementCategory: {
    color: DETAIL_PRIMARY,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  achievementTitle: {
    color: "#111",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  achievementSummary: {
    color: "#666",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  achievementViewMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  achievementViewMoreText: {
    color: DETAIL_PRIMARY,
    fontSize: 12,
    fontWeight: "800",
  },
});
