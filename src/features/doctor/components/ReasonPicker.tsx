// src/features/doctor/components/ReasonPicker.tsx
//
// "Select a reason" + "Message to patient (optional)" of the doctor's Cancel, Ask-to-reschedule and Decline sheets ("Doctor Dashboard
// NEW"): one card of radio rows (the picked one tinted and bold), then a short note box. `composeReason` joins the two the way the
// server stores them: the reason, then " — " and the note; with "Other reason" the note alone is the reason.
// Built from the shared AppRadio (the indicator) and AppInput (the note box); ReasonList and NoteField are exported so a sheet that
// needs only one of them (Decline has its own heading and note label) uses the same pieces.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppInput, AppRadio } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

export type ReasonOption = { id: string; label: string }

export const OTHER_REASON_ID = 'other'

/** What is sent as the reason: "I have an emergency — please come at 6", or just the note after "Other reason". */
export function composeReason(
	options: ReasonOption[],
	reasonId: string | null,
	note: string,
	maxLength: number
): string {
	const label = options.find((o) => o.id === reasonId)?.label ?? ''
	const text = note.trim()
	const joined = reasonId === OTHER_REASON_ID ? text || label : text ? `${label} — ${text}` : label
	return joined.slice(0, maxLength)
}

/** One bordered card of radio rows. */
export function ReasonList({
	options,
	value,
	onChange,
}: {
	options: ReasonOption[]
	value: string | null
	onChange: (id: string) => void
}) {
	return (
		<View style={styles.group} accessibilityRole="radiogroup">
			{options.map((o, i) => {
				const on = o.id === value
				return (
					<TouchableOpacity
						key={o.id}
						accessibilityRole="radio"
						accessibilityState={{ checked: on }}
						activeOpacity={0.8}
						onPress={() => onChange(o.id)}
						style={[styles.row, i < options.length - 1 && styles.rule, on && styles.rowOn]}
					>
						<AppRadio checked={on} />
						<Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

/** A bold heading over a short multi-line note box. */
export function NoteField({
	label,
	optional = false,
	placeholder,
	value,
	onChange,
	maxLength,
}: {
	label: string
	/** Adds a muted "(optional)" after the label. */
	optional?: boolean
	placeholder: string
	value: string
	onChange: (text: string) => void
	maxLength: number
}) {
	return (
		<View style={{ gap: 8 }}>
			<Text style={styles.heading}>
				{label} {optional && <Text style={styles.optional}>(optional)</Text>}
			</Text>
			<AppInput
				noMargin
				multiline
				numberOfLines={2}
				placeholder={placeholder}
				value={value}
				onChangeText={(t) => onChange(t.slice(0, maxLength))}
				maxLength={maxLength}
				accessibilityLabel={label}
			/>
		</View>
	)
}

type Props = {
	options: ReasonOption[]
	value: string | null
	onChange: (id: string) => void
	note: string
	onNoteChange: (text: string) => void
	noteMaxLength: number
	notePlaceholder?: string
}

export function ReasonPicker({
	options,
	value,
	onChange,
	note,
	onNoteChange,
	noteMaxLength,
	notePlaceholder = 'Add a short note',
}: Props) {
	return (
		<View style={{ gap: 14 }}>
			<View style={{ gap: 8 }}>
				<Text style={styles.heading}>Select a reason</Text>
				<ReasonList options={options} value={value} onChange={onChange} />
			</View>
			<NoteField
				label="Message to patient"
				optional
				placeholder={notePlaceholder}
				value={note}
				onChange={onNoteChange}
				maxLength={noteMaxLength}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	heading: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	optional: { fontWeight: '400', color: APP_COLORS.inkMuted },
	group: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
	},
	row: { minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowOn: { backgroundColor: '#F0F7F7' },
	rule: { borderBottomWidth: 1, borderBottomColor: '#E3EAEB' },
	label: { flex: 1, fontSize: 15, lineHeight: 20, color: APP_COLORS.ink },
	labelOn: { fontWeight: '800' },
})
