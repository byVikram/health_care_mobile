import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { fetchMyNurseAppointmentsBackend, NurseBooking } from '../ancillaryService'

export default function NurseHistoryPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [visits, setVisits] = useState<NurseBooking[]>([])

	React.useEffect(() => {
		const loadData = async () => {
			try {
				const items = await fetchMyNurseAppointmentsBackend()
				setVisits(items.filter((b: NurseBooking) => b.status === 'completed'))
			} catch (e) {
				console.log('Error loading history')
			}
		}
		void loadData()
	}, [])

	const filteredHistory = visits.filter(
		(b: NurseBooking) =>
			b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			b.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
	)

	return (
		<View style={styles.container}>
			{/* Top Header */}
			<View style={styles.topHeader}>
				<Text style={styles.pageTitle}>Care Visit History</Text>
				<Text style={styles.pageSub}>Completed & closed patient care records</Text>
			</View>

			{/* Search */}
			<View style={styles.searchContainer}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={18} color="#94A3B8" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search completed visits..."
						placeholderTextColor="#94A3B8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>
			</View>

			<FlatList
				data={filteredHistory}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				renderItem={({ item, index }) => (
					<View style={styles.historyCard}>
						<View style={styles.cardHeaderRow}>
							<Text style={styles.patientName}>{item.patientName}</Text>
							<Text style={styles.earningsBadge}>+ ₹{index === 0 ? 850 : 450}</Text>
						</View>
						<Text style={styles.serviceName}>{item.serviceName}</Text>
						<View style={styles.metaRow}>
							<Ionicons name="checkmark-circle" size={14} color="#059669" />
							<Text style={styles.metaText}>Completed Today • {item.appointmentTime.split(' - ')[0]}</Text>
						</View>
						<Text style={styles.addressText} numberOfLines={1}>
							{item.patientAddress}
						</Text>
					</View>
				)}
				ListEmptyComponent={
					<View style={styles.emptyBox}>
						<Ionicons name="folder-open-outline" size={44} color="#CBD5E1" />
						<Text style={styles.emptyText}>No historical care visits found.</Text>
					</View>
				}
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
	searchContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F1F5F9',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 13,
		color: '#0F172A',
	},
	listContent: {
		padding: 16,
		gap: 12,
	},
	historyCard: {
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 14,
		gap: 4,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	patientName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	earningsBadge: {
		fontSize: 13.5,
		fontWeight: '800',
		color: '#059669',
	},
	serviceName: {
		fontSize: 13,
		fontWeight: '600',
		color: '#0C7C7C',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
	},
	metaText: {
		fontSize: 12,
		color: '#64748B',
	},
	addressText: {
		fontSize: 11.5,
		color: '#64748B',
		marginTop: 2,
	},
	emptyBox: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
		gap: 8,
	},
	emptyText: {
		fontSize: 13,
		color: '#64748B',
	},
})
