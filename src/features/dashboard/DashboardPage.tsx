import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { AppTypography, AppButton } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import HeroSection from './HeroSection';
import SpecialitySection from './SpecialitySection';
import ConsultSection from './ConsultSection';
import CommunityBlogsSection from './CommunityBlogsSection';

export default function DashboardPage() {
	const { clearAuth, user } = useAuth();
	const theme = useTheme();

	return (
		<ScrollView style={styles.container}>
			<HeroSection />

			<SpecialitySection />
			<ConsultSection />
			<CommunityBlogsSection />

			{/* Emergency Placeholder */}
			<Card style={[styles.card, { backgroundColor: '#ffebee', marginTop: 16 }]}>
				<Card.Content>
					<AppTypography variant="h4" style={{ color: theme.colors.error, fontWeight: 'bold' }}>Emergency Services</AppTypography>
					<AppTypography variant="caption" style={{ marginTop: 4 }}>Call an ambulance instantly.</AppTypography>
				</Card.Content>
			</Card>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5'
	},
	card: {
		marginHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		marginHorizontal: 16,
		marginBottom: 12,
		fontWeight: 'bold'
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 8,
	},
	gridItem: {
		width: '45%',
		margin: '2.5%',
		justifyContent: 'center',
		height: 100
	}
});
