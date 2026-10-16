// The "Government ID" field of the Documents card, shared by the doctor and the ancillary provider profile.
//
// One row per ID the provider has (already saved, or just picked and waiting for Save), each with its review status
// (Approved / In review / Rejected / Re-upload needed) and a Replace / Re-upload action. Below them a dropdown offers
// the ID types not used yet; choosing one shows an Upload button that opens the file picker. At least one ID is
// required (the screen checks that); more are optional, and each type holds one file.

import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
	AppButton,
	AppDocumentRow,
	AppFormField,
	AppSelect,
	FORM_SELECT_PROPS,
	documentRowStatus,
} from '../../../../components/common'
import { pickCertificateFile, type PickedFile } from '../../../../utils/pickedFile'
import type { IdentityDocument, IdentityDocumentType } from '../identityDocuments'

type Props = {
	/** IDs already stored (signed links + review status). */
	stored: IdentityDocument[]
	/** The ID types to choose from. */
	types: IdentityDocumentType[]
	/** Files picked on this device and not saved yet, by ID type code. */
	files: Record<string, PickedFile>
	onChangeFiles: (files: Record<string, PickedFile>) => void
	errorText?: string
}

export function IdentityDocumentsField({ stored, types, files, onChangeFiles, errorText }: Props) {
	// The type chosen in the dropdown, waiting for its file.
	const [newType, setNewType] = useState('')

	// Pick now, uploaded with the rest when "Save" is pressed. Picking the same type again replaces the earlier pick
	// (or, once saved, the stored file).
	const pick = useCallback(
		async (code: string) => {
			const file = await pickCertificateFile()
			if (file) {
				onChangeFiles({ ...files, [code]: file })
				setNewType('')
			}
		},
		[files, onChangeFiles]
	)

	// One row per ID type the provider has (saved or just picked); the dropdown offers the types still unused.
	const rows = [
		...stored.map((d) => ({ code: d.type, label: d.label, url: d.url ?? '', status: d.status ?? null })),
		...Object.keys(files)
			.filter((code) => !stored.some((d) => d.type === code))
			.map((code) => ({
				code,
				label: types.find((t) => t.code === code)?.label ?? code,
				url: '',
				status: null as string | null,
			})),
	]
	const options = types.filter((t) => !rows.some((r) => r.code === t.code)).map((t) => ({ value: t.code, label: t.label }))

	return (
		<AppFormField
			label="Government ID"
			required
			helper="Add at least one. You can add more if you like."
			errorText={errorText}
		>
			<View style={styles.list}>
				{rows.map((row) => (
					<AppDocumentRow
						key={row.code}
						label={row.label}
						fileName={files[row.code]?.name ?? row.url}
						status={documentRowStatus(files[row.code] ? null : row.status, !!(files[row.code] || row.url))}
						onUpload={() => void pick(row.code)}
					/>
				))}
				{options.length > 0 && (
					<View style={styles.add}>
						<AppSelect
							{...FORM_SELECT_PROPS}
							options={options}
							value={newType}
							onSelect={setNewType}
							placeholder={rows.length === 0 ? 'Select ID type' : 'Add another ID (optional)'}
						/>
						{/* The upload option appears only once a type is chosen, below the dropdown. */}
						{!!newType && (
							<AppButton variant="primary" size="sm" icon="upload" onPress={() => void pick(newType)}>
								{`Upload ${options.find((o) => o.value === newType)?.label ?? 'ID'}`}
							</AppButton>
						)}
					</View>
				)}
			</View>
		</AppFormField>
	)
}

const styles = StyleSheet.create({
	list: { gap: 10 },
	// the dropdown, with the Upload button under it once a type is chosen
	add: { gap: 10 },
})
