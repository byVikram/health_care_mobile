// src/features/medical-records/components/UploadRecordSheet.tsx
//
// The "Upload a record" bottom sheet (design: Medical records, three steps in one sheet): choose how to add a file ->
// record details -> whose record it is (reached from "Change" on the details). The back arrow steps back; the sheet's footer
// holds the step's main button. It collects an UploadDraft and hands it to `onSave`; the screen sends it, and says through
// `saving` and `error` how that is going (the sheet stays open, with what was typed, if it fails).
//
// While the camera, gallery or file explorer is open the sheet is hidden (it slides out first, as AppPhotoSourceSheet does:
// iOS will not present a picker over a modal that is still showing) and comes back with the file picked, or as it was.

import React, { useEffect, useState } from 'react'
import { AppBottomSheet, AppButton } from '../../../components/common'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'
import { formatDateForApi, formatDateStringForApi } from '../../../utils/date'
import type { PickedFile } from '../../../utils/pickedFile'
import type { UploadDraft, UploadKind } from '../medicalRecordsTypes'
import { pickRecordFile } from '../pickRecordFile'
import type { UploadSourceId } from '../recordVisuals'
import { UploadDetailsStep } from './UploadDetailsStep'
import { UploadSourceStep } from './UploadSourceStep'
import { UploadWhoStep } from './UploadWhoStep'

type Step = 'source' | 'details' | 'who'

// Time for the sheet to slide out before a system picker opens (AppBottomSheet closes in 200ms).
const SHEET_CLOSE_MS = 260

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
	source: { title: 'Upload a record', subtitle: 'Prescriptions and lab reports' },
	details: { title: 'Record details', subtitle: 'Choose what it is and the date on it' },
	who: { title: 'Whose record is this?', subtitle: 'It will only appear in their medical records' },
}

type Props = {
	visible: boolean
	onClose: () => void
	members: FamilyMemberOption[]
	/** The person whose records the screen is showing: an upload goes to them unless changed in the sheet. */
	defaultMemberKey: string
	/** How many records a person has, or null while those have not loaded. */
	recordCountFor: (memberKey: string) => number | null
	onSave: (draft: UploadDraft) => void
	/** The upload is being sent: the button spins and the sheet cannot be closed. */
	saving: boolean
	/** Why the last save failed. */
	error: string | null
	/** "Add a family member": the screen closes the sheet and opens the family page. */
	onAddMember: () => void
}

export function UploadRecordSheet({
	visible,
	onClose,
	members,
	defaultMemberKey,
	recordCountFor,
	onSave,
	saving,
	error,
	onAddMember,
}: Props) {
	const [step, setStep] = useState<Step>('source')
	const [file, setFile] = useState<PickedFile | null>(null)
	const [picking, setPicking] = useState(false)
	const [kind, setKind] = useState<UploadKind | null>(null)
	const [date, setDate] = useState(() => formatDateForApi(new Date()))
	const [memberKey, setMemberKey] = useState(defaultMemberKey)
	const [whoPick, setWhoPick] = useState(defaultMemberKey)

	// Every opening starts from the first step with nothing chosen.
	useEffect(() => {
		if (!visible) return
		setStep('source')
		setFile(null)
		setPicking(false)
		setKind(null)
		setDate(formatDateForApi(new Date()))
		setMemberKey(defaultMemberKey)
		setWhoPick(defaultMemberKey)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only a new opening resets; the default is read at that moment
	}, [visible])

	const memberIndex = Math.max(
		0,
		members.findIndex((m) => m.key === memberKey)
	)
	const member = members[memberIndex]
	const whoIndex = Math.max(
		0,
		members.findIndex((m) => m.key === whoPick)
	)
	const canSave = !!kind && !!file && !saving

	const choose = async (source: UploadSourceId) => {
		if (picking) return
		setPicking(true)
		try {
			await new Promise((resolve) => setTimeout(resolve, SHEET_CLOSE_MS))
			const picked = await pickRecordFile(source)
			if (!picked) return
			setFile(picked)
			setStep('details')
		} finally {
			setPicking(false)
		}
	}

	const save = () => {
		if (!kind || !file || !canSave || !member) return
		onSave({ memberKey: member.key, kind, date, file })
	}

	const confirmWho = () => {
		setMemberKey(whoPick)
		setStep('details')
	}

	// Back from the details goes to the source step (choosing another file); from "Whose record" it goes back to the details.
	const goBack = () => setStep(step === 'details' ? 'source' : 'details')

	const footer =
		step === 'details' ? (
			<AppButton variant="primary" size="lg" disabled={!canSave} loading={saving} softDisabled onPress={save}>
				Save record
			</AppButton>
		) : step === 'who' ? (
			<AppButton variant="primary" size="lg" onPress={confirmWho}>
				{`Save to ${members[whoIndex]?.name.split(' ')[0] ?? 'their'}’s records`}
			</AppButton>
		) : undefined

	if (!member) return null

	return (
		<AppBottomSheet
			visible={visible && !picking}
			title={STEP_COPY[step].title}
			subtitle={STEP_COPY[step].subtitle}
			onClose={onClose}
			onBack={saving || (step === 'source' && !file) ? undefined : goBack}
			dismissible={!saving}
			appearance="modern"
			showHeaderDivider={false}
			footer={footer}
		>
			{step === 'source' && <UploadSourceStep disabled={picking} onPick={choose} />}
			{step === 'details' && file && (
				<UploadDetailsStep
					file={file}
					kind={kind}
					onKind={setKind}
					date={date}
					onDate={(value) => setDate(formatDateStringForApi(value) ?? value)}
					member={member}
					memberIndex={memberIndex}
					onChangeMember={() => {
						setWhoPick(memberKey)
						setStep('who')
					}}
					error={error}
				/>
			)}
			{step === 'who' && (
				<UploadWhoStep
					members={members}
					selectedKey={whoPick}
					onSelect={(m) => setWhoPick(m.key)}
					recordCountFor={recordCountFor}
					onAddMember={() => {
						onClose()
						onAddMember()
					}}
				/>
			)}
		</AppBottomSheet>
	)
}
