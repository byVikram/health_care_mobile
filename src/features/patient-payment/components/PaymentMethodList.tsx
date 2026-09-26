// src/features/patient-payment/components/PaymentMethodList.tsx
//
// "Pay with" radio list from the Payment design: UPI, Credit or debit card,
// Net banking and Pay at clinic, each with an inline expansion when selected.
//
// There is NO payment gateway yet. The UPI / card inputs are presentation-only:
// their values live in local component state, are never validated, sent, stored
// or logged, and are discarded when the screen unmounts.

import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { showComingSoon } from '../../../utils/toast'
import { AppIconTile, AppRadio, AppIcon, type AppIconName } from '../../../components/common'

export type PaymentMethodId = 'upi' | 'card' | 'netbank' | 'later'

/** Short label forwarded to the Confirmed screen ("₹x paid via {label}"). */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
	upi: 'UPI',
	card: 'Card',
	netbank: 'Net banking',
	later: 'Pay at clinic',
}

const METHODS: { id: PaymentMethodId; title: string; subtitle: string; icon: AppIconName }[] = [
	{ id: 'upi', title: 'UPI', subtitle: 'Pay from any UPI app', icon: 'phone' },
	{ id: 'card', title: 'Credit or debit card', subtitle: 'Visa, Mastercard, RuPay', icon: 'card' },
	{ id: 'netbank', title: 'Net banking', subtitle: 'All major Indian banks', icon: 'bank' },
	{ id: 'later', title: 'Pay at clinic', subtitle: 'Cash, card or UPI at the front desk', icon: 'clinic' },
]

type Props = {
	value: PaymentMethodId
	onChange: (id: PaymentMethodId) => void
	/** Pay at clinic is only offered for in-clinic visits */
	payAtClinicDisabled?: boolean
}

export default function PaymentMethodList({ value, onChange, payAtClinicDisabled = false }: Props) {
	// UI-only field state -- intentionally never read outside this component.
	const [upiId, setUpiId] = useState('')
	const [cardNumber, setCardNumber] = useState('')
	const [cardExpiry, setCardExpiry] = useState('')
	const [cardCvv, setCardCvv] = useState('')

	return (
		<View accessibilityRole="radiogroup">
			{METHODS.map((m, idx) => {
				const selected = value === m.id
				const disabled = m.id === 'later' && payAtClinicDisabled
				const isLast = idx === METHODS.length - 1
				return (
					<View key={m.id} style={[!isLast && styles.rowWrapBorder, disabled && styles.disabled]}>
						<TouchableOpacity
							style={styles.row}
							activeOpacity={0.8}
							disabled={disabled}
							onPress={() => onChange(m.id)}
							accessibilityRole="radio"
							accessibilityState={{ checked: selected, disabled }}
							accessibilityLabel={`${m.title}, ${m.subtitle}`}
						>
							<AppIconTile backgroundColor={APP_COLORS.mint} radius={8}>
								<AppIcon name={m.icon} size={20} color={APP_COLORS.primary} />
							</AppIconTile>
							<View style={styles.textCol}>
								<Text style={styles.title}>{m.title}</Text>
								<Text style={styles.subtitle}>
									{disabled ? 'Available for in-clinic visits only' : m.subtitle}
								</Text>
							</View>
							<AppRadio checked={selected} />
						</TouchableOpacity>

						{selected && m.id === 'upi' && (
							<View style={[styles.expand, { gap: 8 }]}>
								<Text style={styles.label}>UPI ID</Text>
								<View style={styles.upiRow}>
									<TextInput
										value={upiId}
										onChangeText={setUpiId}
										placeholder="yourname@bank"
										placeholderTextColor={APP_COLORS.border}
										keyboardType="email-address"
										autoCapitalize="none"
										autoCorrect={false}
										autoComplete="off"
										importantForAutofill="no"
										style={[styles.input, styles.flexInput]}
										accessibilityLabel="UPI ID"
									/>
									<TouchableOpacity
										style={styles.verifyBtn}
										activeOpacity={0.8}
										onPress={() => showComingSoon()}
									>
										<Text style={styles.verifyText}>Verify</Text>
									</TouchableOpacity>
								</View>
							</View>
						)}

						{selected && m.id === 'card' && (
							<View style={[styles.expand, { gap: 12 }]}>
								<View style={styles.field}>
									<Text style={styles.label}>Card number</Text>
									<TextInput
										value={cardNumber}
										onChangeText={setCardNumber}
										placeholder="1234 5678 9012 3456"
										placeholderTextColor={APP_COLORS.border}
										keyboardType="number-pad"
										maxLength={23}
										autoComplete="off"
										importantForAutofill="no"
										style={styles.input}
										accessibilityLabel="Card number"
									/>
								</View>
								<View style={styles.cardRow}>
									<View style={[styles.field, styles.half]}>
										<Text style={styles.label}>Expiry</Text>
										<TextInput
											value={cardExpiry}
											onChangeText={setCardExpiry}
											placeholder="MM / YY"
											placeholderTextColor={APP_COLORS.border}
											keyboardType="number-pad"
											maxLength={7}
											autoComplete="off"
											importantForAutofill="no"
											style={styles.input}
											accessibilityLabel="Expiry"
										/>
									</View>
									<View style={[styles.field, styles.half]}>
										<Text style={styles.label}>CVV</Text>
										<TextInput
											value={cardCvv}
											onChangeText={setCardCvv}
											placeholder="3 digits"
											placeholderTextColor={APP_COLORS.border}
											keyboardType="number-pad"
											secureTextEntry
											maxLength={4}
											autoComplete="off"
											importantForAutofill="no"
											style={styles.input}
											accessibilityLabel="CVV"
										/>
									</View>
								</View>
							</View>
						)}

						{selected && m.id === 'later' && (
							<Text style={[styles.expand, styles.laterNote]}>
								Your slot is held. Please arrive 10 minutes early to pay and check in.
							</Text>
						)}
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	rowWrapBorder: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	disabled: {
		opacity: 0.45,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 64,
	},
	textCol: {
		flex: 1,
	},
	title: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	expand: {
		paddingLeft: 52,
		paddingBottom: 16,
	},
	label: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	upiRow: {
		flexDirection: 'row',
		gap: 8,
	},
	input: {
		height: 48,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 4,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: APP_COLORS.surface,
	},
	flexInput: {
		flex: 1,
		minWidth: 0,
	},
	verifyBtn: {
		height: 48,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	verifyText: {
		fontSize: 14,
		fontWeight: '600',
		color: APP_COLORS.primary,
	},
	field: {
		gap: 6,
	},
	cardRow: {
		flexDirection: 'row',
		gap: 12,
	},
	half: {
		flex: 1,
		minWidth: 0,
	},
	laterNote: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
})
