import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

interface ConsultCardProps {
    image: any;
    title: string;
    description: string;
    cardWidth?: number;
    onConsult?: () => void;
}

function ConsultCard({ image, title, description, cardWidth, onConsult }: ConsultCardProps) {
    return (
        <TouchableOpacity
            style={[styles.cardContainer, cardWidth ? { width: cardWidth } : null]}
            onPress={onConsult}
            activeOpacity={0.8}
        >
            <Image source={image} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardBody}>
                <Text variant="titleSmall" style={styles.cardTitle}>{title}</Text>
                <Text variant="bodySmall" numberOfLines={3} style={styles.cardDesc}>
                    {description}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const consults = [
    {
        id: 1,
        title: 'Dentist',
        description: 'Teething troubles? Schedule a dental checkup',
        image: require('../../assets/specialties/dentist.png'),
    },
    {
        id: 2,
        title: 'Gynecologist',
        description: "Explore for women's health, pregnancy & infertility treatments",
        image: require('../../assets/specialties/gynocologist.png'),
    },
    {
        id: 3,
        title: 'Dietitian/Nutrition',
        description: 'Get guidance on eating right, weight management & sports nutrition',
        image: require('../../assets/specialties/nutrition.png'),
    },
    {
        id: 4,
        title: 'Physiotherapist',
        description: 'Pulled a muscle? Get it treated by a trained physiotherapist',
        image: require('../../assets/specialties/physiotherapist.png'),
    },
];

export default function ConsultSection() {
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const navigation = useNavigation<any>();

    const isTablet     = width >= 768;
    const isMiniTablet = width >= 600 && width < 768;
    const isWide       = isTablet || isMiniTablet;

    // On tablet: ~3 cards visible at once, hinting a 4th
    // On phone:  fixed 160px card
    const CARD_WIDTH = isTablet ? (width - 24 * 2 - 16 * 2) / 3.4
                     : isMiniTablet ? (width - 16 * 2 - 12 * 2) / 2.4
                     : 160;

    const CARD_HEIGHT = isWide ? 180 : 140;

    return (
        <View style={styles.sectionContainer}>
            <View style={[styles.headerRow, isWide && { paddingHorizontal: 24 }]}>
                <View style={[styles.titleBorder, { borderLeftColor: theme.colors.primary }]}>
                    <Text
                        variant={isTablet ? 'titleLarge' : 'titleMedium'}
                        style={styles.mainTitle}
                    >
                        Book an appointment
                    </Text>
                    <Text variant="bodySmall">Find experienced doctors across all specialties</Text>
                </View>
                <Button
                    mode="outlined"
                    style={styles.viewAllBtn}
                    labelStyle={{ fontSize: 12 }}
                    onPress={() => navigation.navigate('Search')}
                >
                    View All
                </Button>
            </View>

            {/* Single horizontal scroll on ALL screen sizes */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    isWide && { paddingHorizontal: 24, gap: 16 },
                ]}
                decelerationRate={isWide ? 'fast' : 'normal'}
                snapToInterval={isWide ? CARD_WIDTH + 16 : undefined}
                snapToAlignment="start"
            >
                {consults.map((s) => (
                    <ConsultCard
                        key={s.id}
                        title={s.title}
                        description={s.description}
                        image={s.image}
                        cardWidth={CARD_WIDTH}
                        onConsult={() => navigation.navigate('Search')}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionContainer: {
        marginVertical: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    titleBorder: {
        borderLeftWidth: 3,
        paddingLeft: 12,
        flex: 1,
        marginRight: 16,
    },
    mainTitle: {
        fontWeight: 'bold',
        marginBottom: 2,
    },
    viewAllBtn: {
        borderRadius: 20,
    },
    scrollContent: {
        paddingHorizontal: 8,
        gap: 8,
    },
    cardContainer: {
        width: 160,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#f0f4f8',
    },
    cardBody: {
        padding: 12,
    },
    cardTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDesc: {
        color: '#666',
        lineHeight: 18,
    },
});