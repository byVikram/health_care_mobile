import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { RideStatus } from '../../../types/transportation'

interface RideMapTrackerProps {
	status: RideStatus
	pickupLabel: string
	dropoffLabel: string
}

export default function RideMapTracker({ status, pickupLabel, dropoffLabel }: RideMapTrackerProps) {
	const [carProgress, setCarProgress] = useState(0) // 0 to 100

	useEffect(() => {
		if (status === 'in_transit') {
			const interval = setInterval(() => {
				setCarProgress((prev) => (prev >= 100 ? 0 : prev + 4))
			}, 200)
			return () => clearInterval(interval)
		} else if (status === 'completed') {
			setCarProgress(100)
		} else if (status === 'dispatched') {
			setCarProgress(25)
		} else {
			setCarProgress(0)
		}
	}, [status])

	return (
		<View style={styles.container}>
			<View style={styles.mapCard}>
				{/* Decorative background grid/road lines */}
				<View style={styles.roadBgHorizontal} />
				<View style={styles.roadBgVertical} />

				{/* Progress Line */}
				<View style={styles.pathContainer}>
					<View style={styles.pathLineBackground} />
					<View style={[styles.pathLineActive, { width: `${carProgress}%` }]} />
				</View>

				{/* Pickup Pin */}
				<View style={styles.pickupPinContainer}>
					<View style={styles.pickupBadge}>
						<Text style={styles.pickupBadgeText}>{pickupLabel}</Text>
					</View>
					<MaterialCommunityIcons name="map-marker-radius" size={24} color="#00796b" />
				</View>

				{/* Dropoff Pin */}
				<View style={styles.dropoffPinContainer}>
					<View style={styles.dropoffBadge}>
						<Text style={styles.dropoffBadgeText}>{dropoffLabel}</Text>
					</View>
					<MaterialCommunityIcons name="map-marker" size={24} color="#d32f2f" />
				</View>

				{/* Moving Car Icon */}
				{status !== 'scheduled' && status !== 'requesting' && (
					<View style={[styles.carMarkerContainer, { left: `${Math.min(Math.max(carProgress, 5), 85)}%` }]}>
						<View style={styles.carBubble}>
							<MaterialCommunityIcons name="car-side" size={20} color="#0c7c7c" />
						</View>
					</View>
				)}

				{/* Status Overlay Footer */}
				<View style={styles.mapFooter}>
					<MaterialCommunityIcons
						name={
							status === 'scheduled'
								? 'clock-outline'
								: status === 'requesting'
								? 'radar'
								: status === 'dispatched'
								? 'car-connected'
								: status === 'in_transit'
								? 'navigation-variant'
								: 'check-circle'
						}
						size={16}
						color="#0c7c7c"
					/>
					<Text style={styles.mapFooterText}>
						{status === 'scheduled'
							? 'Cab Reserved'
							: status === 'requesting'
							? 'Searching Nearby Drivers...'
							: status === 'dispatched'
							? 'Driver En Route to Pickup'
							: status === 'in_transit'
							? 'In Transit • Live Location Sync'
							: 'Trip Completed'}
					</Text>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	mapCard: {
		height: 160,
		borderRadius: 16,
		backgroundColor: '#e0f2f1',
		position: 'relative',
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#b2dfdb',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	roadBgHorizontal: {
		position: 'absolute',
		top: '48%',
		left: 0,
		right: 0,
		height: 12,
		backgroundColor: '#ffffff80',
		transform: [{ rotate: '-3deg' }],
	},
	roadBgVertical: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: '50%',
		width: 14,
		backgroundColor: '#ffffff60',
		transform: [{ rotate: '12deg' }],
	},
	pathContainer: {
		position: 'absolute',
		left: 40,
		right: 40,
		top: 75,
		height: 6,
	},
	pathLineBackground: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		backgroundColor: '#b2dfdb',
		borderRadius: 3,
	},
	pathLineActive: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		backgroundColor: '#0c7c7c',
		borderRadius: 3,
	},
	pickupPinContainer: {
		position: 'absolute',
		left: 20,
		top: 45,
		alignItems: 'center',
	},
	pickupBadge: {
		backgroundColor: '#00796b',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginBottom: 2,
	},
	pickupBadgeText: {
		color: '#ffffff',
		fontSize: 9,
		fontWeight: 'bold',
	},
	dropoffPinContainer: {
		position: 'absolute',
		right: 20,
		top: 45,
		alignItems: 'center',
	},
	dropoffBadge: {
		backgroundColor: '#d32f2f',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginBottom: 2,
	},
	dropoffBadgeText: {
		color: '#ffffff',
		fontSize: 9,
		fontWeight: 'bold',
	},
	carMarkerContainer: {
		position: 'absolute',
		top: 48,
		zIndex: 5,
	},
	carBubble: {
		backgroundColor: '#ffffff',
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 3,
		borderWidth: 1.5,
		borderColor: '#0c7c7c',
	},
	mapFooter: {
		position: 'absolute',
		bottom: 8,
		left: 16,
		right: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: 'rgba(255, 255, 255, 0.85)',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		alignSelf: 'center',
	},
	mapFooterText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#0c7c7c',
	},
})
