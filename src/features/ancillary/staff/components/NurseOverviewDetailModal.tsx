import React from 'react'
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NurseBooking } from '../../ancillaryService'

export type OverviewDetailType = 'accepted' | 'completed' | 'cancelled' | 'earnings' | null

interface NurseOverviewDetailModalProps {
	visible: boolean
	type: OverviewDetailType
	onClose: () => void
	bookings?: NurseBooking[]
	todayEarningsAmount?: number
}

const MOCK_CANCELLED_VISITS = [
	{
		id: 'CANCEL-901',
		patientName: 'Robert Vance',
		serviceName: 'Post-Op Wound Inspection',
		cancelledTime: '11:30 AM',
		reason: 'Patient requested rescheduling due to personal emergency',
	},
]

export default function NurseOverviewDetailModal({
	visible,
	type,
	onClose,
	bookings = [],
	todayEarningsAmount = 1300,
}: NurseOverviewDetailModalProps) {
	if (!visible || !type) return null

	const acceptedBookings = bookings.filter((b) => b.status === 'assigned' || b.status === 'verification_pending')
	const completedBookings = bookings.filter((b) => b.status === 'completed')

	const getTitle = () => {
		switch (type) {
			case 'accepted':
				return 'Accepted Appointments'
			case 'completed':
				return 'Completed Visits'
			case 'cancelled':
				return 'Cancelled Visits'
			case 'earnings':
				return 'Today\'s Earnings Ledger'
			default:
				return 'Overview Details'
		}
	}

	const getSubtitle = () => {
		switch (type) {
			case 'accepted':
				return 'Care requests accepted today ready for service'
			case 'completed':
				return 'Care services successfully completed and verified today'
			case 'cancelled':
				return 'Accepted visits that were cancelled today'
			case 'earnings':
				return 'Detailed breakdown of payouts earned today'
			default:
				return ''
		}
	}

	return (
		<Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={styles.modalCard}>
					{/* Modal Header */}
					<View style={styles.headerRow}>
						<View>
							<Text style={styles.headerTitle}>{getTitle()}</Text>
							<Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
						</View>

						<TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
							<Ionicons name="close" size={20} color="#64748B" />
						</TouchableOpacity>
					</View>

					{/* Modal Content Body */}
					<ScrollView contentContainerStyle={styles.contentBody} showsVerticalScrollIndicator={false}>
						{type === 'accepted' && (
							acceptedBookings.length > 0 ? (
								acceptedBookings.map((item) => (
									<View key={item.id} style={styles.recordCard}>
										<View style={styles.recordHeader}>
											<Text style={styles.patientName}>{item.patientName}</Text>
											<View style={styles.tagAccepted}>
												<Text style={styles.tagTextAccepted}>Accepted</Text>
											</View>
										</View>
										<Text style={styles.serviceName}>{item.serviceName}</Text>
										<View style={styles.metaRow}>
											<Ionicons name="time-outline" size={13} color="#0C7C7C" />
											<Text style={styles.metaText}>{item.appointmentTime}</Text>
										</View>
										<View style={styles.metaRow}>
											<Ionicons name="location-outline" size={13} color="#64748B" />
											<Text style={styles.metaText} numberOfLines={1}>{item.patientAddress}</Text>
										</View>
									</View>
								))
							) : (
								<View style={styles.emptyContainer}>
									<Ionicons name="checkmark-circle-outline" size={36} color="#94A3B8" />
									<Text style={styles.emptyText}>No accepted appointments pending service.</Text>
								</View>
							)
						)}

						{type === 'completed' && (
							completedBookings.length > 0 ? (
								completedBookings.map((item) => (
									<View key={item.id} style={styles.recordCard}>
										<View style={styles.recordHeader}>
											<Text style={styles.patientName}>{item.patientName}</Text>
											<View style={styles.tagCompleted}>
												<Ionicons name="checkmark-circle" size={12} color="#059669" />
												<Text style={styles.tagTextCompleted}>Completed</Text>
											</View>
										</View>
										<Text style={styles.serviceName}>{item.serviceName}</Text>
										<View style={styles.metaRow}>
											<Ionicons name="cash-outline" size={13} color="#059669" />
											<Text style={styles.earningsText}>₹850 Earned</Text>
										</View>
									</View>
								))
							) : (
								<View style={styles.emptyContainer}>
									<Ionicons name="trophy-outline" size={36} color="#94A3B8" />
									<Text style={styles.emptyText}>No visits completed yet today.</Text>
								</View>
							)
						)}

						{type === 'cancelled' && (
							MOCK_CANCELLED_VISITS.map((item) => (
								<View key={item.id} style={[styles.recordCard, styles.recordCancelled]}>
									<View style={styles.recordHeader}>
										<Text style={styles.patientName}>{item.patientName}</Text>
										<View style={styles.tagCancelled}>
											<Text style={styles.tagTextCancelled}>Cancelled</Text>
										</View>
									</View>
									<Text style={styles.serviceName}>{item.serviceName}</Text>
									<View style={styles.metaRow}>
										<Ionicons name="time-outline" size={13} color="#DC2626" />
										<Text style={styles.metaText}>Cancelled at {item.cancelledTime}</Text>
									</View>
									<Text style={styles.reasonText}>Reason: {item.reason}</Text>
								</View>
							))
						)}

						{type === 'earnings' && (
							<View>
								<View style={styles.earningsSummaryBox}>
									<Text style={styles.earningsSummaryLabel}>TOTAL EARNED TODAY</Text>
									<Text style={styles.earningsSummaryAmount}>₹{todayEarningsAmount.toLocaleString()}</Text>
									<Text style={styles.earningsSummarySub}>Direct Payout Status: <Text style={{ color: '#059669', fontWeight: '700' }}>Verified & Processing</Text></Text>
								</View>

								<Text style={styles.ledgerHeaderTitle}>Today's Payout Ledger</Text>
								{completedBookings.map((item, idx) => (
									<View key={item.id} style={styles.ledgerRow}>
										<View>
											<Text style={styles.ledgerService}>{item.serviceName}</Text>
											<Text style={styles.ledgerPatient}>{item.patientName}</Text>
										</View>
										<Text style={styles.ledgerAmount}>+ ₹{idx === 0 ? 850 : 450}</Text>
									</View>
								))}
							</View>
						)}
					</ScrollView>

					<TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
						<Text style={styles.doneBtnText}>Close Details</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.5)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		maxHeight: '80%',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0F172A',
	},
	headerSubtitle: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	closeBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	contentBody: {
		gap: 12,
		paddingBottom: 16,
	},
	recordCard: {
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
	},
	recordCancelled: {
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
	},
	recordHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	patientName: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	serviceName: {
		fontSize: 13,
		fontWeight: '600',
		color: '#0C7C7C',
		marginBottom: 6,
	},
	tagAccepted: {
		backgroundColor: '#E0F2FE',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	tagTextAccepted: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0284C7',
	},
	tagCompleted: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#DCFCE7',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		gap: 4,
	},
	tagTextCompleted: {
		fontSize: 11,
		fontWeight: '700',
		color: '#059669',
	},
	tagCancelled: {
		backgroundColor: '#FEE2E2',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	tagTextCancelled: {
		fontSize: 11,
		fontWeight: '700',
		color: '#DC2626',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	metaText: {
		fontSize: 12,
		color: '#64748B',
	},
	reasonText: {
		fontSize: 11.5,
		color: '#991B1B',
		marginTop: 4,
		fontStyle: 'italic',
	},
	earningsText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#059669',
	},
	earningsSummaryBox: {
		backgroundColor: '#F0FDFA',
		borderColor: '#CCFBF1',
		borderWidth: 1,
		borderRadius: 14,
		padding: 16,
		alignItems: 'center',
		marginBottom: 16,
	},
	earningsSummaryLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#0F766E',
		letterSpacing: 0.5,
	},
	earningsSummaryAmount: {
		fontSize: 26,
		fontWeight: '900',
		color: '#0C7C7C',
		marginVertical: 4,
	},
	earningsSummarySub: {
		fontSize: 12,
		color: '#475569',
	},
	ledgerHeaderTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 10,
	},
	ledgerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	ledgerService: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1E293B',
	},
	ledgerPatient: {
		fontSize: 11.5,
		color: '#64748B',
	},
	ledgerAmount: {
		fontSize: 14,
		fontWeight: '800',
		color: '#059669',
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 24,
	},
	emptyText: {
		fontSize: 13,
		color: '#64748B',
		marginTop: 6,
	},
	doneBtn: {
		backgroundColor: '#0C7C7C',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 12,
	},
	doneBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#FFFFFF',
	},
})
