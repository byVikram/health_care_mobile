import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import Blog1 from "../../assets/blog-and-community/blog-1.svg";
import Blog2 from "../../assets/blog-and-community/blog-2.svg";
import Community1 from "../../assets/blog-and-community/community-1.svg";


const communities = [
  {
    id: 1,
    name: "Diabatics Associations",
    location: "Rajajinagar, Bengaluru",
    ImageComponent: Community1,
  },
  {
    id: 2,
    name: "Lions Health Club",
    location: "Koramangala, Bengaluru",
    ImageComponent:  Community1,
  },
];

const blogs = [
  {
    id: 1,
    ImageComponent: Blog1,
    title: "The Future of Digital Health: What to Expect!",
    description:
      "Explore how technology is transforming healthcare, from AI diagnostics to personalized treatment plans.",
    author: "Dr. Emily White",
    date: "15 May 2024",
  },
  {
    id: 2,
    ImageComponent: Blog2,
    title: "Understanding Telemedicine: Your Guide to Virtual Care",
    description:
      "A comprehensive guide to telemedicine services, benefits, and how to get started.",
    author: "Dr. Emily White",
    date: "15 May 2024",
  },
];

const CARD_WIDTH = 240;
const IMAGE_HEIGHT = 120;
const COMMUNITY_AVATAR_SIZE = 44;

export default function CommunityBlogsSection() {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Community & Blogs
      </Text>

      {communities.map((c) => (
        <View key={c.id} style={styles.communityRow}>
          {/* SVG avatar */}
          <View style={styles.communityAvatar}>
            <c.ImageComponent
              width={COMMUNITY_AVATAR_SIZE}
              height={COMMUNITY_AVATAR_SIZE}
            />
          </View>

          <View style={styles.communityInfo}>
            <Text variant="titleSmall">{c.name}</Text>
            <Text variant="labelSmall" style={styles.locationText}>
              {c.location}
            </Text>
          </View>

          <Button mode="outlined" compact labelStyle={styles.viewBtnLabel}>
            View
          </Button>
        </View>
      ))}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.blogScroll}
      >
        {blogs.map((b) => (
          <Card key={b.id} style={styles.blogCard}>
            <View style={styles.blogImageContainer}>
              <View style={StyleSheet.absoluteFillObject}>
                <b.ImageComponent
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid slice"
                />
              </View>
            </View>

            <Card.Content style={styles.blogContent}>
              <Text variant="titleSmall" numberOfLines={2} style={styles.blogTitle}>
                {b.title}
              </Text>
              <Text variant="bodySmall" numberOfLines={3} style={styles.blogDesc}>
                {b.description}
              </Text>
              <View style={styles.blogFooter}>
                <Text variant="labelSmall" style={styles.locationText}>
                  {b.author}
                </Text>
                <Text variant="labelSmall" style={styles.locationText}>
                  {b.date}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 12,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    elevation: 1,
  },
  communityAvatar: {
    width: COMMUNITY_AVATAR_SIZE,
    height: COMMUNITY_AVATAR_SIZE,
    borderRadius: COMMUNITY_AVATAR_SIZE / 2,
    backgroundColor: "#f0f4f8",
    marginRight: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  communityInfo: {
    flex: 1,
  },
  locationText: {
    color: "#666",
  },
  viewBtnLabel: {
    fontSize: 10,
  },
  blogScroll: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  blogCard: {
    width: CARD_WIDTH,
    marginHorizontal: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderRadius: 12,
  },
  blogImageContainer: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#f0f4f8",
  },
  blogContent: {
    padding: 12,
    flex: 1,
    justifyContent: "space-between",
  },
  blogTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  blogDesc: {
    color: "#666",
    marginBottom: 12,
  },
  blogFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
  },
});