import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	Easing,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/display/AppTypography'

interface NursePulseRadarViewProps {
	patientAddress?: string
	serviceName?: string
	onCancelSearch?: () => void
}

const SEARCH_TICKERS = [
	'Scanning nearby registered nurses within 3km...',
	'Matching with certified Wound Care & Injection RNs...',
	'Transmitting vital requirements & delivery location...',
	'Awaiting nurse acceptance & ETA calculation...',
]

export default function NursePulseRadarView({
	patientAddress = '42 Healthcare Avenue, Sector 18, New Delhi',
	serviceName = 'In-Home Nursing Care',
	onCancelSearch,
}: NursePulseRadarViewProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [pulseAnim] = useState(new Animated.Value(0))
	const [tickerIndex, setTickerIndex] = useState(0)
	const [progressAnim] = useState(new Animated.Value(0))

	useEffect(() => {
		// Continuous pulsing animation
		const pulseLoop = Animated.loop(
			Animated.timing(pulseAnim, {
				toValue: 1,
				duration: 2200,
				easing: Easing.out(Easing.ease),
				useNativeDriver: true,
			})
		)
		pulseLoop.start()

		// Ticker interval
		const interval = setInterval(() => {
			setTickerIndex((prev) => (prev + 1) % SEARCH_TICKERS.length)
		}, 4000)

		// Progress bar animation over 30s
		const progressAnimation = Animated.timing(progressAnim, {
			toValue: 1,
			duration: 30000,
			easing: Easing.linear,
			useNativeDriver: false,
		})
		progressAnimation.start()

		return () => {
			clearInterval(interval)
			pulseLoop.stop()
			progressAnimation.stop()
		}
	}, [])

	const scaleRing1 = pulseAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.8, 1.8],
	})

	const opacityRing1 = pulseAnim.interpolate({
		inputRange: [0, 0.7, 1],
		outputRange: [0.8, 0.3, 0],
	})

	const scaleRing2 = pulseAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.5, 2.4],
	})

	const opacityRing2 = pulseAnim.interpolate({
		inputRange: [0, 0.6, 1],
		outputRange: [0.6, 0.2, 0],
	})

	const progressWidth = progressAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ['0%', '100%'],
	})

	return (
		<View style={styles.container}>
			{/* Pulse Radar Center */}
			<View style={styles.radarContainer}>
				<Animated.View
					style={[
						styles.pulseRing,
						{
							transform: [{ scale: scaleRing2 }],
							opacity: opacityRing2,
							backgroundColor: '#0C7C7C',
						},
					]}
				/>
				<Animated.View
					style={[
						styles.pulseRing,
						{
							transform: [{ scale: scaleRing1 }],
							opacity: opacityRing1,
							backgroundColor: '#0284C7',
						},
					]}
				/>

				{/* Patient Center Icon */}
				<View style={styles.centerBadge}>
					<MaterialCommunityIcons name="home-account" size={32} color="#FFFFFF" />
				</View>
			</View>

			{/* Status Card Overlay */}
			<View style={[styles.statusCard, isTablet && styles.statusCardTablet]}>
				{/* Top Search Pill */}
				<View style={styles.searchingPill}>
					<ActivityIndicator size="small" color="#0C7C7C" />
					<AppTypography variant="caption" style={styles.searchingPillText}>
						SEARCHING FOR NEARBY NURSE
					</AppTypography>
				</View>

				<AppTypography variant="h3" style={styles.serviceTitle} numberOfLines={1}>
					{serviceName}
				</AppTypography>

				{/* Animated Ticker Message */}
				<View style={styles.tickerWrapper}>
					<Ionicons name="pulse" size={18} color="#0C7C7C" />
					<AppTypography variant="body" style={styles.tickerText} numberOfLines={2}>
						{SEARCH_TICKERS[tickerIndex]}
					</AppTypography>
				</View>

				{/* Location Subtext */}
				<View style={styles.locationRow}>
					<Ionicons name="location-outline" size={14} color="#64748B" />
					<AppTypography variant="caption" style={styles.locationText} numberOfLines={1}>
						{patientAddress}
					</AppTypography>
				</View>

				{/* Animated Progress Line */}
				<View style={styles.progressTrack}>
					<Animated.View style={[styles.progressBar, { width: progressWidth }]} />
				</View>

				{/* Optional Cancel Action */}
				{onCancelSearch && (
					<TouchableOpacity style={styles.cancelBtn} onPress={onCancelSearch} activeOpacity={0.7}>
						<AppTypography variant="caption" style={styles.cancelBtnText}>
							Cancel Request
						</AppTypography>
					</TouchableOpacity>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 32,
		paddingHorizontal: 20,
	},
	radarContainer: {
		width: 240,
		height: 240,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 40,
	},
	pulseRing: {
		position: 'absolute',
		width: 140,
		height: 140,
		borderRadius: 70,
	},
	centerBadge: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#0C7C7C',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 8,
		shadowColor: '#0C7C7C',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.35,
		shadowRadius: 10,
	},
	statusCard: {
		width: '100%',
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 20,
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	statusCardTablet: {
		maxWidth: 540,
	},
	searchingPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 20,
		marginBottom: 12,
	},
	searchingPillText: {
		color: '#0C7C7C',
		fontWeight: '700',
		fontSize: 11,
		letterSpacing: 0.6,
	},
	serviceTitle: {
		color: '#0F172A',
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 10,
	},
	tickerWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 12,
		width: '100%',
		marginBottom: 12,
	},
	tickerText: {
		color: '#334155',
		fontSize: 13,
		flex: 1,
		fontWeight: '500',
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 16,
	},
	locationText: {
		color: '#64748B',
		fontSize: 12,
	},
	progressTrack: {
		width: '100%',
		height: 4,
		backgroundColor: '#E2E8F0',
		borderRadius: 2,
		overflow: 'hidden',
		marginBottom: 12,
	},
	progressBar: {
		height: '100%',
		backgroundColor: '#0C7C7C',
		borderRadius: 2,
	},
	cancelBtn: {
		paddingVertical: 6,
		paddingHorizontal: 16,
	},
	cancelBtnText: {
		color: '#EF4444',
		fontWeight: '600',
		fontSize: 13,
	},
})
