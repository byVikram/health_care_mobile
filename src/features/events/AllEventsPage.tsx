import React, { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	TouchableOpacity,
	useWindowDimensions,
	Linking,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

import { AppScreenHeader, AppTypography, AppInput, EventCard } from '../../components/common'
import type { EventItem } from '../../components/common/display/EventCard'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

const TEAL = '#0c7c7c'

export default function AllEventsPage() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { width } = useWindowDimensions()

	const isTablet = width >= 768
	const paddingHorizontal = 16
	const gap = 16
	const availableWidth = width - paddingHorizontal * 2
	const minCardWidth = 300

	const numColumns = Math.max(1, Math.floor((availableWidth + gap) / (minCardWidth + gap)))
	const totalGap = (numColumns - 1) * gap
	const cardWidth = (availableWidth - totalGap) / numColumns
	const imageHeight = isTablet ? 150 : 130

	const [events, setEvents] = useState<EventItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedCategory, setSelectedCategory] = useState('All')

	useEffect(() => {
		let isMounted = true
		const fetchEvents = async () => {
			setLoading(true)
			setError(null)
			try {
				const res = await ApiService.get<any>(API_ENDPOINTS.EVENTS.PUBLIC + '?limit=100')
				if (isMounted) {
					setEvents(res.data?.data || [])
				}
			} catch (err) {
				console.error('Error fetching events:', err)
				if (isMounted) {
					setError('Failed to load events. Please try again later.')
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

	const categories = ['All', ...Array.from(new Set(events.map((e) => e.category_label || e.category))).filter(Boolean)]

	const filteredEvents = events.filter((event) => {
		const matchesSearch =
			event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			event.description.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesCategory = selectedCategory === 'All' || (event.category_label || event.category) === selectedCategory
		return matchesSearch && matchesCategory
	})

	const renderFilterTabs = () => (
		<View style={styles.tabContainer}>
			<FlatList
				data={categories}
				horizontal
				showsHorizontalScrollIndicator={false}
				keyExtractor={(item) => item}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[styles.tab, selectedCategory === item && styles.activeTab]}
						onPress={() => setSelectedCategory(item)}
						activeOpacity={0.8}
					>
						<AppTypography
							variant="body"
							style={[styles.tabText, selectedCategory === item && styles.activeTabText]}
						>
							{item}
						</AppTypography>
					</TouchableOpacity>
				)}
			/>
		</View>
	)

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<AppScreenHeader title="All Events" onBack={() => navigation.goBack()} />

			<View style={styles.searchContainer}>
				<AppInput
					placeholder="Search events..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					isSearch
				/>
			</View>

			{renderFilterTabs()}

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={TEAL} />
				</View>
			) : error ? (
				<View style={styles.center}>
					<AppTypography variant="body" style={{ color: 'red', textAlign: 'center' }}>
						{error}
					</AppTypography>
				</View>
			) : (
				<FlatList
					key={numColumns}
					numColumns={numColumns}
					data={filteredEvents}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={[
						styles.listContent,
						filteredEvents.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' },
					]}
					columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons name="calendar-clear-outline" size={48} color="#94a3b8" />
							<AppTypography variant="body" style={styles.emptyText}>
								No events found matching your criteria.
							</AppTypography>
						</View>
					}
					renderItem={({ item, index }) => (
						<EventCard
							item={item}
							cardWidth={cardWidth}
							imageHeight={imageHeight}
							marginRight={0}
							onRegister={() => {
								if (item.registration_link) {
									Linking.openURL(item.registration_link)
								} else {
									Alert.alert('Registration', 'Registration link is not available for this event.')
								}
							}}
							onViewDetails={() => navigation.navigate(ROUTES.STACK.EVENT_DETAILS as any, { eventId: item.id })}
						/>
					)}
				/>
			)}
		</KeyboardAvoidingView>
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
	searchContainer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		backgroundColor: '#fff',
	},
	tabContainer: {
		backgroundColor: '#fff',
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	tab: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#f1f5f9',
		marginHorizontal: 4,
		marginLeft: 12,
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
	listContent: {
		padding: 16,
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
})
