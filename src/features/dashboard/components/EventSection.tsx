import React, { useEffect, useState } from 'react'
import { FlatList, Image, StyleSheet, TouchableOpacity, useWindowDimensions, View, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppTypography, EventCard } from '../../../components/common'
import type { EventItem } from '../../../components/common/display/EventCard'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { openWebUrl } from '../../../utils/safeLinking'

interface Props {
	variant?: 'row' | 'column'
}

const TEAL = '#0c7c7c'

function UpcomingEventsSection({ variant = 'row' }: Props) {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const cardWidth = isTablet ? 320 : Math.min(280, width * 0.75)
	const imageHeight = isTablet ? 140 : 120

	const [events, setEvents] = useState<EventItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let isMounted = true
		const fetchEvents = async () => {
			setLoading(true)
			setError(null)
			try {
				const res = await ApiService.get<any>(API_ENDPOINTS.EVENTS.PUBLIC)
				if (isMounted) {
					setEvents(res.data?.data || [])
				}
			} catch (err) {
				console.error('Error fetching events:', err)
				if (isMounted) {
					setError('Failed to load events.')
				}
			} finally {
				if (isMounted) {
					setLoading(false)
				}
			}
		}
		fetchEvents()
		return () => {
			isMounted = false
		}
	}, [])

	if (loading) {
		return (
			<View style={[styles.container, styles.center]}>
				<ActivityIndicator size="small" color={TEAL} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, styles.center]}>
				<AppTypography variant="body" style={{ color: 'red' }}>
					{error}
				</AppTypography>
			</View>
		)
	}

	if (events.length === 0) {
		return null
	}

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<AppTypography
					variant="subtitle"
					style={[styles.sectionTitle, variant === 'column' && styles.sectionTitleLeft]}
				>
					Upcoming Events
				</AppTypography>

				<TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate(ROUTES.STACK.ALL_EVENTS as any)}>
					<AppTypography variant="caption" color={TEAL} style={styles.viewAllText}>
						View All
					</AppTypography>
				</TouchableOpacity>
			</View>

			<FlatList
				data={events}
				horizontal
				keyExtractor={(item) => String(item.id)}
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
				renderItem={({ item, index }) => (
					<EventCard
						item={item}
						cardWidth={cardWidth}
						imageHeight={imageHeight}
						marginRight={index === events.length - 1 ? 0 : 12}
						onRegister={() => {
							if (item.registration_link) {
								openWebUrl(item.registration_link).catch(() => Alert.alert('Error', 'Could not open registration link.'))
							} else {
								Alert.alert('Registration', 'Registration link is not available for this event.')
							}
						}}
						onViewDetails={() => navigation.navigate(ROUTES.STACK.EVENT_DETAILS as any, { eventId: item.id })}
					/>
				)}
			/>
		</View>
	)
}

export default React.memo(UpcomingEventsSection)

const styles = StyleSheet.create({
	container: {
		paddingTop: 8,
		paddingBottom: 14,
	},
	center: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	sectionTitle: {
		fontWeight: '700',
		color: '#11283A',
	},
	sectionTitleLeft: {
		textAlign: 'left',
	},
	viewAllText: {
		fontWeight: '700',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 10,
	},
})
