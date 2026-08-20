import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { AppModal } from '../../../components/common/AppModal'
import { AppButton } from '../../../components/common/AppButton'
import { AppTypography } from '../../../components/common/AppTypography'

interface CancellationDetailsModalProps {
	visible: boolean
	onClose: () => void
	onConfirmCancel: () => void
	isCancelling?: boolean
}

export default function CancellationDetailsModal({
	visible,
	onClose,
	onConfirmCancel,
	isCancelling = false,
}: CancellationDetailsModalProps) {
	return (
		<AppModal visible={visible} onDismiss={onClose} title="Cancel Booking Request">
			<View style={styles.content}>
				<View style={styles.warningBox}>
					<MaterialCommunityIcons name="alert-circle-outline" size={24} color="#D97706" />
					<Text style={styles.warningText}>
						Free cancellation is available within 5 minutes of placing your request.
					</Text>
				</View>

				<AppTypography variant="h3" style={styles.policyTitle}>
					Cancellation Fee Policy
				</AppTypography>

				<View style={styles.policyRow}>
					<Ionicons name="checkmark-circle" size={18} color="#059669" />
					<Text style={styles.policyText}>Before provider assignment: Full 100% refund.</Text>
				</View>

				<View style={styles.policyRow}>
					<Ionicons name="time-outline" size={18} color="#D97706" />
					<Text style={styles.policyText}>Provider en route (&gt;5 mins): ₹150 travel fee applies.</Text>
				</View>

				<View style={styles.policyRow}>
					<Ionicons name="close-circle" size={18} color="#DC2626" />
					<Text style={styles.policyText}>Provider arrived at doorstep: Base fee non-refundable.</Text>
				</View>

				<View style={styles.actions}>
					<AppButton variant="outline" onPress={onClose} style={styles.keepBtn}>
						Keep Booking
					</AppButton>
					<AppButton
						variant="primary"
						onPress={onConfirmCancel}
						loading={isCancelling}
						style={styles.cancelBtn}
					>
						Confirm Cancel
					</AppButton>
				</View>
			</View>
		</AppModal>
	)
}

const styles = StyleSheet.create({
	content: {
		gap: 16,
		paddingVertical: 8,
	},
	warningBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FEF3C7',
		borderRadius: 12,
		padding: 12,
		gap: 10,
	},
	warningText: {
		fontSize: 12.5,
		color: '#92400E',
		fontWeight: '600',
		flex: 1,
	},
	policyTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginTop: 4,
	},
	policyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	policyText: {
		fontSize: 13,
		color: '#334155',
		flex: 1,
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 12,
	},
	keepBtn: {
		flex: 1,
	},
	cancelBtn: {
		flex: 1,
		backgroundColor: '#DC2626',
	},
})
