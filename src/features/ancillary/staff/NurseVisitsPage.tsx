import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { fetchMyNurseAppointmentsBackend, NurseBooking } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import ServiceStatusIndicator from '../components/ServiceStatusIndicator'

export default function NurseVisitsPage() {
	const navigation = useNavigation<any>()
	const [activeFilter, setActiveFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all')
	const [bookings, setBookings] = useState<NurseBooking[]>([])

	React.useEffect(() => {
		const loadData = async () => {
			try {
				const items = await fetchMyNurseAppointmentsBackend()
				setBookings(items)
			} catch (e) {
				console.log('Error loading visits')
			}
		}
		void loadData()
	}, [])

	const filteredBookings = bookings.filter((b: NurseBooking) => {
		if (activeFilter === 'all') return true
		if (activeFilter === 'assigned') return b.status === 'assigned' || b.status === 'verification_pending' || b.status === 'EN_ROUTE' || b.status === 'ARRIVED'
		if (activeFilter === 'in_progress') return b.status === 'in_progress'
		if (activeFilter === 'completed') return b.status === 'completed'
		return true
	})

	const handleCardPress = (booking: NurseBooking) => {
		if (booking.status === 'in_progress') {
			navigation.navigate(ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS, { bookingId: booking.id })
		} else if (booking.status === 'verification_pending') {
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
		} else {
			navigation.navigate(ROUTES.STACK.NURSE_ACTIVE_BOOKING, { bookingId: booking.id })
		}
	}

	const renderItem = ({ item }: { item: NurseBooking }) => {
		const isInProgress = item.status === 'in_progress'
		const isCompleted = item.status === 'completed'

		return (
			<TouchableOpacity style={styles.cardItem} onPress={() => handleCardPress(item)} activeOpacity={0.88}>
				<View style={styles.cardHeader}>
					<View>
						<Text style={styles.patientName}>{item.patientName}</Text>
						<Text style={styles.patientMeta}>{item.patientGender} • {item.patientAge} yrs</Text>
					</View>
					<ServiceStatusIndicator status={item.status} />
				</View>

				<Text style={styles.serviceName}>{item.serviceName}</Text>

				<View style={styles.metaRow}>
					<Ionicons name="time-outline" size={14} color="#0C7C7C" />
					<Text style={styles.metaText}>{item.appointmentDate} • {item.appointmentTime}</Text>
				</View>

				<View style={styles.metaRow}>
					<Ionicons name="location-outline" size={14} color="#64748B" />
					<Text style={styles.metaText} numberOfLines={1}>{item.patientAddress}</Text>
				</View>

				{!isCompleted && (
					<View style={[styles.actionPrompt, isInProgress && styles.actionPromptActive]}>
						<Text style={[styles.actionPromptText, isInProgress && styles.actionPromptTextActive]}>
							{isInProgress ? '⚡ Resume Service In Progress' : 'View Visit & Verify OTP'}
						</Text>
						<Ionicons name="arrow-forward" size={15} color={isInProgress ? '#0C7C7C' : '#475569'} />
					</View>
				)}
			</TouchableOpacity>
		)
	}

	return (
		<View style={styles.container}>
			{/* Top Header */}
			<View style={styles.topHeader}>
				<Text style={styles.pageTitle}>Visits & Care Requests</Text>
				<Text style={styles.pageSub}>Operational active & completed patient visits</Text>
			</View>

			{/* Filter Bar */}
			<View style={styles.filterBar}>
				{(['all', 'assigned', 'in_progress', 'completed'] as const).map((filterKey) => {
					const isActive = activeFilter === filterKey
					const label = filterKey === 'all'
						? 'All Visits'
						: filterKey === 'assigned'
						? 'Assigned'
						: filterKey === 'in_progress'
						? 'In Progress'
						: 'Completed'

					return (
						<TouchableOpacity
							key={filterKey}
							style={[styles.filterPill, isActive && styles.filterPillActive]}
							onPress={() => setActiveFilter(filterKey)}
							activeOpacity={0.8}
						>
							<Text style={[styles.filterText, isActive && styles.filterTextActive]}>{label}</Text>
						</TouchableOpacity>
					)
				})}
			</View>

			<FlatList
				data={filteredBookings}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContainer}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
		paddingTop: 50,
	},
	topHeader: {
		paddingHorizontal: 16,
		paddingBottom: 12,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	pageTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#0F172A',
	},
	pageSub: {
		fontSize: 12.5,
		fontWeight: '500',
		color: '#64748B',
		marginTop: 2,
	},
	filterBar: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 8,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	filterPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: '#F1F5F9',
	},
	filterPillActive: {
		backgroundColor: '#0C7C7C',
	},
	filterText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
	},
	filterTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	listContainer: {
		padding: 16,
		gap: 12,
	},
	cardItem: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		gap: 6,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	patientName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	patientMeta: {
		fontSize: 12,
		color: '#64748B',
	},
	serviceName: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	metaText: {
		fontSize: 12,
		color: '#64748B',
	},
	actionPrompt: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	actionPromptActive: {
		borderTopColor: '#CCFBF1',
	},
	actionPromptText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#475569',
	},
	actionPromptTextActive: {
		color: '#0C7C7C',
	},
})
