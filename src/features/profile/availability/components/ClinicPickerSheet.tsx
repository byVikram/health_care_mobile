// Doctor only: choose which hospital / clinic's hours to edit. Each place shows a one-line summary of its
// weekly hours.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { AppBottomSheet, AppRadioCard } from '../../../../components/common'

export type ClinicOption = { id: string; name: string; summary: string }

export type ClinicPickerSheetProps = {
	visible: boolean
	onClose: () => void
	clinics: ClinicOption[]
	selectedId: string | null
	onSelect: (id: string) => void
}

export function ClinicPickerSheet({ visible, onClose, clinics, selectedId, onSelect }: ClinicPickerSheetProps) {
	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title="Choose a clinic"
			subtitle="Set hours for each place separately"
			appearance="modern"
			showHeaderDivider={false}
		>
			<View style={styles.list}>
				{clinics.map((c) => (
					<AppRadioCard
						key={c.id}
						title={c.name}
						subtitle={c.summary}
						icon="hospital-building"
						selected={c.id === selectedId}
						onPress={() => {
							onSelect(c.id)
							onClose()
						}}
					/>
				))}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	list: {
		gap: 8,
		paddingBottom: 12,
	},
})

export default ClinicPickerSheet
