// Doctor "Achievements": awards, publications, conferences... Each add / edit / remove saves straight away
// (remove is a soft delete on the backend). Public achievements show on the doctor's profile.

import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import {
	AppChipGroup,
	AppConfirmSheet,
	AppEditableList,
	AppFormCard,
	AppFormField,
	AppListItemSheet,
	AppToggle,
	StatusModal,
	type AppListItemField,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import {
	ACHIEVEMENT_TYPES,
	createDoctorAchievement,
	deleteDoctorAchievement,
	fetchDoctorAchievements,
	updateDoctorAchievement,
	type AchievementType,
	type DoctorAchievement,
} from './doctorProfileService'
import { ProfileScreen } from '../shared/components/ProfileScreen'

const FIELDS: AppListItemField[] = [
	{ key: 'title', label: 'Title', required: true, placeholder: 'e.g. Best Cardiologist Award', maxLength: 200 },
	{ key: 'organization', label: 'Given by', placeholder: 'Organisation or journal', maxLength: 200 },
	{
		key: 'year',
		label: 'Year',
		placeholder: 'YYYY',
		keyboardType: 'number-pad',
		maxLength: 4,
		validate: (v) =>
			!v || (/^\d{4}$/.test(v) && Number(v) <= new Date().getFullYear()) ? null : 'Enter a valid year',
	},
	{
		key: 'description',
		label: 'Details',
		placeholder: 'A line about it (optional)',
		maxLength: 500,
		multiline: true,
	},
]

export default function AchievementsPage() {
	const [items, setItems] = useState<DoctorAchievement[]>([])
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [editing, setEditing] = useState<DoctorAchievement | 'new' | null>(null)
	const [type, setType] = useState<AchievementType>('Award')
	const [isPublic, setIsPublic] = useState(true)
	const [removing, setRemoving] = useState<DoctorAchievement | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoadError(null)
		try {
			setItems(await fetchDoctorAchievements())
		} catch (e) {
			setLoadError(e instanceof Error ? e.message : 'Could not load achievements')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	const open = (item: DoctorAchievement | 'new') => {
		setType(item === 'new' ? 'Award' : item.achievement_type)
		setIsPublic(item === 'new' ? true : item.is_public)
		setEditing(item)
	}

	const current = editing && editing !== 'new' ? editing : null

	const submit = async (v: Record<string, string>) => {
		const input = {
			title: v.title,
			achievement_type: type,
			organization: v.organization || null,
			achievement_date: v.year ? `${v.year}-01-01` : null,
			description: v.description || null,
			is_public: isPublic,
		}
		try {
			if (current) await updateDoctorAchievement(current.id, input)
			else await createDoctorAchievement(input)
			setEditing(null)
			Toast.show({ type: 'success', text1: current ? 'Achievement updated' : 'Achievement added' })
			await load()
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	const remove = async () => {
		if (!removing) return
		try {
			await deleteDoctorAchievement(removing.id)
			setRemoving(null)
			Toast.show({ type: 'success', text1: 'Achievement removed' })
			await load()
		} catch (e) {
			setRemoving(null)
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	return (
		<ProfileScreen
			title="Achievements"
			subtitle="Awards, publications and conferences"
			loading={loading}
			loadError={loadError}
			onRetry={load}
			overlays={
				<>
					<AppListItemSheet
						visible={editing !== null}
						onClose={() => setEditing(null)}
						title={current ? 'Edit achievement' : 'Add achievement'}
						fields={FIELDS}
						initialValues={
							current
								? {
										title: current.title,
										organization: current.organization || '',
										year: current.achievement_date?.slice(0, 4) || '',
										description: current.description || '',
									}
								: undefined
						}
						submitLabel={current ? 'Save achievement' : 'Add achievement'}
						onSubmit={submit}
					>
						<AppFormField label="Type" required>
							<AppChipGroup
								options={ACHIEVEMENT_TYPES}
								values={[type]}
								onChange={(v) => v[0] && setType(v[0] as AchievementType)}
								single
								accessibilityLabel="Achievement type"
							/>
						</AppFormField>
						<View style={styles.publicRow}>
							<View style={styles.flex}>
								<Text style={styles.publicTitle}>Show on my public profile</Text>
								<Text style={styles.publicSub}>Patients see it on your profile</Text>
							</View>
							<AppToggle
								value={isPublic}
								onValueChange={setIsPublic}
								accessibilityLabel="Show on my public profile"
							/>
						</View>
					</AppListItemSheet>
					<AppConfirmSheet
						visible={!!removing}
						onClose={() => setRemoving(null)}
						title={`Remove "${removing?.title ?? ''}"?`}
						message="It will no longer show on your profile."
						confirmLabel="Remove"
						onConfirm={remove}
					/>
					<StatusModal
						visible={!!actionError}
						status="error"
						title="Something went wrong"
						description={actionError || ''}
						submitText="OK"
						onSubmit={() => setActionError(null)}
					/>
				</>
			}
		>
			<AppFormCard title="Your achievements" helper="Public achievements appear on your profile for patients.">
				<AppEditableList
					items={items.map((a) => ({
						key: a.id,
						title: a.title,
						subtitle: [a.achievement_type, a.organization, a.achievement_date?.slice(0, 4)]
							.filter(Boolean)
							.join(' · '),
						tag: a.is_public ? null : { label: 'Hidden', tone: 'neutral' },
					}))}
					icon="trophy-outline"
					tone="sand"
					onEdit={(i) => open(items[i])}
					onRemove={(i) => setRemoving(items[i])}
					addLabel="Add achievement"
					onAdd={() => open('new')}
					emptyText="Add awards, publications or conferences to stand out."
				/>
			</AppFormCard>
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	publicRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	publicTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	publicSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})
