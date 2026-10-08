// src/features/ancillary/patient/AncillaryReviewSections.tsx
//
// Sections common to both Review & pay screens (Book now and Later): the "Service" card and the single
// "Pay after the visit" payment row (no gateway).

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import type { AncillaryCartItem } from '../../../navigation/types'
import { AppPaymentMethodList, AppSection, AppTextLink } from '../../../components/common'
import { PAY_AFTER_VISIT } from '../ancillaryProviderBookingService'
import { inr, itemsDurationLabel, itemsFee, itemsSummary } from './ancillaryBookingCopy'

type ServiceProps = {
	items: AncillaryCartItem[]
	/** e.g. "1 visit" / "₹199 per visit". Shown before the duration. */
	caption: string
	/** Amount on the right; defaults to the sum of the items' prices. */
	amount?: number
	onEdit: () => void
	editLabel?: string
}

export function AncillaryServiceSection({ items, caption, amount, onEdit, editLabel = 'Edit' }: ServiceProps) {
	const duration = itemsDurationLabel(items)
	return (
		<AppSection
			title="Service"
			titleSize="sm"
			marginTop={0}
			right={<AppTextLink label={editLabel} onPress={onEdit} size="sm" trailingIcon="none" />}
		>
			<View style={styles.serviceRow}>
				<View style={styles.flex}>
					<Text style={styles.serviceName} numberOfLines={2}>
						{itemsSummary(items)}
					</Text>
					<Text style={styles.muted}>{[caption, duration].filter(Boolean).join(' · ')}</Text>
				</View>
				<Text style={styles.price}>{inr(amount ?? itemsFee(items))}</Text>
			</View>
		</AppSection>
	)
}

export function AncillaryPayAfterVisitSection({ noun }: { noun: string }) {
	return (
		<AppSection title="Pay with" titleSize="sm" marginTop={0}>
			<AppPaymentMethodList
				methods={[
					{
						id: PAY_AFTER_VISIT,
						title: 'Pay after the visit',
						subtitle: `Cash or UPI to the ${noun}`,
						icon: 'cash',
					},
				]}
				value={PAY_AFTER_VISIT}
				onChange={() => undefined}
			/>
		</AppSection>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	serviceName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	price: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
})
