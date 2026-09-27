// src/components/common/booking/AppPaymentMethodList.tsx
//
// Shared "Pay with" radio list (KarolaHealth Payment design): icon tile + title/subtitle (+ optional badge)
// + radio per method, with an optional inline expansion under the selected row (UPI id field, card fields
// or a plain note). Methods are supplied by the caller, so the doctor flow (PatientPayment) and the
// ancillary / laboratory flow (BookingPaymentPage) render the same component with their own method ids.
//
// There is NO payment gateway yet. The UPI / card inputs are presentation-only: their values live in local
// component state, are never validated, sent, stored or logged, and are discarded on unmount.

import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { showComingSoon } from '../../../utils/toast'
import { AppIcon, type AppIconName } from '../display/AppIcon'
import { AppIconTile } from '../display/AppIconTile'
import { AppRadio } from '../inputs/AppRadio'

type MciName = keyof typeof MaterialCommunityIcons.glyphMap

// Every AppIcon glyph -- typed as a full Record so adding a glyph to AppIcon without listing it here fails tsc.
// Names in this set render with AppIcon; anything else is treated as a MaterialCommunityIcons glyph.
const APP_ICON_NAMES: Record<AppIconName, true> = {
	back: true,
	search: true,
	chevronRight: true,
	chevronDown: true,
	video: true,
	pin: true,
	steth: true,
	phone: true,
	card: true,
	bank: true,
	clinic: true,
	shield: true,
	lock: true,
	check: true,
	calendar: true,
	directions: true,
	download: true,
}

const isAppIconName = (name: string): name is AppIconName => Object.prototype.hasOwnProperty.call(APP_ICON_NAMES, name)

export type AppPaymentMethod<Id extends string = string> = {
	id: Id
	title: string
	subtitle?: string
	/** AppIcon glyph (preferred) or a MaterialCommunityIcons glyph name. */
	icon: AppIconName | MciName
	/** Small chip next to the title, e.g. "Recommended". */
	badge?: string
	/** Badge colour pair from TONES. Defaults to 'mint'. */
	badgeTone?: ToneKey
	disabled?: boolean
	/** Replaces the subtitle while disabled. */
	disabledReason?: string
	/** Inline expansion shown under the row while it is selected. */
	expand?: 'upi' | 'card' | 'note'
	/** Copy for `expand: 'note'`. */
	note?: string
}

export type AppPaymentMethodListProps<Id extends string = string> = {
	methods: AppPaymentMethod<Id>[]
	value: Id
	onChange: (id: Id) => void
	/** Render the "Payments are encrypted…" line under the list. `true` = default copy, or pass custom copy. */
	secureNote?: boolean | string
	style?: StyleProp<ViewStyle>
}

const DEFAULT_SECURE_NOTE = 'Payments are encrypted. We never store your CVV.'

export type AppSecurePaymentNoteProps = {
	text?: string
	style?: StyleProp<ViewStyle>
}

/** Centered shield + "Payments are encrypted…" line. Also usable on its own (e.g. outside the list's section). */
export function AppSecurePaymentNote({ text = DEFAULT_SECURE_NOTE, style }: AppSecurePaymentNoteProps) {
	return (
		<View style={[styles.secureRow, style]}>
			<AppIcon name="shield" size={16} color={APP_COLORS.primary} />
			<Text style={styles.secureText}>{text}</Text>
		</View>
	)
}

function MethodIcon({ name }: { name: AppIconName | MciName }) {
	return (
		<AppIconTile backgroundColor={APP_COLORS.mint} radius={8}>
			{isAppIconName(name) ? (
				<AppIcon name={name} size={20} color={APP_COLORS.primary} />
			) : (
				<MaterialCommunityIcons name={name} size={20} color={APP_COLORS.primary} />
			)}
		</AppIconTile>
	)
}

export function AppPaymentMethodList<Id extends string = string>({
	methods,
	value,
	onChange,
	secureNote,
	style,
}: AppPaymentMethodListProps<Id>) {
	// UI-only field state -- intentionally never read outside this component.
	const [upiId, setUpiId] = useState('')
	const [cardNumber, setCardNumber] = useState('')
	const [cardExpiry, setCardExpiry] = useState('')
	const [cardCvv, setCardCvv] = useState('')

	return (
		<View style={style}>
			<View accessibilityRole="radiogroup">
				{methods.map((m, idx) => {
					const selected = value === m.id
					const disabled = !!m.disabled
					const isLast = idx === methods.length - 1
					const subtitle = disabled && m.disabledReason ? m.disabledReason : m.subtitle
					const badgeTone = TONES[m.badgeTone ?? 'mint']
					return (
						<View key={m.id} style={[!isLast && styles.rowWrapBorder, disabled && styles.disabled]}>
							<TouchableOpacity
								style={styles.row}
								activeOpacity={0.8}
								disabled={disabled}
								onPress={() => onChange(m.id)}
								accessibilityRole="radio"
								accessibilityState={{ checked: selected, disabled }}
								accessibilityLabel={[m.title, m.badge, subtitle].filter(Boolean).join(', ')}
							>
								<MethodIcon name={m.icon} />
								<View style={styles.textCol}>
									<View style={styles.titleRow}>
										<Text style={styles.title}>{m.title}</Text>
										{!!m.badge && (
											<View style={[styles.badge, { backgroundColor: badgeTone.bg }]}>
												<Text style={[styles.badgeText, { color: badgeTone.ink }]}>
													{m.badge}
												</Text>
											</View>
										)}
									</View>
									{!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
								</View>
								<AppRadio checked={selected} />
							</TouchableOpacity>

							{selected && m.expand === 'upi' && (
								<View style={[styles.expand, styles.expandUpi]}>
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

							{selected && m.expand === 'card' && (
								<View style={[styles.expand, styles.expandCard]}>
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

							{selected && m.expand === 'note' && !!m.note && (
								<Text style={[styles.expand, styles.note]}>{m.note}</Text>
							)}
						</View>
					)
				})}
			</View>

			{!!secureNote && (
				<AppSecurePaymentNote
					text={typeof secureNote === 'string' ? secureNote : undefined}
					style={styles.secureInList}
				/>
			)}
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
		minWidth: 0,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		columnGap: 6,
	},
	title: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 9999,
	},
	badgeText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	// 52 = 40px icon tile + 12px row gap, so expansions line up with the title.
	expand: {
		paddingLeft: 52,
		paddingBottom: 16,
	},
	expandUpi: {
		gap: 8,
	},
	expandCard: {
		gap: 12,
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
	note: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
	secureRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	secureInList: {
		marginTop: 12,
	},
	secureText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
		color: APP_COLORS.inkMuted,
	},
})

export default AppPaymentMethodList
