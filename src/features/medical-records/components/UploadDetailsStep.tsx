// src/features/medical-records/components/UploadDetailsStep.tsx
//
// Step 2 of the upload sheet ("Record details"): the picked file, what it is (prescription or lab
// report), the date on the record, and whose record it is saved to. The Save button lives in the
// sheet's footer; this step only edits the draft it is given.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppCalendar, AppFamilyMemberAvatar, AppFormField, AppSegmentedControl } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'
import type { PickedFile } from '../../../utils/pickedFile'
import type { UploadKind } from '../medicalRecordsTypes'
import { describeFile, fileBadge } from '../medicalRecordsView'
import { UPLOAD_KINDS, UPLOAD_KIND_PROMPT } from '../recordVisuals'

type Props = {
	file: PickedFile
	kind: UploadKind | null
	onKind: (kind: UploadKind) => void
	/** YYYY-MM-DD. */
	date: string
	onDate: (isoDate: string) => void
	/** Whose record it is saved to, and where they sit in the family list (the avatar tone). */
	member: FamilyMemberOption
	memberIndex: number
	onChangeMember: () => void
	/** Why the last save failed (the server's words), shown under the form. */
	error?: string | null
}

export function UploadDetailsStep({
	file,
	kind,
	onKind,
	date,
	onDate,
	member,
	memberIndex,
	onChangeMember,
	error,
}: Props) {
	const hint = UPLOAD_KINDS.find((option) => option.value === kind)?.hint ?? UPLOAD_KIND_PROMPT

	return (
		<View style={styles.root}>
			<View style={styles.file}>
				<View style={styles.badge}>
					<Text style={styles.badgeText}>{fileBadge(file)}</Text>
				</View>
				<View style={styles.fileText}>
					<Text style={styles.fileName} numberOfLines={1}>
						{file.name}
					</Text>
					<Text style={styles.fileMeta}>{describeFile(file)}</Text>
				</View>
			</View>

			<View style={styles.block}>
				<Text style={styles.label}>What is it?</Text>
				<AppSegmentedControl
					shape="rounded"
					accessibilityLabel="Record type"
					options={UPLOAD_KINDS.map((option) => ({
						value: option.value,
						label: option.value,
						icon: option.icon,
					}))}
					value={kind ?? ''}
					onChange={(value) => onKind(value as UploadKind)}
				/>
				<Text style={styles.hint}>{hint}</Text>
			</View>

			<AppFormField label="Date on record">
				<AppCalendar value={date} onChange={onDate} placeholder="Pick a date" modalTitle="Date on record" />
			</AppFormField>

			<TouchableOpacity
				onPress={onChangeMember}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel={`Saving to ${member.name}, ${member.relation}. Change whose records this is saved to`}
				style={styles.saveTo}
			>
				<AppFamilyMemberAvatar member={member} index={memberIndex} size={32} />
				<View style={styles.saveToText}>
					<Text style={styles.saveToLabel}>Saving to</Text>
					<Text style={styles.saveToName} numberOfLines={1}>
						{member.name} · {member.relation}
					</Text>
				</View>
				<Text style={styles.change}>Change</Text>
			</TouchableOpacity>

			{!!error && (
				<Text style={styles.error} accessibilityRole="alert">
					{error}
				</Text>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	root: { gap: 14 },
	file: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	badge: {
		width: 44,
		height: 52,
		borderRadius: 6,
		backgroundColor: '#EEF5F5',
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		alignItems: 'center',
		justifyContent: 'flex-end',
		paddingBottom: 4,
	},
	badgeText: { fontSize: 9, fontWeight: '800', color: APP_COLORS.primary },
	fileText: { flex: 1, minWidth: 0 },
	fileName: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	fileMeta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	block: { gap: 6 },
	label: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	hint: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	saveTo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 8,
		paddingLeft: 8,
		paddingRight: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	saveToText: { flex: 1, minWidth: 0 },
	saveToLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: APP_COLORS.inkMuted },
	saveToName: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.ink },
	change: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	error: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.danger },
})
