// src/features/care-ai/components/AskingForBar.tsx
//
// "Asking for Vikram (you)  Change ⌄" strip under the header: whose reports, medicines and visits the answers use.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppFamilyMemberAvatar, AppPathIcon, familyMemberFirstName } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'

/** "Vikram (you)" for the caller, "Raghav (father)" for a family member. */
export const askingForLabel = (member: FamilyMemberOption) => {
	const first = familyMemberFirstName(member)
	return member.key === 'self' ? `${first} (you)` : `${first} (${member.relation.toLowerCase()})`
}

type Props = {
	member: FamilyMemberOption
	/** Position in the family list (picks the avatar tone). */
	index: number
	onPress: () => void
}

export function AskingForBar({ member, index, onPress }: Props) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={`Asking for ${askingForLabel(member)}. Change`}
			style={styles.bar}
		>
			<AppFamilyMemberAvatar member={member} index={index} size={26} />
			<Text style={styles.text} numberOfLines={1}>
				Asking for <Text style={styles.name}>{askingForLabel(member)}</Text>
			</Text>
			<View style={styles.change}>
				<Text style={styles.changeText}>Change</Text>
				<AppPathIcon d={CARE_AI_ICONS.chevronDown} size={16} strokeWidth={2.4} color={APP_COLORS.primary} />
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	bar: {
		height: 44,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: CARE_AI.askingBar,
		borderBottomWidth: 1,
		borderBottomColor: CARE_AI.hairline,
	},
	text: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	name: { fontWeight: '700', color: APP_COLORS.ink },
	change: { flexDirection: 'row', alignItems: 'center', gap: 2 },
	changeText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
})
