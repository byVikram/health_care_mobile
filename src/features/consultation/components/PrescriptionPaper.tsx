// src/features/consultation/components/PrescriptionPaper.tsx
//
// The doctor's prescription page: the fixed format of the design (clinic band, doctor block with the Rx mark, patient
// grid, footer) around a blank body, where the doctor types or scribbles. What they write is sent to the backend, which
// draws the same page as the stored image the patient receives (see config/prescription.ts).
//
// Sizes follow the design's own units, scaled to the width this page is given.

import React, { useState } from 'react'
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PRESCRIPTION_PAGE as P } from '../../../config/prescription'

const INK = '#12373E'
const SUBTLE = '#3D4F52'
const MUTED = '#5B6B6E'

export type PrescriptionPaperProps = {
	clinicName: string
	doctorName: string
	qualifications?: string | null
	designation?: string | null
	/** "Vikram K. · 34 yrs, M" */
	patientLine: string
	dateLabel: string
	diagnosis?: string | null
	/** "KH-1A2B3C4D · In-clinic" */
	bookingLine: string
	/** Height of the blank body, in design units: it is where the canvas or the text box goes. */
	bodyHeight?: number
	children: (body: { width: number; height: number }) => React.ReactNode
}

export function PrescriptionPaper({
	clinicName,
	doctorName,
	qualifications,
	designation,
	patientLine,
	dateLabel,
	diagnosis,
	bookingLine,
	bodyHeight = 214,
	children,
}: PrescriptionPaperProps) {
	const [width, setWidth] = useState<number>(P.designWidth)
	const u = width / P.designWidth
	const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width || P.designWidth)
	const doctorTitle = /^dr\.?\s/i.test(doctorName.trim()) ? doctorName.trim() : `Dr. ${doctorName.trim()}`
	const body = { width: width - 2, height: Math.round(bodyHeight * u) }

	const cell = (label: string, value: string, size: number, flex: number) => (
		<View style={{ flex }}>
			<Text style={{ fontSize: 9 * u, lineHeight: 12 * u, fontWeight: '800', letterSpacing: 0.08 * 9 * u, color: MUTED }}>{label}</Text>
			<Text numberOfLines={1} style={{ fontSize: size * u, lineHeight: (size + 4) * u, fontWeight: size === 12 ? '800' : '700', color: INK }}>
				{value || '—'}
			</Text>
		</View>
	)

	return (
		<View onLayout={onLayout} style={[styles.page, { borderRadius: 6 * u }]}>
			<View style={[styles.band, { backgroundColor: P.headerColor, paddingHorizontal: 14 * u, paddingTop: 12 * u, paddingBottom: 10 * u, gap: 10 * u }]}>
				<View style={{ width: 30 * u, height: 30 * u, borderRadius: 8 * u, backgroundColor: P.logoTileColor, alignItems: 'center', justifyContent: 'center' }}>
					<MaterialCommunityIcons name="plus" size={18 * u} color={P.headerColor} />
				</View>
				<Text numberOfLines={1} style={{ flex: 1, fontSize: 13 * u, lineHeight: 17 * u, fontWeight: '800', color: '#FFFFFF' }}>
					{clinicName}
				</Text>
			</View>
			<View style={{ height: 3 * u, backgroundColor: P.accentColor }} />

			<View style={{ padding: 14 * u, paddingVertical: 12 * u, flexDirection: 'row', alignItems: 'flex-start', gap: 10 * u }}>
				<View style={{ flex: 1, minWidth: 0, gap: 1 * u }}>
					<Text numberOfLines={1} style={{ fontSize: 15 * u, lineHeight: 20 * u, fontWeight: '800', color: INK }}>
						{doctorTitle}
					</Text>
					{!!qualifications && (
						<Text numberOfLines={1} style={{ fontSize: 11 * u, lineHeight: 15 * u, color: SUBTLE }}>
							{qualifications}
						</Text>
					)}
					{!!designation && (
						<Text numberOfLines={1} style={{ fontSize: 11 * u, lineHeight: 15 * u, color: SUBTLE }}>
							{designation}
						</Text>
					)}
				</View>
				<Text accessibilityElementsHidden style={{ fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }), fontSize: 34 * u, lineHeight: 36 * u, fontWeight: '700', fontStyle: 'italic', color: P.accentColor }}>
					Rx
				</Text>
			</View>

			<View style={{ marginHorizontal: 14 * u, paddingHorizontal: 10 * u, paddingVertical: 8 * u, borderRadius: 6 * u, backgroundColor: P.panelColor, gap: 6 * u }}>
				<View style={{ flexDirection: 'row', gap: 10 * u }}>
					{cell('PATIENT', patientLine, 12, 1.4)}
					{cell('DATE', dateLabel, 12, 1)}
				</View>
				<View style={{ flexDirection: 'row', gap: 10 * u }}>
					{cell('DIAGNOSIS', (diagnosis ?? '').split('\n')[0], 11, 1.4)}
					{cell('BOOKING ID', bookingLine, 11, 1)}
				</View>
			</View>

			<View style={{ height: 12 * u }} />
			<View style={{ height: body.height, backgroundColor: '#FFFFFF' }}>{children(body)}</View>

			<View style={[styles.footer, { paddingHorizontal: 14 * u, paddingVertical: 6 * u }]}>
				<Text style={{ fontSize: 9 * u, lineHeight: 13 * u, color: MUTED }}>{P.footerText}</Text>
				{P.validityDays > 0 && <Text style={{ fontSize: 9 * u, lineHeight: 13 * u, color: MUTED }}>Valid for {P.validityDays} days</Text>}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	page: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.borderColor, overflow: 'hidden' },
	band: { flexDirection: 'row', alignItems: 'center' },
	footer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: P.panelColor, borderTopWidth: 1, borderTopColor: P.borderColor },
})
