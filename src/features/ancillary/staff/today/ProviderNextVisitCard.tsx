// src/features/ancillary/staff/today/ProviderNextVisitCard.tsx
//
// "NEXT VISIT" (or CURRENT SHIFT / NEXT SESSION) card of the provider Today design: 2px primary border, mint strip with the eyebrow and
// "7:00 PM · in 45 min", then the service with patient · distance · ETA, and Call / Navigate / Open.
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppButton, AppIconButton, AppIconTile } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { callPhone, openDirections } from '../../../../utils/maps'
import type { ProviderVisitSummary } from '../../providerVisitService'
import type { ProviderSpecialityCopy } from '../providerSpecialityCopy'
import { nextVisitEyebrow, nextVisitWhen, visitTitle, visitTravelLine } from './todayView'

export type ProviderNextVisitCardProps = {
	visit: ProviderVisitSummary
	copy: ProviderSpecialityCopy
	onOpen: (visit: ProviderVisitSummary) => void
}

export function ProviderNextVisitCard({ visit, copy, onOpen }: ProviderNextVisitCardProps) {
	const eyebrow = nextVisitEyebrow(visit, copy)
	const when = nextVisitWhen(visit)
	const title = visitTitle(visit, copy.noun)
	const phone = visit.patient.phone

	return (
		<View style={styles.card} accessibilityLabel={`${eyebrow.toLowerCase()}, ${when}, ${title}`}>
			<View style={styles.strip}>
				<Text style={styles.eyebrow}>{eyebrow}</Text>
				<Text style={styles.when} numberOfLines={1}>
					{when}
				</Text>
			</View>
			<View style={styles.body}>
				<View style={styles.infoRow}>
					<AppIconTile icon={copy.icon} tone="mint" size={44} radius={12} iconSize={22} />
					<View style={styles.infoText}>
						<Text style={styles.title} numberOfLines={2}>
							{title}
						</Text>
						<Text style={styles.sub} numberOfLines={1}>
							{visitTravelLine(visit)}
						</Text>
					</View>
				</View>
				<View style={styles.actions}>
					<AppIconButton
						icon="phone-outline"
						variant="outline"
						size={44}
						radius={12}
						disabled={!phone}
						accessibilityLabel={visit.patient.name ? `Call ${visit.patient.name}` : 'Call patient'}
						onPress={() => void callPhone(phone)}
					/>
					<AppButton
						variant="outline"
						size="md"
						icon="navigation-variant-outline"
						style={styles.flexBtn}
						onPress={() =>
							void openDirections(
								visit.address.latitude,
								visit.address.longitude,
								visit.address.street_address
							)
						}
					>
						Navigate
					</AppButton>
					<AppButton size="md" style={styles.flexBtn} onPress={() => onOpen(visit)}>
						Open
					</AppButton>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 14,
		borderWidth: 2,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		overflow: 'hidden',
	},
	strip: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: APP_COLORS.mint,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.66,
		color: APP_COLORS.primary,
	},
	when: {
		flexShrink: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	body: {
		padding: 14,
		gap: 12,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	infoText: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
	},
	flexBtn: {
		flex: 1,
	},
})

export default ProviderNextVisitCard
