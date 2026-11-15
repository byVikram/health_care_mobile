// src/features/medical-records/components/UploadRecordSheet.tsx
//
// The "Record details" bottom sheet of a record upload, opened with the file the patient picked (the page first asks where the file
// comes from with the app's own AppPhotoSourceSheet, then picks it): the file, what it is (prescription or lab report), the date on
// the record and whose record it is. "Change" on the "Saving to" row opens the same family-member sheet the appointment booking uses
// (AppFamilyMemberSheet: pick someone, or add a family member there and then); this sheet is hidden meanwhile (iOS will not present
// one modal over another that is still showing) and comes back as it was. The back arrow goes back to choosing another file.
// It collects an UploadDraft and hands it to `onSave`; the screen sends it, and says through `saving` and `error` how that is going
// (the sheet stays open, with what was typed, if it fails). The page remounts it (a new `key`) for every upload, so each starts empty.

import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
	AppBottomSheet,
	AppButton,
	AppCalendar,
	AppFamilyMemberSheet,
	AppFormField,
	AppPatientRow,
	AppSegmentedControl,
	familyMemberFirstName,
	type FamilyMemberDraft,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'
import { formatDateForApi, formatDateStringForApi } from '../../../utils/date'
import type { PickedFile } from '../../../utils/pickedFile'
import type { UploadDraft, UploadKind } from '../medicalRecordsTypes'
import { describeFile, fileBadge } from '../medicalRecordsView'
import { UPLOAD_KINDS, UPLOAD_KIND_PROMPT } from '../recordVisuals'

type Props = {
	visible: boolean
	/** The file the patient picked. */
	file: PickedFile | null
	onClose: () => void
	/** The back arrow: choose another file. */
	onChangeFile: () => void
	members: FamilyMemberOption[]
	/** The person whose records the screen is showing: an upload goes to them unless changed in the sheet. */
	defaultMemberKey: string
	onSave: (draft: UploadDraft) => void
	/** The upload is being sent: the button spins and the sheet cannot be closed. */
	saving: boolean
	/** Why the last save failed (the server's words), shown under the form. */
	error: string | null
	/** Add a family member from the picker: resolves to their key (they are then the chosen person), or null when it failed. */
	onSaveMember: (draft: FamilyMemberDraft) => Promise<string | null>
}

export function UploadRecordSheet({
	visible,
	file,
	onClose,
	onChangeFile,
	members,
	defaultMemberKey,
	onSave,
	saving,
	error,
	onSaveMember,
}: Props) {
	const [kind, setKind] = useState<UploadKind | null>(null)
	const [date, setDate] = useState(() => formatDateForApi(new Date()))
	const [memberKey, setMemberKey] = useState(defaultMemberKey)
	const [choosingWho, setChoosingWho] = useState(false)

	const memberIndex = Math.max(
		0,
		members.findIndex((m) => m.key === memberKey)
	)
	const member = members[memberIndex]
	const canSave = !!kind && !!file && !saving
	const hint = UPLOAD_KINDS.find((option) => option.value === kind)?.hint ?? UPLOAD_KIND_PROMPT

	// Adding a family member from the picker makes them the chosen person.
	const saveMember = async (draft: FamilyMemberDraft) => {
		const key = await onSaveMember(draft)
		if (key) setMemberKey(key)
		return !!key
	}

	const save = () => {
		if (!kind || !file || !canSave || !member) return
		onSave({ memberKey: member.key, kind, date, file })
	}

	if (!member) return null

	return (
		<>
			<AppBottomSheet
				visible={visible && !choosingWho}
				title="Record details"
				subtitle="Choose what it is and the date on it"
				onClose={onClose}
				onBack={saving ? undefined : onChangeFile}
				dismissible={!saving}
				appearance="modern"
				showHeaderDivider={false}
				footer={
					<AppButton
						variant="primary"
						size="lg"
						disabled={!canSave}
						loading={saving}
						softDisabled
						onPress={save}
					>
						Save record
					</AppButton>
				}
			>
				<View style={styles.root}>
					{file && (
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
					)}

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
							onChange={(value) => setKind(value as UploadKind)}
						/>
						<Text style={styles.hint}>{hint}</Text>
					</View>

					<AppFormField label="Date on record">
						<AppCalendar
							value={date}
							onChange={(value) => setDate(formatDateStringForApi(value) ?? value)}
							placeholder="Pick a date"
							modalTitle="Date on record"
						/>
					</AppFormField>

					<AppPatientRow
						member={member}
						toneIndex={memberIndex}
						label="SAVING TO"
						changeAccessibilityLabel="Change whose records this is saved to"
						onChange={() => setChoosingWho(true)}
					/>

					{!!error && (
						<Text style={styles.error} accessibilityRole="alert">
							{error}
						</Text>
					)}
				</View>
			</AppBottomSheet>
			<AppFamilyMemberSheet
				visible={visible && choosingWho}
				onClose={() => setChoosingWho(false)}
				members={members}
				selectedKey={member.key}
				onSelect={(m) => setMemberKey(m.key)}
				title="Whose record is this?"
				subtitle="It will only appear in their medical records"
				confirmLabel={(m) =>
					m.relation === 'Self' ? 'Save to my records' : `Save to ${familyMemberFirstName(m)}’s records`
				}
				onSave={saveMember}
			/>
		</>
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
	error: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.danger },
})

export default UploadRecordSheet
