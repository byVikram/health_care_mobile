// src/components/common/booking/AppFamilyMemberSheet.tsx
//
// "Who is this appointment for?" picker from the consultation design: a list of the caller and their
// family members (tone avatar + ring, name, relation, radio), an "Add family member" dashed button, and
// an add view (name, relation chips, DOB, gender, mobile). Feed it `useFamilyMembers().members`.
//
// Tapping a row calls `onSelect` straight away; the confirm button closes (and selects the highlighted
// member first if `selectedKey` didn't match anyone, since the first member is highlighted then). Without `onSave` the add form's Save stays disabled with a note (no create endpoint yet).

import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AppAvatar from '../display/AppAvatar'
import { AppTypography } from '../display/AppTypography'
import { AppButton } from '../buttons/AppButton'
import { AppChip } from '../inputs/AppChip'
import { AppRadio } from '../inputs/AppRadio'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { APP_COLORS, toneAt } from '../../../config/theme'
import type { FamilyMemberOption } from '../../../hooks/useFamilyMembers'

export const FAMILY_RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']
export const FAMILY_GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say']

/** What the add form collected; passed to `onSave`. */
export interface FamilyMemberDraft {
	name: string
	relation: string
	/** As typed, DD/MM/YYYY (not validated). */
	dateOfBirth: string
	gender: string
	mobile: string
}

/** "yourself" for the caller, otherwise the member's first name — for "Book for …" style labels. */
export const familyMemberFirstName = (m: Pick<FamilyMemberOption, 'name' | 'relation'>) =>
	m.relation === 'Self' ? 'yourself' : m.name.split(' ')[0]

export interface AppFamilyMemberAvatarProps {
	member: Pick<FamilyMemberOption, 'name' | 'avatar'>
	/** Position in the member list; picks the soft tone for the initials. */
	index: number
	size: number
	ring?: boolean
}

/** Family-member avatar: photo, or initials on the member's soft tone (design 16-17/22 700). */
export function AppFamilyMemberAvatar({ member, index, size, ring }: AppFamilyMemberAvatarProps) {
	const tone = toneAt(index)
	return (
		<AppAvatar
			uri={member.avatar}
			name={member.name}
			size={size}
			backgroundColor={tone.bg}
			initialsColor={tone.ink}
			initialsStyle={{ fontSize: size > 50 ? 17 : 16, lineHeight: 22, fontWeight: '700' }}
			ring={ring}
		/>
	)
}

export interface AppFamilyMemberSheetProps {
	visible: boolean
	onClose: () => void
	members: FamilyMemberOption[]
	/** Key of the highlighted member; falls back to the first member (self). */
	selectedKey?: string | null
	onSelect: (member: FamilyMemberOption) => void
	/** List-view title. Defaults to "Who is this appointment for?". */
	title?: string
	/** List-view subtitle. Defaults to "Pick a family member or add someone new". */
	subtitle?: string
	/** Confirm button label for the highlighted member. Defaults to "Continue for {first name}". */
	confirmLabel?: (member: FamilyMemberOption) => string
	/**
	 * Save handler for the add form. Resolve `true` to go back to the list (e.g. after the new member
	 * was created and selected). When omitted, Save is shown disabled with a note.
	 */
	onSave?: (draft: FamilyMemberDraft) => void | boolean | Promise<void | boolean>
}

const defaultConfirmLabel = (m: FamilyMemberOption) => `Continue for ${familyMemberFirstName(m)}`

export function AppFamilyMemberSheet({
	visible,
	onClose,
	members,
	selectedKey,
	onSelect,
	title = 'Who is this appointment for?',
	subtitle = 'Pick a family member or add someone new',
	confirmLabel = defaultConfirmLabel,
	onSave,
}: AppFamilyMemberSheetProps) {
	// The view only resets on open, so the title/content don't flip while the sheet animates closed.
	const [view, setView] = useState<'list' | 'add'>('list')
	const [newName, setNewName] = useState('')
	const [newRel, setNewRel] = useState(FAMILY_RELATIONS[0])
	const [newDob, setNewDob] = useState('')
	const [newGender, setNewGender] = useState(FAMILY_GENDERS[0])
	const [newMobile, setNewMobile] = useState('')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (visible) setView('list')
	}, [visible])

	const selected = members.find((m) => m.key === selectedKey) || members[0]
	const nameOk = newName.trim().length > 1
	const canSave = !!onSave && nameOk && !saving

	const openAddForm = () => {
		setNewName('')
		setNewRel(FAMILY_RELATIONS[0])
		setNewDob('')
		setNewMobile('')
		setView('add')
	}

	const handleConfirm = () => {
		// Only when the highlight is the fallback (no/unknown selectedKey): confirming it picks that member.
		if (selected && selected.key !== selectedKey) onSelect(selected)
		onClose()
	}

	const handleSave = async () => {
		if (!onSave || !nameOk) return
		setSaving(true)
		try {
			const result = await onSave({
				name: newName.trim(),
				relation: newRel,
				dateOfBirth: newDob.trim(),
				gender: newGender,
				mobile: newMobile.trim(),
			})
			if (result === true) setView('list')
		} catch {
			// The caller reports its own errors; stay on the form so nothing typed is lost.
		} finally {
			setSaving(false)
		}
	}

	const footer =
		view === 'add' ? (
			<View style={{ gap: 8 }}>
				{!onSave && (
					<AppTypography style={styles.saveNote}>
						Adding family members here isn't available yet. Add them from your profile.
					</AppTypography>
				)}
				<AppButton
					size="lg"
					disabled={!canSave}
					loading={saving}
					onPress={handleSave}
					style={!canSave && styles.btnDisabledSoft}
					labelStyle={[styles.btnLabelBold, !canSave && { color: APP_COLORS.inkMuted }]}
				>
					Save and select
				</AppButton>
			</View>
		) : (
			<View style={{ gap: 8 }}>
				<TouchableOpacity style={styles.addMemberBtn} onPress={openAddForm} accessibilityRole="button">
					<MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
					<AppTypography style={styles.addMemberText}>Add family member</AppTypography>
				</TouchableOpacity>
				<AppButton size="lg" onPress={handleConfirm} disabled={!selected} labelStyle={styles.btnLabelBold}>
					{selected ? confirmLabel(selected) : 'Continue'}
				</AppButton>
			</View>
		)

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.9}
			title={view === 'add' ? 'Add family member' : title}
			subtitle={view === 'add' ? undefined : subtitle}
			onBack={view === 'add' ? () => setView('list') : undefined}
			backAccessibilityLabel="Back to family members"
			footer={footer}
		>
			{view === 'add' ? (
				<View style={{ gap: 16 }}>
					<View style={{ gap: 6 }}>
						<AppTypography style={styles.label}>Full name</AppTypography>
						<TextInput
							value={newName}
							onChangeText={setNewName}
							placeholder="As on their ID"
							placeholderTextColor={APP_COLORS.inkMuted}
							autoComplete="name"
							style={styles.input}
						/>
					</View>
					<View style={{ gap: 8 }}>
						<AppTypography style={styles.label}>Relationship</AppTypography>
						<View style={styles.chipWrap} accessibilityRole="radiogroup">
							{FAMILY_RELATIONS.map((r) => (
								<AppChip
									key={r}
									label={r}
									selected={r === newRel}
									onPress={() => setNewRel(r)}
									variant="solid"
									shape="pill"
									accessibilityRole="radio"
								/>
							))}
						</View>
					</View>
					<View style={{ flexDirection: 'row', gap: 12 }}>
						<View style={{ flex: 1, gap: 6 }}>
							<AppTypography style={styles.label}>Date of birth</AppTypography>
							<TextInput
								value={newDob}
								onChangeText={setNewDob}
								placeholder="DD/MM/YYYY"
								placeholderTextColor={APP_COLORS.inkMuted}
								keyboardType="numbers-and-punctuation"
								style={styles.input}
							/>
						</View>
						<View style={{ flex: 1, gap: 6 }}>
							<AppTypography style={styles.label}>Gender</AppTypography>
							<TouchableOpacity
								style={[styles.input, styles.selectInput]}
								onPress={() =>
									setNewGender(
										(g) => FAMILY_GENDERS[(FAMILY_GENDERS.indexOf(g) + 1) % FAMILY_GENDERS.length]
									)
								}
								accessibilityRole="button"
								accessibilityLabel={`Gender, ${newGender}`}
							>
								<AppTypography style={styles.selectText} numberOfLines={1}>
									{newGender}
								</AppTypography>
								<MaterialCommunityIcons name="chevron-down" size={18} color={APP_COLORS.ink} />
							</TouchableOpacity>
						</View>
					</View>
					<View style={{ gap: 6 }}>
						<AppTypography style={styles.label}>
							Mobile number <AppTypography style={styles.labelOptional}>(optional)</AppTypography>
						</AppTypography>
						<TextInput
							value={newMobile}
							onChangeText={setNewMobile}
							keyboardType="phone-pad"
							placeholder="For appointment reminders"
							placeholderTextColor={APP_COLORS.inkMuted}
							style={styles.input}
						/>
					</View>
				</View>
			) : (
				<View accessibilityRole="radiogroup">
					{members.map((m, i) => {
						const on = m.key === selected?.key
						return (
							<Pressable
								key={m.key}
								onPress={() => onSelect(m)}
								accessibilityRole="radio"
								accessibilityState={{ checked: on }}
								style={styles.memberRow}
							>
								<AppFamilyMemberAvatar member={m} index={i} size={52} ring={on} />
								<View style={{ flex: 1, minWidth: 0 }}>
									<AppTypography style={styles.memberName}>{m.name}</AppTypography>
									<AppTypography style={styles.muted13}>{m.relation}</AppTypography>
								</View>
								<AppRadio checked={on} />
							</Pressable>
						)
					})}
				</View>
			)}
		</AppBottomSheet>
	)
}

export default AppFamilyMemberSheet

const styles = StyleSheet.create({
	memberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	memberName: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	muted13: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	addMemberBtn: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	addMemberText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
	label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	labelOptional: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: APP_COLORS.inkMuted },
	input: {
		height: 48,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: '#fff',
	},
	chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	selectText: { flex: 1, fontSize: 16, lineHeight: 22, color: APP_COLORS.ink },
	saveNote: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
	btnLabelBold: { fontWeight: '700' },
	// Design's soft disabled CTA (Paper's own disabled colours would be grey)
	btnDisabledSoft: { backgroundColor: APP_COLORS.disabledBtn },
})
