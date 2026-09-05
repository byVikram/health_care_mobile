import React, { useCallback, useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	Alert,
	TouchableOpacity,
	Image,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'

import { AppScreenHeader, AppTypography, AppButton } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getDoctorEvents, deleteEvent, type DoctorEvent } from './eventService'
import { formatApiDateForDisplay } from '../../../utils/date'

const formatTime = (time: string) => {
	if (!time) return ''
	const [h, m] = time.split(':')
	const hour = parseInt(h, 10)
	const ampm = hour >= 12 ? 'PM' : 'AM'
	const hour12 = hour % 12 || 12
	return `${hour12}:${m} ${ampm}`
}

const TEAL = '#0d9488'
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80'

type FilterTab = 'all' | 'published' | 'draft' | 'expired'

export default function DoctorEventListPage() {
	const [events, setEvents] = useState<DoctorEvent[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [activeTab, setActiveTab] = useState<FilterTab>('all')

	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const paddingHorizontal = 32
	const gap = 16
	const availableWidth = width - (paddingHorizontal * 2)
	const minCardWidth = 320

	const numColumns = Math.max(1, Math.floor((availableWidth + gap) / (minCardWidth + gap)))
	const totalGap = (numColumns - 1) * gap
	const cardWidth = (availableWidth - totalGap) / numColumns
	const imageHeight = isTablet ? 160 : 140

	const theme = useTheme()
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()

	const fetchEvents = useCallback(async () => {
		try {
			setIsLoading(true)
			const data = await getDoctorEvents()
			setEvents(data)
		} catch (error) {
			console.error('Failed to fetch events', error)
			Alert.alert('Error', 'Failed to fetch events')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			fetchEvents()
		}, [fetchEvents])
	)

	const handleDelete = (id: string) => {
		Alert.alert(
			'Delete Event',
			'Are you sure you want to delete this event? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteEvent(id)
							Alert.alert('Success', 'Event deleted successfully.')
							fetchEvents()
						} catch (error) {
							console.error('Failed to delete event', error)
							Alert.alert('Error', 'Failed to delete event. Please try again.')
						}
					},
				},
			]
		)
	}

	const handleEdit = (id: string) => {
		navigation.navigate(ROUTES.STACK.DOCTOR_EVENT_FORM, { eventId: id })
	}

	const handleCreate = () => {
		navigation.navigate(ROUTES.STACK.DOCTOR_EVENT_FORM, {})
	}

	const renderFilterTabs = () => (
		<View style={styles.tabContainer}>
			{(['all', 'published', 'draft', 'expired'] as FilterTab[]).map((tab) => (
				<TouchableOpacity
					key={tab}
					style={[styles.tab, activeTab === tab && styles.activeTab]}
					onPress={() => setActiveTab(tab)}
					activeOpacity={0.8}
				>
					<AppTypography
						variant="body"
						style={[styles.tabText, activeTab === tab && styles.activeTabText]}
					>
						{tab.charAt(0).toUpperCase() + tab.slice(1)}
					</AppTypography>
				</TouchableOpacity>
			))}
		</View>
	)

	const renderEventCard = ({ item }: { item: DoctorEvent }) => {
		const dateStr = item.event_date ? formatApiDateForDisplay(item.event_date) : 'TBA'
		const timeStr = `${formatTime(item.event_time)} - ${formatTime(item.end_time)}`
		const locationText =
			item.location_type === 'online' ? 'Online' : item.location || 'Location TBA'

		return (
			<View style={[styles.card, { width: cardWidth }]}>
				<Image
					source={{ uri: item.cover_image_url || DEFAULT_COVER_IMAGE }}
					resizeMode="cover"
					style={[styles.image, { height: imageHeight }]}
				/>

				<View style={styles.categoryBadge}>
					<AppTypography variant="caption" style={styles.categoryText}>
						{item.category_label || item.category}
					</AppTypography>
				</View>

				<View style={[
					styles.statusBadge,
					item.is_expired ? styles.statusExpired : (item.status === 'published' ? styles.statusPublished : styles.statusDraft)
				]}>
					<AppTypography variant="caption" style={styles.statusText}>
						{item.is_expired ? 'EXPIRED' : item.status.toUpperCase()}
					</AppTypography>
				</View>

				<View style={styles.cardBody}>
					<AppTypography
						variant="body"
						style={[styles.eventTitle, isTablet && styles.eventTitleTablet]}
						numberOfLines={2}
					>
						{item.title}
					</AppTypography>

					<View style={styles.metaRow}>
						<Ionicons name="calendar-outline" size={14} color="#496879" />
						<AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
							{dateStr} • {timeStr}
						</AppTypography>
					</View>

					<View style={styles.metaRow}>
						{item.location_type === 'online' ? (
							<Ionicons name="videocam-outline" size={14} color="#16a34a" />
						) : (
							<Ionicons name="location-outline" size={14} color="#496879" />
						)}
						<AppTypography
							variant="caption"
							style={[styles.metaText, item.location_type === 'online' && { color: '#16a34a' }]}
							numberOfLines={1}
						>
							{locationText}
						</AppTypography>
					</View>

					<AppTypography variant="caption" style={styles.descriptionText} numberOfLines={2}>
						{item.description}
					</AppTypography>

					<View style={styles.buttonStack}>
						<AppButton
							variant="primary"
							onPress={() => handleEdit(item.id)}
							style={styles.editBtn}
							contentStyle={styles.btnContent}
							labelStyle={styles.editBtnText}
						>
							Edit Event
						</AppButton>

						<AppButton
							variant="outline"
							onPress={() => handleDelete(item.id)}
							style={styles.deleteBtn}
							contentStyle={styles.btnContent}
							labelStyle={styles.deleteBtnText}
						>
							Delete
						</AppButton>
					</View>
				</View>
			</View>
		)
	}

	const filteredEvents = events.filter(ev => {
		const isExpired = Boolean(ev.is_expired)
		if (activeTab === 'all') return !isExpired
		if (activeTab === 'published') return ev.status === 'published' && !isExpired
		if (activeTab === 'draft') return ev.status === 'draft' && !isExpired
		if (activeTab === 'expired') return isExpired
		return true
	})

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="My Events"
				onBack={() => navigation.goBack()}
				rightElement={
					<TouchableOpacity 
						style={styles.headerCreateBtn} 
						onPress={handleCreate}
						activeOpacity={0.8}
					>
						<Ionicons name="add" size={16} color={TEAL} />
						<AppTypography variant="subtitle" color={TEAL}>
							Create Event
						</AppTypography>
					</TouchableOpacity>
				}
			/>

			{renderFilterTabs()}

			{isLoading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
				</View>
			) : (
				<FlatList
					key={numColumns}
					numColumns={numColumns}
					data={filteredEvents}
					keyExtractor={(item) => item.id}
					renderItem={renderEventCard}
					contentContainerStyle={[
						styles.listContent,
						events.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' },
					]}
					columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons name="calendar-clear-outline" size={48} color="#94a3b8" />
							<AppTypography variant="body" style={styles.emptyText}>
								No events found.
							</AppTypography>
							<AppButton
								variant="primary"
								onPress={handleCreate}
								style={{ marginTop: 16 }}
							>
								Create First Event
							</AppButton>
						</View>
					}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	headerAddBtn: {
		padding: 8,
	},
	tabContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
		gap: 12,
	},
	tab: {
		paddingVertical: 6,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#f1f5f9',
	},
	activeTab: {
		backgroundColor: TEAL,
	},
	tabText: {
		color: '#64748b',
		fontWeight: '600',
	},
	activeTabText: {
		color: '#fff',
	},
	headerCreateBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 20,
		paddingVertical: 6,
		paddingHorizontal: 12,
		gap: 4,
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	listContent: {
		paddingHorizontal: 32,
		paddingVertical: 16,
	},
	columnWrapper: {
		gap: 16,
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
	},
	emptyText: {
		marginTop: 12,
		color: '#64748b',
		textAlign: 'center',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 3,
		position: 'relative',
		marginBottom: 16,
	},
	image: {
		width: '100%',
		backgroundColor: '#edf4f5',
	},
	categoryBadge: {
		position: 'absolute',
		top: 10,
		left: 10,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	categoryText: {
		fontWeight: '600',
		fontSize: 10,
		color: '#ffffff',
	},
	statusBadge: {
		position: 'absolute',
		top: 10,
		right: 10,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusPublished: {
		backgroundColor: '#16a34a', // green
	},
	statusDraft: {
		backgroundColor: '#f59e0b', // amber
	},
	statusExpired: {
		backgroundColor: '#64748b', // slate
	},
	statusText: {
		fontWeight: '700',
		fontSize: 10,
		color: '#ffffff',
	},
	cardBody: {
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 10,
	},
	eventTitle: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: '#10263A',
		marginBottom: 6,
	},
	eventTitleTablet: {
		fontSize: 16,
		lineHeight: 22,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
		marginBottom: 4,
	},
	metaText: {
		flex: 1,
		color: '#496879',
		fontSize: 11,
		lineHeight: 15,
	},
	descriptionText: {
		marginTop: 4,
		marginBottom: 8,
		color: '#64748b',
		fontSize: 12,
		lineHeight: 16,
	},
	buttonStack: {
		flexDirection: 'column',
		gap: 6,
		marginTop: 'auto',
	},
	btnContent: {
		height: 32,
	},
	editBtn: {
		borderRadius: 6,
		backgroundColor: TEAL,
	},
	editBtnText: {
		fontSize: 11,
		fontWeight: '700',
		marginVertical: 0,
	},
	deleteBtn: {
		borderRadius: 6,
		borderColor: '#ef4444',
	},
	deleteBtnText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#ef4444',
		marginVertical: 0,
	},
})
