// src/features/consultation/components/VitalFieldTile.tsx
//
// One reading in the "Record vitals" sheet (design: the 2-column field grid): label with a range dot, the value in a large
// numeric input and its unit beside it. The dot and the border follow how the typed value rates against its normal range
// (see rateVital), so an out-of-range reading shows as it is typed. A tap anywhere on the tile focuses the input.

import React, { useRef } from 'react'
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableWithoutFeedback,
	View,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { RATING_LABELS, RATING_TONES, rateVital, type VitalField } from '../vitalsEntry'

type Props = {
	field: VitalField
	value: string
	onChangeText: (text: string) => void
	style?: StyleProp<ViewStyle>
}

export function VitalFieldTile({ field, value, onChangeText, style }: Props) {
	const inputRef = useRef<TextInput>(null)
	const rating = rateVital(field.id, value)
	const tone = RATING_TONES[rating]

	return (
		// accessible={false}: the tile is only a bigger tap target; the input inside is the one element a screen reader should find.
		<TouchableWithoutFeedback accessible={false} onPress={() => inputRef.current?.focus()}>
			<View style={[styles.tile, { borderColor: tone.border }, style]}>
				<View style={styles.head}>
					<Text style={styles.label} numberOfLines={1}>
						{field.label}
					</Text>
					<View style={[styles.dot, { backgroundColor: tone.dot }]} />
				</View>
				<View style={styles.valueRow}>
					<TextInput
						ref={inputRef}
						value={value}
						onChangeText={onChangeText}
						placeholder={field.placeholder}
						placeholderTextColor={APP_COLORS.inkDisabled}
						keyboardType="decimal-pad"
						maxLength={6}
						accessibilityLabel={`${field.label} (${field.unit})${RATING_LABELS[rating] ? `, ${RATING_LABELS[rating]}` : ''}`}
						style={styles.input}
					/>
					<Text style={styles.unit}>{field.unit}</Text>
				</View>
			</View>
		</TouchableWithoutFeedback>
	)
}

const styles = StyleSheet.create({
	tile: {
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderWidth: 1.5,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		gap: 2,
	},
	head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
	label: { flexShrink: 1, fontSize: 11, lineHeight: 14, fontWeight: '800', color: APP_COLORS.inkMuted },
	dot: { width: 7, height: 7, borderRadius: 9999 },
	valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
	input: {
		minWidth: 0,
		flexShrink: 1,
		minHeight: 28,
		padding: 0,
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	unit: { fontSize: 11, color: APP_COLORS.border, fontWeight: '600' },
})

export default VitalFieldTile
