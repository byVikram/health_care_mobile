import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import pregnancyImage from '../../assets/specialties/pregnancy.svg'
import acneImage from '../../assets/specialties/acne.svg'
import performanceImage from '../../assets/specialties/performance.svg'
import coughImage from '../../assets/specialties/cough.svg'
import childImage from '../../assets/specialties/child.svg'
import depressionImage from '../../assets/specialties/depression.svg'
import { Button } from 'react-native-paper'

const TEAL = '#0c7c7c'

const specialities = [
	{ id: 1, title: 'Pregnancy or\nPeriod doubts', icon: pregnancyImage },
	{ id: 2, title: 'Acne, pimple\nor Skin Issues', icon: acneImage },
	{ id: 3, title: 'Performance\nissues in bed', icon: performanceImage },
	{ id: 4, title: 'Cold, cough\nor fever', icon: coughImage },
	{ id: 5, title: 'Child not feeling\nwell', icon: childImage },
	{ id: 6, title: 'Depression or\nanxiety', icon: depressionImage },
]

export default function SpecialitySection() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()

	const isTablet = width >= 768
	const isMiniTablet = width >= 600 && width < 768
	const isWide = isTablet || isMiniTablet

	const availableWidth = width - 32 - 8 * 5
	const CARD_WIDTH = isWide ? availableWidth / 6 : 110
	const BOX_SIZE = isWide ? Math.min(Math.floor(CARD_WIDTH) - 10, 120) : 100

	const handleConsult = () => {
		navigation.navigate('Search', {
			speciality_id: '3c7b1e9d-8a2f-4d6c-b5a1-7f0e2d9a8c55',
		})
	}

	// ✅ Single card component using Image
	const renderCard = (s: (typeof specialities)[0], cardWidth: number, boxSize: number, isTab: boolean) => (
		<TouchableOpacity key={s.id} onPress={handleConsult}>
			<View style={{ width: cardWidth, alignItems: 'center', gap: 6 }}>
				{/* ✅ PNG Image fills box with cover */}

				<View style={[styles.iconBox, { width: boxSize, height: boxSize }]}>
					{/* <Image
          source={s.icon}
          style={{ width: boxSize, height: boxSize }}
          resizeMode="cover"
        /> */}
					<s.icon width={'100%'} height={'100%'} />
				</View>

				<Text style={[styles.cardTitle, isTab && styles.cardTitleTablet]} numberOfLines={2}>
					{s.title}
				</Text>

				{/* <TouchableOpacity onPress={handleConsult}>
        <Text style={[styles.consultText, isTab && styles.consultTextTablet]}>
          Consult Now
        </Text>
      </TouchableOpacity> */}
			</View>
		</TouchableOpacity>
	)

	return (
		<View style={styles.container}>
			{/* ── Header ── */}
			<View style={styles.headerRow}>
				<View style={styles.headerLeft}>
					<Text style={[styles.heading, isTablet && styles.headingTablet]}>
						{/* Consult top doctors online for any health concern */}
					</Text>
					<Text style={[styles.subHeading, isTablet && styles.subHeadingTablet]}>
						Find experienced doctors across all specialties
					</Text>
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

			{isWide ? (
				// TABLET / MINI-TABLET — all 6 in one row
				<View style={styles.tabletGrid}>
					{specialities.map((s) => renderCard(s, CARD_WIDTH, BOX_SIZE, isTablet))}
				</View>
			) : (
				// MOBILE — horizontal scroll
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
				>
					{specialities.map((s) => renderCard(s, CARD_WIDTH, BOX_SIZE, false))}
				</ScrollView>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: 16,
		backgroundColor: '#fff',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 20,
		gap: 12,
	},
	headerLeft: {
		flex: 1,
		borderLeftWidth: 3,
		borderLeftColor: TEAL,
		paddingLeft: 10,
	},
	heading: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111',
		lineHeight: 21,
		marginBottom: 3,
	},
	headingTablet: {
		fontSize: 18,
		lineHeight: 26,
	},
	subHeading: {
		fontSize: 12,
		color: '#777',
		lineHeight: 17,
	},
	subHeadingTablet: {
		fontSize: 14,
		lineHeight: 20,
	},
	viewAllBtn: {
		borderRadius: 20,
	},
	tabletGrid: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 8,
		alignItems: 'flex-start',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 8,
		gap: 10,
	},
	iconBox: {
		borderRadius: 16,
		overflow: 'hidden',
	},
	cardTitle: {
		fontSize: 12,
		fontWeight: '500',
		color: '#222',
		textAlign: 'center',
		lineHeight: 17,
	},
	cardTitleTablet: {
		fontSize: 13,
		lineHeight: 19,
	},
	consultText: {
		fontSize: 13,
		color: TEAL,
		fontWeight: '600',
	},
	consultTextTablet: {
		fontSize: 14,
	},
})
