// "Family members": everyone the patient books care for (not the patient themselves). Incomplete members
// (added from a booking sheet with just a name and relation) are flagged; tapping a member opens their
// profile, "Add family member" opens an empty one.

import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAvatarRefresh } from '../../../hooks/useAvatarRefresh'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppAvatar, AppTag } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { buildS3Url } from '../../../utils/s3Utils'
import { getFamilyMembers, type FamilyMember } from './PatientProfileService'
import { ProfileHubBanner } from '../shared/components/ProfileHubBanner'
import { ProfileScreen } from '../shared/components/ProfileScreen'
import { relationLabel } from '../config/profileOptions'

type Nav = NativeStackNavigationProp<AppStackParamList>

const memberId = (m: FamilyMember) => m.public_id || m.publicId || m.id

const memberSubtitle = (m: FamilyMember) =>
	[relationLabel(m.relation), m.age ? `${m.age} yrs` : '', (m.chronic_conditions || []).join(', ')]
		.filter(Boolean)
		.join(' · ')

export default function FamilyMembersPage() {
	const navigation = useNavigation<Nav>()
	const [members, setMembers] = useState<FamilyMember[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setError(null)
		try {
			const list = await getFamilyMembers()
			setMembers(list.filter((m) => !m.is_self))
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not load family members')
		} finally {
			setLoading(false)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)
	// the photos are signed links that expire after an hour: while this page stays open, fetch new ones before that
	useAvatarRefresh(load)

	const open = (id?: string) =>
		navigation.navigate(ROUTES.STACK.PATIENT_FAMILY_MEMBER, id ? { memberId: id } : undefined)
	const incomplete = members.find((m) => m.is_complete === false)

	return (
		<ProfileScreen
			title="Family members"
			subtitle="Book and manage care for them"
			loading={loading}
			loadError={error}
			onRetry={load}
		>
			{incomplete && (
				<ProfileHubBanner
					tone="warning"
					title={`Complete ${incomplete.name.split(' ')[0]}'s details`}
					subtitle="Added while booking · date of birth and health info missing"
					onPress={() => open(memberId(incomplete))}
				/>
			)}

			{members.length > 0 && (
				<View style={styles.list}>
					{members.map((m, i) => (
						<TouchableOpacity
							key={memberId(m)}
							style={[styles.row, i < members.length - 1 && styles.rowDivider]}
							onPress={() => open(memberId(m))}
							accessibilityRole="button"
						>
							<AppAvatar
								uri={buildS3Url(m.avatar_s3_key)}
								name={m.name}
								size={48}
								backgroundColor={APP_COLORS.mint}
								initialsColor={APP_COLORS.primary}
							/>
							<View style={styles.rowText}>
								<Text style={styles.name} numberOfLines={1}>
									{m.name}
								</Text>
								<Text style={styles.sub} numberOfLines={1}>
									{memberSubtitle(m)}
								</Text>
							</View>
							{m.is_complete === false ? (
								<AppTag label="Add details" tone="pending" size="sm" shape="rounded" />
							) : (
								<AppTag label="Complete" tone="confirmed" size="sm" shape="rounded" />
							)}
							<MaterialCommunityIcons name="chevron-right" size={22} color={APP_COLORS.border} />
						</TouchableOpacity>
					))}
				</View>
			)}

			<TouchableOpacity style={styles.add} onPress={() => open()} accessibilityRole="button">
				<MaterialCommunityIcons name="account-plus-outline" size={20} color={APP_COLORS.primary} />
				<Text style={styles.addText}>Add family member</Text>
			</TouchableOpacity>
			<Text style={styles.note}>
				Each member gets their own Karola ID and QR. Their reports and prescriptions are kept separately from
				yours.
			</Text>
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	list: {
		backgroundColor: APP_COLORS.surface,
		paddingHorizontal: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		paddingVertical: 10,
	},
	rowDivider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	rowText: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	add: {
		marginHorizontal: 16,
		marginTop: 8,
		height: 48,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	addText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	note: {
		marginHorizontal: 16,
		fontSize: 12,
		lineHeight: 17,
		color: APP_COLORS.inkMuted,
	},
})
