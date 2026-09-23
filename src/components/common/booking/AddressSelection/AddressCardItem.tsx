import React from 'react'
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'

export interface AddressCardItemProps {
	label: string
	description: string
	selected: boolean
	onPress: () => void
	badgeText?: string
	style?: StyleProp<ViewStyle>
}

/** Default address-row visual: a radio circle on the left, label + optional
 *  badge, and an address line — no per-address icon. This matches
 *  Laboratory's original `CollectionAddressSection` row exactly. */
export default function AddressCardItem({ label, description, selected, onPress, badgeText, style }: AddressCardItemProps) {
	return (
		<TouchableOpacity
			style={[styles.card, selected && styles.cardSelected, style]}
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
		>
			<View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
				{selected && <View style={styles.radioDot} />}
			</View>
			<View style={styles.textGroup}>
				<View style={styles.labelRow}>
					<Text style={styles.label} numberOfLines={1}>
						{label}
					</Text>
					{badgeText ? (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{badgeText}</Text>
						</View>
					) : null}
				</View>
				<Text style={styles.description} numberOfLines={2}>
					{description}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 14,
		backgroundColor: '#F8FAFC',
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	cardSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#0C7C7C',
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	radioCircleSelected: {
		borderColor: '#0C7C7C',
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0C7C7C',
	},
	textGroup: {
		flex: 1,
		minWidth: 0,
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 2,
	},
	label: {
		fontSize: 13,
		fontWeight: '700',
		color: '#181C1D',
		flexShrink: 1,
	},
	badge: {
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	description: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
	},
})
