import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

interface NurseMapTrackerProps {
	nurseAvatar?: string
	etaText?: string
}

export default function NurseMapTracker({ nurseAvatar, etaText = 'Live location syncing' }: NurseMapTrackerProps) {
	return (
		<View style={styles.mapCard}>
			{/* Decorative map background grid */}
			<View style={styles.gridOverlay}>
				{Array.from({ length: 5 }).map((_, i) => (
					<View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 16}%` }]} />
				))}
				{Array.from({ length: 5 }).map((_, i) => (
					<View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16}%` }]} />
				))}
			</View>

			{/* Route curve */}
			<View style={styles.routeCurve} />

			{/* Patient / home pin */}
			<View style={styles.patientPin}>
				<View style={styles.patientPinCircle}>
					<Ionicons name="home" size={18} color="#ffffff" />
				</View>
			</View>

			{/* Nurse pin */}
			<View style={styles.nursePin}>
				<View style={styles.nursePinCircle}>
					{nurseAvatar ? (
						<Ionicons name="person" size={20} color="#ffffff" />
					) : (
						<Ionicons name="person" size={20} color="#ffffff" />
					)}
				</View>
				<View style={styles.nursePinBadge}>
					<MaterialCommunityIcons name="medical-bag" size={10} color="#296769" />
				</View>
			</View>

			{/* Status footer */}
			<View style={styles.mapFooter}>
				<Ionicons name="navigate" size={14} color="#296769" />
				<Text style={styles.mapFooterText}>{etaText}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	mapCard: {
		height: 220,
		borderRadius: 16,
		backgroundColor: '#eceeee',
		overflow: 'hidden',
		position: 'relative',
		borderWidth: 1,
		borderColor: '#e1e3e3',
	},
	gridOverlay: {
		...StyleSheet.absoluteFillObject,
	},
	gridLineH: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 1,
		backgroundColor: '#dadcdc',
	},
	gridLineV: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		width: 1,
		backgroundColor: '#dadcdc',
	},
	routeCurve: {
		position: 'absolute',
		width: '55%',
		height: '55%',
		left: '24%',
		top: '18%',
		borderTopWidth: 3,
		borderRightWidth: 3,
		borderColor: '#2B6F71',
		borderStyle: 'dashed',
		borderTopRightRadius: 100,
		opacity: 0.7,
	},
	patientPin: {
		position: 'absolute',
		left: '22%',
		bottom: '26%',
	},
	patientPinCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
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
	nursePin: {
		position: 'absolute',
		right: '22%',
		top: '20%',
	},
	nursePinCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#296769',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#ffffff',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	nursePinBadge: {
		position: 'absolute',
		bottom: -2,
		right: -2,
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 2,
	},
	mapFooter: {
		position: 'absolute',
		bottom: 10,
		left: 10,
		right: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		backgroundColor: 'rgba(255,255,255,0.9)',
		paddingVertical: 6,
		borderRadius: 10,
	},
	mapFooterText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#296769',
	},
})
