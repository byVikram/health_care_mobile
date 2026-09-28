// src/features/appointment/components/patient-details/CheckInQrSheet.tsx
//
// "Check-in QR" sheet (design 7) -- encodes the booking id.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { AppBottomSheet } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'

type CheckInQrSheetProps = {
	visible: boolean
	bookingId: string
	onClose: () => void
}

export default function CheckInQrSheet({ visible, bookingId, onClose }: CheckInQrSheetProps) {
	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title="Check-in QR"
			subtitle="Show this at the clinic front desk"
			onClose={onClose}
			maxHeightRatio={0.88}
		>
			<View style={styles.body}>
				<View style={styles.qrBox} accessible accessibilityRole="image" accessibilityLabel="Booking QR code">
					{!!bookingId && <QRCode value={bookingId} size={210} color={APP_COLORS.ink} backgroundColor="#FFFFFF" />}
				</View>
				<Text style={styles.bookingId} selectable>
					{bookingId}
				</Text>
				<Text style={styles.note}>
					Staff scan this to check you in. Turn up your screen brightness if it doesn’t scan.
				</Text>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	// AppBottomSheet supplies the 16px side padding and safe-area bottom padding.
	body: { paddingBottom: 8, alignItems: 'center', gap: 12 },
	qrBox: {
		padding: 14,
		borderRadius: 14,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	bookingId: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink, textAlign: 'center' },
	note: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
})
