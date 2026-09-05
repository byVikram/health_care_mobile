import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
	AppBottomSheet,
	AppButton,
	AppInput,
	AppTypography,
	StatusModal,
} from '../../../components/common'
import { cancelCareRequestProvider } from '../ancillaryService'

interface CancelVisitModalProps {
	visible: boolean
	bookingId: string
	patientName?: string
	onClose: () => void
	onCancelled: () => void
}

const CANCELLATION_REASONS = [
	'Vehicle / transportation breakdown',
	'Medical / emergency conflict',
	'Patient location unreachable',
	'Personal / unexpected emergency',
	'Other reason',
]

export default function CancelVisitModal({
	visible,
	bookingId,
	patientName = 'Patient',
	onClose,
	onCancelled,
}: CancelVisitModalProps) {
	const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0])
	const [customNotes, setCustomNotes] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showSuccessModal, setShowSuccessModal] = useState(false)

	const handleConfirmCancel = async () => {
		if (!bookingId) return
		setIsSubmitting(true)
		try {
			const reasonText =
				selectedReason === 'Other reason' && customNotes.trim()
					? `Other: ${customNotes.trim()}`
					: selectedReason

			await cancelCareRequestProvider(bookingId, reasonText)
			setIsSubmitting(false)
			setShowSuccessModal(true)
		} catch (err) {
			setIsSubmitting(false)
			onClose()
			onCancelled()
		}
	}

	const handleSuccessClose = () => {
		setShowSuccessModal(false)
		onClose()
		onCancelled()
	}

	return (
		<>
			<AppBottomSheet
				visible={visible && !showSuccessModal}
				title="Cancel Care Visit?"
				onClose={onClose}
				footer={
					<View style={styles.actions}>
						<AppButton
							variant="outline"
							onPress={onClose}
							disabled={isSubmitting}
							style={{ flex: 1 }}
						>
							Keep Visit
						</AppButton>
						<AppButton
							variant="primary"
							onPress={handleConfirmCancel}
							loading={isSubmitting}
							disabled={isSubmitting}
							style={{ flex: 1, backgroundColor: '#EF4444' }}
						>
							Yes, Cancel
						</AppButton>
					</View>
				}
			>
				<View style={styles.content}>
					<AppTypography variant="body" style={styles.desc}>
						Cancelling will unassign you from {patientName}'s visit. The request will immediately redispatch to other eligible nurses.
					</AppTypography>

					<AppTypography variant="subtitle" style={styles.reasonHeader}>
						Select reason for cancellation:
					</AppTypography>

					<View style={styles.reasonsList}>
						{CANCELLATION_REASONS.map((reason) => {
							const isSelected = selectedReason === reason
							return (
								<TouchableOpacity
									key={reason}
									style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
									onPress={() => setSelectedReason(reason)}
									activeOpacity={0.8}
								>
									<Ionicons
										name={isSelected ? 'radio-button-on' : 'radio-button-off'}
										size={18}
										color={isSelected ? '#EF4444' : '#94A3B8'}
									/>
									<AppTypography style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
										{reason}
									</AppTypography>
								</TouchableOpacity>
							)
						})}
					</View>

					{selectedReason === 'Other reason' && (
						<AppInput
							placeholder="Please specify reason..."
							value={customNotes}
							onChangeText={setCustomNotes}
							multiline
							numberOfLines={3}
							style={styles.customNotesInput}
						/>
					)}
				</View>
			</AppBottomSheet>

			<StatusModal
				visible={showSuccessModal}
				status="info"
				title="Visit Cancelled"
				description="This care request has been cancelled and returned to the search pool for other nurses."
				submitText="OK"
				onSubmit={handleSuccessClose}
				onCancel={handleSuccessClose}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingVertical: 4,
	},
	desc: {
		fontSize: 13,
		color: '#64748B',
		lineHeight: 18,
		marginBottom: 14,
	},
	reasonHeader: {
		fontSize: 13,
		fontWeight: '700',
		color: '#334155',
		marginBottom: 8,
	},
	reasonsList: {
		width: '100%',
		gap: 8,
		marginBottom: 12,
	},
	reasonOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 10,
	},
	reasonOptionSelected: {
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
	},
	reasonText: {
		fontSize: 13,
		color: '#475569',
		fontWeight: '500',
		flex: 1,
	},
	reasonTextSelected: {
		color: '#991B1B',
		fontWeight: '700',
	},
	customNotesInput: {
		marginTop: 4,
		marginBottom: 12,
	},
	actions: {
		flexDirection: 'row',
		width: '100%',
		gap: 12,
	},
})
