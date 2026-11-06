// src/components/common/inputs/AppMemberSwitcher.tsx
//
// "Records of" person switcher for a coloured screen header (design: Medical records): a row of 36px pills, each a 28px
// avatar (photo, or initials on the member's soft tone) and the first name. The selected pill is white with ink text, the
// others a translucent white on the header. Feed it `useFamilyMembers().members`. Exposed as a radiogroup.

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS, toneAt } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'
import AppAvatar from '../display/AppAvatar'

export interface AppMemberSwitcherProps {
	members: FamilyMemberOption[]
	/** `key` of the selected member. */
	selectedKey: string
	onSelect: (member: FamilyMemberOption) => void
	/** Horizontal padding inside the scroller (the header's side padding), with the same negative margin in `style`. */
	inset?: number
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppMemberSwitcher({
	members,
	selectedKey,
	onSelect,
	inset = 0,
	accessibilityLabel = 'Switch person',
	style,
}: AppMemberSwitcherProps) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			accessibilityRole="radiogroup"
			accessibilityLabel={accessibilityLabel}
			style={[styles.scroll, style]}
			contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
		>
			{members.map((member, index) => {
				const on = member.key === selectedKey
				const tone = toneAt(index)
				const firstName = member.name.split(' ')[0]
				return (
					<TouchableOpacity
						key={member.key}
						onPress={() => onSelect(member)}
						activeOpacity={0.85}
						accessibilityRole="radio"
						accessibilityState={{ checked: on }}
						accessibilityLabel={`${member.name}, ${member.relation}`}
						style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
					>
						<AppAvatar
							uri={member.avatar}
							name={member.name}
							size={28}
							backgroundColor={tone.bg}
							initialsColor={tone.ink}
							initialsStyle={styles.initials}
						/>
						<Text style={[styles.name, { color: on ? APP_COLORS.ink : '#FFFFFF' }]} numberOfLines={1}>
							{firstName}
						</Text>
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scroll: { flexGrow: 0 },
	row: { flexDirection: 'row', gap: 8 },
	pill: {
		height: 36,
		paddingLeft: 4,
		paddingRight: 12,
		borderRadius: 9999,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	pillOn: { backgroundColor: '#FFFFFF' },
	pillOff: { backgroundColor: '#FFFFFF26' },
	initials: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
	name: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
})

export default AppMemberSwitcher
