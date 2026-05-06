import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Card } from "react-native-paper";

import Blog1 from "../../assets/blog-and-community/blog-1.svg";
import Blog2 from "../../assets/blog-and-community/blog-2.svg";

const blogs = [
  {
    id: 1,
    ImageComponent: Blog1,
    title: "The Future of Digital Health",
    description:
      "Explore how AI is transforming healthcare with personalized treatments.",
    author: "Dr. Emily White",
    date: "15 May 2024",
  },
  {
    id: 2,
    ImageComponent: Blog2,
    title: "Understanding Telemedicine",
    description: "A guide to virtual care and its benefits.",
    author: "Dr. Emily White",
    date: "15 May 2024",
  },
];

const CARD_WIDTH = 240;
const IMAGE_HEIGHT = 120;

export default function BlogsSection() {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Blogs
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {blogs.map((b) => (
          <Card key={b.id} style={styles.card}>
            
            {/* IMAGE SECTION (full cover style) */}
            <View style={styles.imageContainer}>
              <View style={StyleSheet.absoluteFillObject}>
                <b.ImageComponent
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid slice"
                />
              </View>
            </View>

            {/* CONTENT */}
            <Card.Content style={styles.content}>
              <Text numberOfLines={2} style={styles.titleText}>
                {b.title}
              </Text>

              <Text numberOfLines={3} style={styles.desc}>
                {b.description}
              </Text>

              <View style={styles.footer}>
                <Text style={styles.meta}>{b.author}</Text>
                <Text style={styles.meta}>{b.date}</Text>
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

  title: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 12,
  },

  scroll: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },

  card: {
    width: CARD_WIDTH,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  imageContainer: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: "#f0f4f8",
    overflow: "hidden",
  },

  content: {
    padding: 12,
    justifyContent: "space-between",
  },

  titleText: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
  },

  desc: {
    color: "#666",
    fontSize: 12,
    marginBottom: 12,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
  },

  meta: {
    fontSize: 10,
    color: "#777",
  },
});