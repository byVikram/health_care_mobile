// src/features/wallet/WalletTopUpModal.tsx
import React, { useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Modal,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { topUpWallet } from './walletService'
import StatusModal from '../../components/common/feedback/StatusModal'

interface WalletTopUpModalProps {
	visible: boolean
	onClose: () => void
	onSuccess: () => void
}

const PRESET_AMOUNTS = [100, 500, 1000, 2000]

export const WalletTopUpModal: React.FC<WalletTopUpModalProps> = ({
	visible,
	onClose,
	onSuccess,
}) => {
	const [amountInput, setAmountInput] = useState('500')
	const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI')
	const [loading, setLoading] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error' | 'info'
		title: string
		description: string
		onClose?: () => void
	} | null>(null)

	const handleTopUp = async () => {
		const parsedAmount = parseFloat(amountInput)
		if (isNaN(parsedAmount) || parsedAmount <= 0) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Invalid Amount',
				description: 'Please enter a valid amount greater than ₹0',
			})
			return
		}

		try {
			setLoading(true)
			const refId = `TOPUP-${Date.now()}`
			const res = await topUpWallet({
				amount: parsedAmount,
				payment_method: selectedMethod,
				reference_id: refId,
				description: `Wallet Top-up via ${selectedMethod}`,
			})

			if (res.success) {
				setStatusModal({
					visible: true,
					status: 'success',
					title: 'Top-up Successful',
					description: `₹${parsedAmount.toFixed(2)} added to your wallet!`,
					onClose: () => {
						onSuccess()
						onClose()
					},
				})
			} else {
				setStatusModal({
					visible: true,
					status: 'error',
					title: 'Top-up Failed',
					description: res.message || 'Could not complete top-up.',
				})
			}
		} catch (error: any) {
			const detail = error?.response?.data?.detail
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Top-up Error',
				description: typeof detail === 'string' ? detail : 'An error occurred during top-up.',
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={styles.sheetContainer}>
					<View style={styles.header}>
						<Text style={styles.title}>Add Money to Wallet</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
							<MaterialCommunityIcons name="close" size={24} color="#666" />
						</TouchableOpacity>
					</View>

					<Text style={styles.label}>Enter Amount (₹)</Text>
					<View style={styles.inputContainer}>
						<Text style={styles.currencySymbol}>₹</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							value={amountInput}
							onChangeText={setAmountInput}
							placeholder="Enter amount"
							placeholderTextColor="#999"
						/>
					</View>

					<Text style={styles.label}>Quick Presets</Text>
					<View style={styles.presetRow}>
						{PRESET_AMOUNTS.map((amt) => (
							<TouchableOpacity
								key={amt}
								style={[
									styles.presetChip,
									amountInput === String(amt) && styles.presetChipActive,
								]}
								onPress={() => setAmountInput(String(amt))}
							>
								<Text
									style={[
										styles.presetText,
										amountInput === String(amt) && styles.presetTextActive,
									]}
								>
									+₹{amt}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<Text style={styles.label}>Payment Method</Text>
					<View style={styles.methodRow}>
						{(['UPI', 'CARD', 'NETBANKING'] as const).map((method) => (
							<TouchableOpacity
								key={method}
								style={[
									styles.methodChip,
									selectedMethod === method && styles.methodChipActive,
								]}
								onPress={() => setSelectedMethod(method)}
							>
								<MaterialCommunityIcons
									name={
										method === 'UPI'
											? 'lightning-bolt'
											: method === 'CARD'
											? 'credit-card-outline'
											: 'bank-outline'
									}
									size={18}
									color={selectedMethod === method ? '#fff' : '#444'}
								/>
								<Text
									style={[
										styles.methodText,
										selectedMethod === method && styles.methodTextActive,
									]}
								>
									{method}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<TouchableOpacity
						style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
						onPress={handleTopUp}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.submitBtnText}>
								Proceed to Add ₹{parseFloat(amountInput || '0').toFixed(2)}
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>

			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => {
						const cb = statusModal.onClose
						setStatusModal(null)
						cb?.()
					}}
					onCancel={() => {
						const cb = statusModal.onClose
						setStatusModal(null)
						cb?.()
					}}
				/>
			)}
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	sheetContainer: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		paddingBottom: 36,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#15202b',
	},
	closeBtn: {
		padding: 4,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#444',
		marginTop: 12,
		marginBottom: 8,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f5f7fa',
		borderRadius: 12,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	currencySymbol: {
		fontSize: 22,
		fontWeight: '700',
		color: '#15202b',
		marginRight: 8,
	},
	input: {
		flex: 1,
		fontSize: 22,
		fontWeight: '700',
		color: '#15202b',
		paddingVertical: 12,
	},
	presetRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	presetChip: {
		flex: 1,
		backgroundColor: '#f5f7fa',
		paddingVertical: 10,
		borderRadius: 10,
		alignItems: 'center',
		marginHorizontal: 4,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	presetChipActive: {
		backgroundColor: '#e6f7f0',
		borderColor: '#42b883',
	},
	presetText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#555',
	},
	presetTextActive: {
		color: '#15803d',
		fontWeight: '700',
	},
	methodRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	methodChip: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f5f7fa',
		paddingVertical: 12,
		borderRadius: 10,
		marginHorizontal: 4,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	methodChipActive: {
		backgroundColor: '#42b883',
		borderColor: '#42b883',
	},
	methodText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#444',
		marginLeft: 6,
	},
	methodTextActive: {
		color: '#fff',
	},
	submitBtn: {
		backgroundColor: '#42b883',
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 24,
	},
	submitBtnDisabled: {
		opacity: 0.7,
	},
	submitBtnText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
})
