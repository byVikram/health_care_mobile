// src/features/medical-records/components/UploadWhoStep.tsx
//
// Step 3 of the upload sheet ("Whose record is this?"): the patient and their family members as radio cards, each with how
// many records they already have, and a dashed "Add a family member" row. The confirm button lives in the sheet's footer.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppFamilyMemberAvatar, AppPathIcon, AppRadio } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'

type Props = {
	members: FamilyMemberOption[]
	selectedKey: string
	onSelect: (member: FamilyMemberOption) => void
	/** How many records a person has: "3 records", or "No records yet". */
	recordCountFor: (memberKey: string) => number | null
	onAddMember: () => void
}

/** "3 records", "No records yet"; nothing while that person's records have not loaded. */
const countLabel = (count: number | null) =>
	count === null ? '' : count ? ` · ${count} record${count === 1 ? '' : 's'}` : ' · No records yet'

export function UploadWhoStep({ members, selectedKey, onSelect, recordCountFor, onAddMember }: Props) {
	return (
		<View style={styles.root}>
			<View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Save to">
				{members.map((member, index) => {
					const on = member.key === selectedKey
					return (
						<TouchableOpacity
							key={member.key}
							onPress={() => onSelect(member)}
							activeOpacity={0.85}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							accessibilityLabel={`${member.name}, ${member.relation}`}
							style={[styles.card, on && styles.cardOn]}
						>
							<AppFamilyMemberAvatar member={member} index={index} size={40} />
							<View style={styles.text}>
								<Text style={styles.name} numberOfLines={1}>
									{member.name}
								</Text>
								<Text style={styles.sub}>
									{member.relation}
									{countLabel(recordCountFor(member.key))}
								</Text>
							</View>
							<AppRadio checked={on} />
						</TouchableOpacity>
					)
				})}
			</View>
			<TouchableOpacity onPress={onAddMember} activeOpacity={0.85} accessibilityRole="button" style={styles.add}>
				<View style={styles.addTile}>
					<AppPathIcon d="M12 5v14M5 12h14" size={18} strokeWidth={2.4} color={APP_COLORS.primary} />
				</View>
				<Text style={styles.addText}>Add a family member</Text>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { gap: 8 },
	list: { gap: 6 },
	card: {
		minHeight: 60,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cardOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	text: { flex: 1, minWidth: 0 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	add: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 14,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: '#9FB4B6',
	},
	addTile: {
		width: 40,
		height: 40,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.primary },
})
