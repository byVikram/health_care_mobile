import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';

const communities = [
	{ id: 1, name: 'Diabatics Associations', location: 'Rajajinagar, Bengaluru' },
	{ id: 2, name: 'Lions Health Club', location: 'Koramangala, Bengaluru' },
];

const blogs = [
	{
		id: 1,
		title: 'The Future of Digital Health: What to Expect!',
		description: 'Explore how technology is transforming healthcare, from AI diagnostics to personalized treatment plans.',
		author: 'Dr. Emily White',
		date: '15 May 2024',
	},
	{
		id: 2,
		title: 'Understanding Telemedicine: Your Guide to Virtual Care',
		description: 'A comprehensive guide to telemedicine services, benefits, and how to get started.',
		author: 'Dr. Emily White',
		date: '15 May 2024',
	},
];

export default function CommunityBlogsSection() {
    return (
        <View style={styles.container}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Community & Blogs</Text>

            {/* Communities */}
            {communities.map(c => (
                <View key={c.id} style={styles.communityRow}>
                    <View style={styles.communityAvatar} />
                    <View style={styles.communityInfo}>
                        <Text variant="titleSmall">{c.name}</Text>
                        <Text variant="labelSmall" style={{ color: '#666' }}>{c.location}</Text>
                    </View>
                    <Button mode="outlined" compact labelStyle={{ fontSize: 10 }}>View</Button>
                </View>
            ))}

            {/* Blogs horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blogScroll}>
                {blogs.map(b => (
                    <Card key={b.id} style={styles.blogCard}>
                        <View style={styles.blogImage} />
                        <Card.Content style={styles.blogContent}>
                            <Text variant="titleSmall" numberOfLines={2} style={styles.blogTitle}>{b.title}</Text>
                            <Text variant="bodySmall" numberOfLines={3} style={styles.blogDesc}>{b.description}</Text>
                            
                            <View style={styles.blogFooter}>
                                <Text variant="labelSmall" style={{ color: '#666' }}>{b.author}</Text>
                                <Text variant="labelSmall" style={{ color: '#666' }}>{b.date}</Text>
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
        fontWeight: 'bold',
        marginBottom: 12,
        paddingHorizontal: 16,
        textAlign: 'center'
    },
    communityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
        elevation: 1,
    },
    communityAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f4f8',
        marginRight: 12,
    },
    communityInfo: {
        flex: 1,
    },
    blogScroll: {
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 24,
    },
    blogCard: {
        width: 240,
        marginHorizontal: 8,
        backgroundColor: '#fff',
        overflow: 'hidden'
    },
    blogImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#e0e0e0',
    },
    blogContent: {
        padding: 12,
        flex: 1,
        justifyContent: 'space-between'
    },
    blogTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    blogDesc: {
        color: '#666',
        marginBottom: 12,
    },
    blogFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto'
    }
});
