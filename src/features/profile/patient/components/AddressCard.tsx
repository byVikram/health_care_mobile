// Saved-address card: 12px-radius white card (2px primary border when it's the default, divider
// otherwise), label + "Default" tag, full address, contact line, and a 40px "more" button that opens the
// address options sheet.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconTile, AppTag } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { PatientAddress } from '../PatientProfileService'

export const fullAddress = (a: PatientAddress) =>
	[a.flat, a.area, a.landmark].some(Boolean)
		? [a.flat, a.area, a.landmark, [a.city, a.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
		: [a.address_line, [a.city, a.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')

const iconFor = (label: string) => {
	const l = label.toLowerCase()
	if (l.includes('home')) return 'home-outline' as const
	if (l.includes('work') || l.includes('office')) return 'briefcase-outline' as const
	return 'map-marker-outline' as const
}

export function AddressCard({ address, onMore }: { address: PatientAddress; onMore: () => void }) {
	const contact = [address.contact_name, address.contact_phone].filter(Boolean).join(' · ')
	return (
		<View style={[styles.card, address.is_default && styles.cardDefault]}>
			<AppIconTile icon={iconFor(address.label)} tone={address.is_default ? 'mint' : 'sky'} size={40} />
			<View style={styles.text}>
				<View style={styles.titleRow}>
					<Text style={styles.label} numberOfLines={1}>
						{address.label}
					</Text>
					{address.is_default && (
						<AppTag label="Default" tone="mint" size="xs" shape="rounded" uppercase={false} />
					)}
				</View>
				<Text style={styles.line}>{fullAddress(address)}</Text>
				{!!contact && <Text style={styles.contact}>{contact}</Text>}
			</View>
			<TouchableOpacity
				style={styles.more}
				onPress={onMore}
				accessibilityRole="button"
				accessibilityLabel={`More options for ${address.label}`}
			>
				<MaterialCommunityIcons name="dots-vertical" size={22} color={APP_COLORS.ink} />
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		marginHorizontal: 16,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	cardDefault: {
		borderWidth: 2,
		borderColor: APP_COLORS.primary,
	},
	text: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	label: {
		flexShrink: 1,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	line: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	contact: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	more: {
		width: 40,
		height: 40,
		marginTop: -6,
		marginRight: -8,
		alignItems: 'center',
		justifyContent: 'center',
	},
})

export default AddressCard
