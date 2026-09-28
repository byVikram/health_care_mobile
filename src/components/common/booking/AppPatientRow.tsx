// src/components/common/booking/AppPatientRow.tsx
//
// "APPOINTMENT FOR / name / relation / Change" row from the consultation design. Pair it with
// AppFamilyMemberSheet: `onChange` opens the sheet.

import React from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { AppTypography } from '../display/AppTypography'
import { AppButton } from '../buttons/AppButton'
import { AppFamilyMemberAvatar } from './AppFamilyMemberSheet'
import { APP_COLORS } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'

export interface AppPatientRowProps {
	member: Pick<FamilyMemberOption, 'name' | 'relation' | 'avatar'>
	/** Eyebrow above the name. Defaults to "APPOINTMENT FOR". */
	label?: string
	/** Position of the member in the family list (avatar tone). Defaults to 0. */
	toneIndex?: number
	onChange: () => void
	/** Defaults to "Change". */
	changeLabel?: string
	/** Defaults to "Change patient". */
	changeAccessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppPatientRow({
	member,
	label = 'APPOINTMENT FOR',
	toneIndex = 0,
	onChange,
	changeLabel = 'Change',
	changeAccessibilityLabel = 'Change patient',
	style,
}: AppPatientRowProps) {
	return (
		<View style={[styles.row, style]}>
			<AppFamilyMemberAvatar member={member} index={Math.max(0, toneIndex)} size={48} />
			<View style={{ flex: 1, minWidth: 0 }}>
				<AppTypography style={styles.eyebrow}>{label}</AppTypography>
				<AppTypography style={styles.name}>{member.name}</AppTypography>
				<AppTypography style={styles.relation}>{member.relation}</AppTypography>
			</View>
			<AppButton
				size="md"
				icon="swap-horizontal"
				onPress={onChange}
				accessibilityLabel={changeAccessibilityLabel}
				style={styles.changeBtn}
			>
				{changeLabel}
			</AppButton>
		</View>
	)
}

export default AppPatientRow

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		paddingBottom: 8,
	},
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	name: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	relation: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	changeBtn: {
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 6,
		elevation: 2,
	},
})
