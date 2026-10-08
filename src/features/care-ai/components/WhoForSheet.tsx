// src/features/care-ai/components/WhoForSheet.tsx
//
// "Who is this for?" bottom sheet: the caller and their family members as a radio list. Tapping one selects
// them and closes the sheet.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppFamilyMemberAvatar, AppRadio } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'
import { CARE_AI } from '../careAiTheme'

type Props = {
	visible: boolean
	members: FamilyMemberOption[]
	selectedKey: string
	onSelect: (member: FamilyMemberOption) => void
	onClose: () => void
}

export function WhoForSheet({ visible, members, selectedKey, onSelect, onClose }: Props) {
	return (
		<AppBottomSheet
			visible={visible}
			title="Who is this for?"
			subtitle="Answers will use this person’s reports, medicines and visits."
			onClose={onClose}
			appearance="modern"
		>
			<View accessibilityRole="radiogroup" accessibilityLabel="Asking for">
				{members.map((member, index) => {
					const on = member.key === selectedKey
					return (
						<TouchableOpacity
							key={member.key}
							onPress={() => onSelect(member)}
							activeOpacity={0.8}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							style={[styles.row, index > 0 && styles.rowDivider]}
						>
							<AppFamilyMemberAvatar member={member} index={index} size={40} />
							<View style={styles.text}>
								<Text style={styles.name} numberOfLines={1}>
									{member.name}
								</Text>
								<Text style={styles.relation}>{member.relation}</Text>
							</View>
							<AppRadio checked={on} />
						</TouchableOpacity>
					)
				})}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	row: { minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowDivider: { borderTopWidth: 1, borderTopColor: CARE_AI.rowDivider },
	text: { flex: 1, minWidth: 0 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	relation: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
