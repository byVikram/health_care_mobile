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

export default function BlogsSection() {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Blogs
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {blogs.map((b) => (
          <Card key={b.id} style={styles.card}>
            <View style={styles.imageBox}>
              <b.ImageComponent width="100%" height="100%" />
            </View>

            <Card.Content>
              <Text numberOfLines={2} style={styles.blogTitle}>
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
    marginTop: 12,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 10,
  },
  card: {
    width: 240,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  imageBox: {
    height: 120,
    backgroundColor: "#eee",
  },
  blogTitle: {
    fontWeight: "bold",
    marginTop: 6,
  },
  desc: {
    color: "#666",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  meta: {
    fontSize: 10,
    color: "#777",
  },
});