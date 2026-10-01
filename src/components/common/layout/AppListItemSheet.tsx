// src/components/common/layout/AppListItemSheet.tsx
//
// Add / edit bottom sheet for AppEditableList rows ("Add medicine", "Add emergency contact",
// "Add qualification"...): an AppBottomSheet (modern) with one AppFormField per `fields` entry, optional
// extra content (`children`, e.g. a type chip group) and a full-width submit button that stays disabled
// until every required field has a value. Values are strings keyed by field key; the caller maps them.

import React, { useEffect, useState } from 'react'
import { StyleSheet, View, type KeyboardTypeOptions } from 'react-native'
import { AppBottomSheet } from './AppBottomSheet'
import { AppButton } from '../buttons/AppButton'
import { AppFormField } from '../inputs/AppFormField'

export type AppListItemField = {
	key: string
	label: string
	required?: boolean
	placeholder?: string
	keyboardType?: KeyboardTypeOptions
	maxLength?: number
	multiline?: boolean
	/** Extra check run on submit; return an error message to block it. */
	validate?: (value: string) => string | null
}

export type AppListItemSheetProps = {
	visible: boolean
	onClose: () => void
	title: string
	subtitle?: string
	fields: AppListItemField[]
	/** Values to start from (edit); empty strings when adding. */
	initialValues?: Record<string, string>
	submitLabel?: string
	onSubmit: (values: Record<string, string>) => void | Promise<void>
	/** Rendered under the fields (e.g. a chip group bound to the caller's own state). */
	children?: React.ReactNode
	/** Extra condition for the submit button (e.g. a chip group must have a value). */
	canSubmit?: boolean
}

const emptyValues = (fields: AppListItemField[], initial?: Record<string, string>) =>
	Object.fromEntries(fields.map((f) => [f.key, initial?.[f.key] ?? '']))

export function AppListItemSheet({
	visible,
	onClose,
	title,
	subtitle,
	fields,
	initialValues,
	submitLabel = 'Save',
	onSubmit,
	children,
	canSubmit = true,
}: AppListItemSheetProps) {
	const [values, setValues] = useState<Record<string, string>>(() => emptyValues(fields, initialValues))
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [submitting, setSubmitting] = useState(false)

	// Reset whenever the sheet opens (add vs edit of another row) -- only on open, so the form doesn't
	// reset under the user when the caller re-renders with a new initialValues object.
	useEffect(() => {
		if (visible) {
			setValues(emptyValues(fields, initialValues))
			setErrors({})
		}
	}, [visible])

	const missingRequired = fields.some((f) => f.required && !values[f.key]?.trim())

	const handleSubmit = async () => {
		const nextErrors: Record<string, string> = {}
		for (const f of fields) {
			const error = f.validate?.(values[f.key]?.trim() ?? '')
			if (error) nextErrors[f.key] = error
		}
		setErrors(nextErrors)
		if (Object.keys(nextErrors).length) return

		setSubmitting(true)
		try {
			await onSubmit(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={title}
			subtitle={subtitle}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
			footer={
				<AppButton
					variant="primary"
					size="lg"
					softDisabled
					onPress={handleSubmit}
					disabled={missingRequired || !canSubmit || submitting}
					loading={submitting}
				>
					{submitLabel}
				</AppButton>
			}
		>
			<View style={styles.body}>
				{fields.map((f) => (
					<AppFormField
						key={f.key}
						label={f.label}
						required={f.required}
						value={values[f.key]}
						onChangeText={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
						placeholder={f.placeholder}
						keyboardType={f.keyboardType}
						maxLength={f.maxLength}
						multiline={f.multiline}
						errorText={errors[f.key]}
					/>
				))}
				{children}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 14,
		paddingBottom: 8,
	},
})

export default AppListItemSheet
