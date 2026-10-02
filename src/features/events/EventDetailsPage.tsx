import React, { useEffect, useState } from 'react'
import {
	View,
	ScrollView,
	StyleSheet,
	Image,
	ActivityIndicator,
	useWindowDimensions,
	Alert,
	Platform,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { AppScreenHeader, AppTypography, AppButton } from '../../components/common'
import type { EventItem } from '../../components/common/display/EventCard'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import type { AppStackParamList } from '../../navigation/types'
import { openWebUrl } from '../../utils/safeLinking'

const TEAL = '#0c7c7c'
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80'

type EventDetailsRouteProp = RouteProp<AppStackParamList, 'EventDetails'>

function formatTime(timeStr?: string) {
	if (!timeStr) return ''
	const [h, m] = timeStr.split(':')
	let hr = parseInt(h, 10)
	const suffix = hr >= 12 ? 'PM' : 'AM'
	hr = hr % 12 || 12
	return `${hr}:${m} ${suffix}`
}

export function formatApiDateForDisplay(dateString?: string) {
	if (!dateString) return ''
	const d = new Date(dateString)
	return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function EventDetailsPage() {
	const route = useRoute<EventDetailsRouteProp>()
	const navigation = useNavigation()
	const { eventId } = route.params
	const insets = useSafeAreaInsets()

	const [event, setEvent] = useState<EventItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { width } = useWindowDimensions()

	useEffect(() => {
		let isMounted = true
		const fetchEvent = async () => {
			if (!eventId) return
			setLoading(true)
			setError(null)
			try {
				const res = await ApiService.get<any>(API_ENDPOINTS.EVENTS.PUBLIC_DETAIL(eventId))
				if (isMounted && res.data?.data) {
					setEvent(res.data.data)
				}
			} catch (err) {
				console.error('Failed to fetch event detail:', err)
				if (isMounted) {
					setError('Could not load event details. Please try again.')
				}
			} finally {
				if (isMounted) {
					setLoading(false)
				}
			}
		}

		fetchEvent()

		return () => {
			isMounted = false
		}
	}, [eventId])

	if (loading) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Event Details" onBack={() => navigation.goBack()} />
				<View style={styles.center}>
					<ActivityIndicator size="large" color={TEAL} />
				</View>
			</View>
		)
	}

	if (error || !event) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Event Details" onBack={() => navigation.goBack()} />
				<View style={styles.center}>
					<AppTypography variant="body" style={{ color: 'red', textAlign: 'center' }}>
						{error || 'Event not found'}
					</AppTypography>
				</View>
			</View>
		)
	}

	const dateStr = formatApiDateForDisplay(event.event_date)
	const timeStr = `${formatTime(event.event_time)} - ${formatTime(event.end_time)}`
	const locationText = event.location_type === 'online' ? 'Online Event' : event.location || 'Location not provided'
	const hasRegistrationLink = !!event.registration_link

	const handleRegister = () => {
		if (event.registration_link) {
			openWebUrl(event.registration_link).catch(() => {
				Alert.alert('Error', 'Could not open registration link.')
			})
		} else {
			Alert.alert('Registration', 'Registration link is not available for this event.')
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Event Details" onBack={() => navigation.goBack()} />

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<Image
					source={{ uri: event.cover_image_url || DEFAULT_COVER_IMAGE }}
					style={[styles.coverImage, { height: width * 0.6 }]}
					resizeMode="cover"
				/>

				<View style={styles.contentContainer}>
					<View style={styles.categoryBadge}>
						<AppTypography variant="caption" style={styles.categoryText}>
							{event.category_label || event.category}
						</AppTypography>
					</View>

					<AppTypography variant="h3" style={styles.title}>
						{event.title}
					</AppTypography>

					<View style={styles.detailsBox}>
						<View style={styles.detailRow}>
							<View style={styles.iconContainer}>
								<Ionicons name="calendar-outline" size={20} color={TEAL} />
							</View>
							<View style={styles.detailTextContainer}>
								<AppTypography variant="caption" style={styles.detailLabel}>
									Date
								</AppTypography>
								<AppTypography variant="body" style={styles.detailValue}>
									{dateStr}
								</AppTypography>
							</View>
						</View>

						<View style={styles.detailRow}>
							<View style={styles.iconContainer}>
								<Ionicons name="time-outline" size={20} color={TEAL} />
							</View>
							<View style={styles.detailTextContainer}>
								<AppTypography variant="caption" style={styles.detailLabel}>
									Time
								</AppTypography>
								<AppTypography variant="body" style={styles.detailValue}>
									{timeStr}
								</AppTypography>
							</View>
						</View>

						<View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
							<View style={styles.iconContainer}>
								{event.location_type === 'online' ? (
									<Ionicons name="videocam-outline" size={20} color={TEAL} />
								) : (
									<Ionicons name="location-outline" size={20} color={TEAL} />
								)}
							</View>
							<View style={styles.detailTextContainer}>
								<AppTypography variant="caption" style={styles.detailLabel}>
									Location
								</AppTypography>
								<AppTypography variant="body" style={styles.detailValue}>
									{locationText}
								</AppTypography>
							</View>
						</View>
					</View>

					<AppTypography variant="h3" style={styles.sectionTitle}>
						About this Event
					</AppTypography>
					
					<AppTypography variant="body" style={styles.description}>
						{event.description}
					</AppTypography>
				</View>
			</ScrollView>

			<View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
				<AppButton
					variant="primary"
					onPress={handleRegister}
					disabled={!hasRegistrationLink}
					style={[styles.registerBtn, !hasRegistrationLink && styles.registerBtnDisabled]}
					labelStyle={styles.registerBtnText}
				>
					{hasRegistrationLink ? 'Register Now' : 'Registration Closed'}
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	scrollContent: {
		paddingBottom: 100,
	},
	coverImage: {
		width: '100%',
		backgroundColor: '#edf4f5',
	},
	contentContainer: {
		padding: 20,
		marginTop: -20,
		backgroundColor: '#f8fafc',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	categoryBadge: {
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(12, 124, 124, 0.1)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		marginBottom: 16,
	},
	categoryText: {
		fontWeight: '600',
		color: TEAL,
		fontSize: 12,
	},
	title: {
		fontSize: 22,
		lineHeight: 30,
		fontWeight: '800',
		color: '#11283a',
		marginBottom: 24,
	},
	detailsBox: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 32,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.05,
				shadowRadius: 10,
			},
			android: {
				elevation: 2,
			},
		}),
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#f0fdfa',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},
	detailTextContainer: {
		flex: 1,
	},
	detailLabel: {
		color: '#64748b',
		marginBottom: 2,
	},
	detailValue: {
		fontWeight: '600',
		color: '#1e293b',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#11283a',
		marginBottom: 12,
	},
	description: {
		fontSize: 15,
		lineHeight: 24,
		color: '#475569',
	},
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#fff',
		paddingHorizontal: 20,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
	},
	registerBtn: {
		borderRadius: 12,
		height: 54,
		backgroundColor: TEAL,
	},
	registerBtnDisabled: {
		backgroundColor: '#cbd5e1',
	},
	registerBtnText: {
		fontSize: 16,
		fontWeight: '700',
	},
})
