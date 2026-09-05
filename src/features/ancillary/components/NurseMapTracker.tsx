import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

interface NurseMapTrackerProps {
	nurseAvatar?: string
	etaText?: string
	distanceText?: string
}

export default function NurseMapTracker({
	nurseAvatar,
	etaText = 'Arriving in ~15 mins',
	distanceText = '1.5 km away',
}: NurseMapTrackerProps) {
	return (
		<View style={styles.mapCard}>
			{/* Decorative map background grid */}
			<View style={styles.gridOverlay}>
				{Array.from({ length: 6 }).map((_, i) => (
					<View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
				))}
				{Array.from({ length: 6 }).map((_, i) => (
					<View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 14}%` }]} />
				))}
			</View>

			{/* Route curve line */}
			<View style={styles.routeCurve} />

			{/* Patient / home location pin */}
			<View style={styles.patientPin}>
				<View style={styles.patientPinCircle}>
					<Ionicons name="home" size={16} color="#ffffff" />
				</View>
				<View style={styles.pinTag}>
					<Text style={styles.pinTagText}>Home</Text>
				</View>
			</View>

			{/* Nurse caregiver location pin */}
			<View style={styles.nursePin}>
				<View style={styles.pulseRing} />
				<View style={styles.nursePinCircle}>
					{nurseAvatar ? (
						<Image source={{ uri: nurseAvatar }} style={styles.nurseAvatarImg} />
					) : (
						<Ionicons name="person" size={18} color="#ffffff" />
					)}
				</View>
				<View style={styles.nursePinBadge}>
					<MaterialCommunityIcons name="medical-bag" size={10} color="#2B6F71" />
				</View>
			</View>

			{/* Floating Live Status & Distance Badge */}
			<View style={styles.mapBadgeOverlay}>
				<View style={styles.liveDot} />
				<Ionicons name="navigate-outline" size={14} color="#2B6F71" />
				<Text style={styles.mapBadgeText}>{distanceText} • {etaText}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	mapCard: {
		height: 200,
		borderRadius: 16,
		backgroundColor: '#eaf1f1',
		overflow: 'hidden',
		position: 'relative',
		borderWidth: 1,
		borderColor: '#d2dede',
		marginBottom: 16,
	},
	gridOverlay: {
		...StyleSheet.absoluteFillObject,
	},
	gridLineH: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 1,
		backgroundColor: '#d8e4e4',
	},
	gridLineV: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		width: 1,
		backgroundColor: '#d8e4e4',
	},
	routeCurve: {
		position: 'absolute',
		width: '52%',
		height: '50%',
		left: '26%',
		top: '20%',
		borderTopWidth: 3,
		borderRightWidth: 3,
		borderColor: '#2B6F71',
		borderStyle: 'dashed',
		borderTopRightRadius: 80,
		opacity: 0.8,
	},
	patientPin: {
		position: 'absolute',
		left: '20%',
		bottom: '22%',
		alignItems: 'center',
	},
	patientPinCircle: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#ffffff',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
	},
	pinTag: {
		backgroundColor: 'rgba(43, 111, 113, 0.9)',
		borderRadius: 4,
		paddingHorizontal: 6,
		paddingVertical: 1,
		marginTop: 2,
	},
	pinTagText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#ffffff',
	},
	nursePin: {
		position: 'absolute',
		right: '22%',
		top: '18%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	pulseRing: {
		position: 'absolute',
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: 'rgba(43, 111, 113, 0.2)',
	},
	nursePinCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#1f5f68',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#ffffff',
		overflow: 'hidden',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	nurseAvatarImg: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	nursePinBadge: {
		position: 'absolute',
		bottom: -2,
		right: -2,
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 2,
		borderWidth: 1,
		borderColor: '#d2dede',
	},
	mapBadgeOverlay: {
		position: 'absolute',
		bottom: 12,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#d2dede',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	liveDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#10B981',
	},
	mapBadgeText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#12373E',
	},
})
