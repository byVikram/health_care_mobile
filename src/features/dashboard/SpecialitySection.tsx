import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface SpecialityCardProps {
	iconName: keyof typeof MaterialCommunityIcons.glyphMap;
	title: string;
	onConsult?: () => void;
}

function SpecialityCard({ iconName, title, onConsult }: SpecialityCardProps) {
	const theme = useTheme();

	return (
		<View style={styles.cardContainer}>
			<View style={[styles.iconBox, { backgroundColor: '#f0f4f8' }]}>
				<MaterialCommunityIcons name={iconName} size={40} color={theme.colors.primary} />
			</View>
			<Text variant="bodySmall" numberOfLines={2} style={styles.cardTitle}>
				{title}
			</Text>
		</View>
	);
}

const specialities: { id: number; title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
	{ id: 1, title: 'Pregnancy Doubts', icon: 'human-pregnant' },
	{ id: 2, title: 'Acne & Skin', icon: 'face-man-shimmer' },
	{ id: 3, title: 'Performance Issues', icon: 'bed' },
	{ id: 4, title: 'Cold & Cough', icon: 'thermometer' },
	{ id: 5, title: 'Child Health', icon: 'baby-carriage' },
	{ id: 6, title: 'Mental Health', icon: 'head-heart' },
];

export default function SpecialitySection() {
	const theme = useTheme();
	const navigation = useNavigation<any>();

	return (
		<View style={styles.sectionContainer}>
			<View style={styles.headerRow}>
				<View style={[styles.titleBorder, { borderLeftColor: theme.colors.primary }]}>
					<Text variant="titleMedium" style={styles.mainTitle}>Access top specialists instantly</Text>
					<Text variant="bodySmall">Find experienced doctors across all fields</Text>
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

			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				{specialities.map((s) => (
					<SpecialityCard
						key={s.id}
						title={s.title}
						iconName={s.icon}
						onConsult={() => navigation.navigate('Search')}
					/>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	sectionContainer: {
		marginVertical: 42,
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
	},
	cardContainer: {
		alignItems: 'center',
		width: 100,
		marginHorizontal: 8,
	},
	iconBox: {
		width: 72,
		height: 72,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
	},
	cardTitle: {
		textAlign: 'center',
		fontWeight: '600',
	}
});
