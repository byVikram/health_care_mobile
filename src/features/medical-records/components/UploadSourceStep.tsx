// src/features/medical-records/components/UploadSourceStep.tsx
//
// Step 1 of the upload sheet ("Upload a record"): one row per way to add a file (camera, gallery, PDF) and a privacy note.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconTile, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { UPLOAD_SOURCES, type UploadSourceId } from '../recordVisuals'

type Props = {
	disabled?: boolean
	onPick: (source: UploadSourceId) => void
}

export function UploadSourceStep({ disabled = false, onPick }: Props) {
	return (
		<View style={styles.root}>
			<View style={styles.options}>
				{UPLOAD_SOURCES.map((source) => (
					<TouchableOpacity
						key={source.id}
						onPress={() => onPick(source.id)}
						disabled={disabled}
						activeOpacity={0.85}
						accessibilityRole="button"
						accessibilityLabel={`${source.label}. ${source.hint}`}
						style={styles.option}
					>
						<AppIconTile backgroundColor={source.tone.bg} size={42} radius={12}>
							<MaterialCommunityIcons name={source.icon} size={22} color={source.tone.ink} />
						</AppIconTile>
						<View style={styles.optionText}>
							<Text style={styles.optionTitle}>{source.label}</Text>
							<Text style={styles.optionHint}>{source.hint}</Text>
						</View>
						<AppPathIcon d="M9 6l6 6-6 6" size={16} strokeWidth={2.4} color="#9AAFB2" />
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.note}>
				<AppPathIcon
					d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"
					size={16}
					color={APP_COLORS.primary}
				/>
				<Text style={styles.noteText}>Your records are private to you. JPG, PNG or PDF, up to 20 MB.</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { gap: 14 },
	options: { gap: 8 },
	option: {
		minHeight: 64,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	optionText: { flex: 1 },
	optionTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	optionHint: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	note: {
		flexDirection: 'row',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
	},
	noteText: { flex: 1, fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
})
