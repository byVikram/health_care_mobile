// src/features/consultation/components/RecordVitalsSheet.tsx
//
// "Record vitals" bottom sheet (design variant B): the patient and the day, the six readings as a 2-column grid, a short key for
// the range dots and one Save button that says how many readings are in. The sheet owns the draft being typed (so a keystroke
// re-renders only the sheet); the page's useRecordVitals hook owns the save.

import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet, AppButton } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import {
	RATING_TONES,
	VITAL_FIELDS,
	countFilled,
	toNumberText,
	type VitalFieldId,
	type VitalValues,
} from '../vitalsEntry'
import { VitalFieldTile } from './VitalFieldTile'

type Props = {
	visible: boolean
	patientName: string
	/** What is recorded today: the sheet opens on it, and the fields not yet touched follow it if it changes while open. */
	initial: VitalValues
	saving: boolean
	onClose: () => void
	onSave: (draft: VitalValues) => void
}

export function RecordVitalsSheet({ visible, patientName, initial, saving, onClose, onSave }: Props) {
	const [draft, setDraft] = useState<VitalValues>(initial)
	const startedFrom = useRef<VitalValues>(initial)

	// Every opening starts from what is recorded today.
	useEffect(() => {
		if (!visible) return
		setDraft(initial)
		startedFrom.current = initial
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only an opening resets the draft
	}, [visible])

	// Today's readings can arrive while the sheet is open (a slow fetch): fields the doctor has not touched take the new values, so
	// readings that exist are never shown as blanks.
	useEffect(() => {
		if (!visible) return
		const before = startedFrom.current
		setDraft((current) => {
			const next = { ...current }
			for (const field of VITAL_FIELDS) {
				if (current[field.id] === before[field.id]) next[field.id] = initial[field.id]
			}
			return next
		})
		startedFrom.current = initial
		// eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the readings changing, not to the sheet opening
	}, [initial])

	const setField = (id: VitalFieldId, text: string) =>
		setDraft((previous) => ({ ...previous, [id]: toNumberText(text) }))
	const filled = countFilled(draft)

	return (
		<AppBottomSheet
			visible={visible}
			title="Record vitals"
			subtitle={`${patientName || 'Patient'} · Today`}
			onClose={onClose}
			appearance="modern"
			dismissible={!saving}
			showHeaderDivider={false}
			footer={
				<AppButton
					variant="primary"
					size="lg"
					loading={saving}
					disabled={saving || filled === 0}
					softDisabled
					onPress={() => onSave(draft)}
					accessibilityLabel="Save vitals"
				>
					{filled ? `Save vitals · ${filled} of ${VITAL_FIELDS.length} added` : 'Add a reading to save'}
				</AppButton>
			}
		>
			<View style={styles.grid}>
				{VITAL_FIELDS.map((field) => (
					<VitalFieldTile
						key={field.id}
						field={field}
						value={draft[field.id]}
						onChangeText={(text) => setField(field.id, text)}
						style={styles.cell}
					/>
				))}
			</View>
			<View style={styles.key}>
				<View style={[styles.keyDot, { backgroundColor: RATING_TONES.high.dot }]} />
				<Text style={styles.keyText}>Red dot = outside the normal range</Text>
				<View style={[styles.keyDot, { backgroundColor: RATING_TONES.watch.dot }]} />
				<Text style={styles.keyText}>Amber = borderline</Text>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	cell: { flexBasis: '47%', flexGrow: 1 },
	key: {
		marginTop: 12,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
	},
	keyDot: { width: 7, height: 7, borderRadius: 9999 },
	keyText: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted, marginRight: 6 },
})

export default RecordVitalsSheet
