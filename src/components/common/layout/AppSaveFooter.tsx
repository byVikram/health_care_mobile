// src/components/common/layout/AppSaveFooter.tsx
//
// Sticky save bar from the profile designs: white bar with a divider top border and a full-width 52px
// primary button whose label follows the form state —
//   invalid  -> "Fix the highlighted fields" (disabled look)
//   no edits -> "No changes to save" (disabled look)
//   dirty    -> "Save changes" (or `label`)
// Wraps AppStickyFooter so the safe-area bottom inset is handled the same way everywhere.

import React from 'react'
import { StyleSheet } from 'react-native'
import AppStickyFooter from './AppStickyFooter'
import { APP_COLORS } from '../../../config/theme'

export type AppSaveFooterProps = {
	onSave: () => void
	dirty: boolean
	saving?: boolean
	/** When true the button reads `invalidLabel` and can't be pressed. */
	invalid?: boolean
	label?: string
	cleanLabel?: string
	invalidLabel?: string
}

export function AppSaveFooter({
	onSave,
	dirty,
	saving = false,
	invalid = false,
	label = 'Save changes',
	cleanLabel = 'No changes to save',
	invalidLabel = 'Fix the highlighted fields',
}: AppSaveFooterProps) {
	const text = invalid ? invalidLabel : dirty ? label : cleanLabel
	return (
		<AppStickyFooter
			onPress={onSave}
			disabled={!dirty || invalid || saving}
			loading={saving}
			footerStyle={styles.footer}
		>
			{text}
		</AppStickyFooter>
	)
}

const styles = StyleSheet.create({
	footer: {
		borderTopColor: APP_COLORS.divider,
	},
})

export default AppSaveFooter
