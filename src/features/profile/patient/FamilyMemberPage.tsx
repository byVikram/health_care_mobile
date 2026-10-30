// A family member's profile: add a new member (no memberId), edit one, or complete one that was added
// from a booking sheet with just a name and relation. Basic details + health; "Remove from family" is a
// soft delete on the backend (their past bookings and reports are kept).

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { z } from 'zod'
import Toast from 'react-native-toast-message'
import {
	AppAvatar,
	AppCalendar,
	AppConfirmSheet,
	AppDocumentRow,
	AppFormCard,
	AppFormField,
	AppInfoBanner,
	AppPhotoSourceSheet,
	AppSaveFooter,
	AppSelect,
	FORM_SELECT_PROPS,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'
import { formatApiDateForDisplay, formatDateStringForApi } from '../../../utils/date'
import { showComingSoon } from '../../../utils/toast'
import { buildS3Url } from '../../../utils/s3Utils'
import { uploadAvatar, type AvatarUpload } from '../../../services/avatarService'
import { useAvatarChange } from '../hooks/useAvatarChange'
import {
	createFamilyMember,
	fetchPatientDetails,
	getFamilyMember,
	removeFamilyMember,
	updateFamilyMember,
} from './PatientProfileService'
import {
	EMPTY_HEALTH,
	HealthFields,
	detailsToHealth,
	healthToPatch,
	type HealthValues,
} from './components/HealthFields'
import {
	FAMILY_RELATION_OPTIONS,
	GENDER_OPTIONS,
	isValidIndianMobile,
	relationLabel,
	withCurrent,
} from '../config/profileOptions'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

interface MemberDraft {
	id: string | null
	name: string
	relation: string
	gender: string
	/** DD-MM-YYYY */
	dob: string
	mobile: string
	complete: boolean
	/** Display URL of the member's current photo ('' = none). The photo itself is saved by its own upload. */
	avatar: string
	/** Karola ID of the member ('' until they are saved). */
	code: string
	health: HealthValues
}

const schema = z
	.object({
		name: z.string().trim().min(2, 'Enter their full name'),
		relation: z.string().min(1, 'Choose how they are related to you'),
		gender: z.string().min(1, 'Choose a gender'),
		dob: z.string().min(1, 'Enter their date of birth'),
		mobile: z.string(),
	})
	.passthrough()
	.refine((v) => !v.mobile.trim() || isValidIndianMobile(v.mobile), {
		path: ['mobile'],
		message: 'Enter a valid 10-digit mobile number',
	})

const EMPTY: MemberDraft = {
	id: null,
	name: '',
	relation: '',
	gender: '',
	dob: '',
	mobile: '',
	complete: false,
	avatar: '',
	code: '',
	health: EMPTY_HEALTH,
}

export default function FamilyMemberPage() {
	const navigation = useNavigation()
	const { params } = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_FAMILY_MEMBER>>()
	const memberId = params?.memberId
	const [confirmRemove, setConfirmRemove] = useState(false)
	const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(false)
	// A photo is uploaded as soon as it is picked for an existing member (it has its own endpoint, so it stays out of
	// the form and does not make it "dirty"); for a member being added it is held here and uploaded after the save.
	const [photoOverride, setPhotoOverride] = useState<string | null>(null)
	const pendingPhoto = useRef<AvatarUpload | null>(null)

	const load = useCallback(async (): Promise<MemberDraft> => {
		if (!memberId) return EMPTY
		const [member, details] = await Promise.all([getFamilyMember(memberId), fetchPatientDetails(memberId)])
		return {
			id: memberId,
			name: member.name,
			relation: (member.relation || '').toUpperCase(),
			gender: member.gender || details.personal.gender || '',
			dob: formatApiDateForDisplay(member.date_of_birth || details.personal.date_of_birth || undefined),
			mobile: member.contact_number || '',
			complete: !!member.is_complete,
			avatar: buildS3Url(member.avatar_s3_key) || '',
			code: member.patient_code || '',
			health: detailsToHealth(details),
		}
	}, [memberId])

	const save = useCallback(
		async (draft: MemberDraft): Promise<MemberDraft> => {
			const basics = {
				name: draft.name.trim(),
				gender: draft.gender,
				date_of_birth: formatDateStringForApi(draft.dob),
			}
			let id = draft.id
			if (!id) {
				const created = await createFamilyMember({
					...basics,
					relation: draft.relation,
					contact_number: draft.mobile.trim() || null,
				})
				id = created.public_id || created.id
				// a photo picked while adding is uploaded now that the member exists
				if (pendingPhoto.current) {
					try {
						await uploadAvatar(pendingPhoto.current, id)
					} catch (error: any) {
						Toast.show({
							type: 'error',
							text1: 'Photo not saved',
							text2: error?.response?.data?.message || error?.message || 'You can add it from their profile.',
						})
					}
					pendingPhoto.current = null
				}
			}
			const details = await updateFamilyMember(id, {
				...basics,
				relation: draft.relation,
				contact_number: draft.mobile.trim() || null,
				...healthToPatch(draft.health, false),
			})
			if (!draft.id) {
				// New member saved: go back to the list, which reloads on focus.
				navigation.goBack()
			}
			return { ...draft, id, complete: true, health: detailsToHealth(details) }
		},
		[navigation]
	)

	const form = useProfileForm<MemberDraft>({
		load,
		save,
		schema,
		successMessage: memberId ? 'Saved' : 'Family member added',
	})
	const { draft, set, errors } = form
	const photoUrl = photoOverride !== null ? photoOverride : draft?.avatar || ''
	const avatar = useAvatarChange({
		hasPhoto: !!photoUrl,
		patientId: memberId,
		onChanged: setPhotoOverride,
		sheet: true,
		onPicked: memberId
			? undefined
			: (upload) => {
					pendingPhoto.current = upload
				},
	})
	const firstName = useMemo(() => (draft?.name || '').split(' ')[0] || 'them', [draft?.name])

	const title = memberId ? draft?.name || 'Family member' : 'Add family member'
	const subtitle = memberId
		? `${relationLabel(draft?.relation)} · ${draft?.complete ? 'profile complete' : 'details incomplete'}`
		: 'Each member gets their own Karola ID'

	const handleRemove = async () => {
		if (!memberId) return
		await removeFamilyMember(memberId)
		setConfirmRemove(false)
		Toast.show({ type: 'success', text1: `${firstName} removed from family` })
		navigation.goBack()
	}

	return (
		<ProfileScreen
			title={title}
			subtitle={subtitle}
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				<AppSaveFooter
					onSave={form.submit}
					dirty={form.dirty}
					saving={form.saving}
					invalid={Object.keys(errors).length > 0}
					label={memberId ? 'Save changes' : 'Add family member'}
				/>
			}
			overlays={
				<>
					<AppPhotoSourceSheet
						visible={avatar.sheetVisible}
						onClose={avatar.closeSheet}
						onTakePhoto={() => void avatar.pick('camera')}
						onChoosePhoto={() => void avatar.pick('library')}
						onRemove={avatar.canRemove ? () => setConfirmDeletePhoto(true) : undefined}
						subtitle="Shown on their profile and bookings"
					/>
					<AppConfirmSheet
						visible={confirmRemove}
						onClose={() => setConfirmRemove(false)}
						title={`Remove ${firstName} from family?`}
						message="They won't appear in booking lists any more. Their past bookings, reports and prescriptions are kept."
						confirmLabel="Remove"
						onConfirm={handleRemove}
					/>
					<AppConfirmSheet
						visible={confirmDeletePhoto}
						onClose={() => setConfirmDeletePhoto(false)}
						title="Delete profile photo?"
						message={`${firstName}'s photo will be removed. You can add another one any time.`}
						confirmLabel="Delete"
						onConfirm={() => {
							setConfirmDeletePhoto(false)
							avatar.remove()
						}}
					/>
				</>
			}
		>
			{draft && (
				<>
					<View style={styles.photoCard}>
						<View style={styles.photoWrap}>
							<AppAvatar
								uri={photoUrl || null}
								name={draft.name}
								size={72}
								backgroundColor={APP_COLORS.mint}
								initialsColor={APP_COLORS.primary}
							/>
							<TouchableOpacity
								style={styles.photoButton}
								onPress={avatar.open}
								disabled={avatar.busy}
								accessibilityRole="button"
								accessibilityLabel="Change photo"
							>
								{avatar.busy ? (
									<ActivityIndicator size="small" color="#FFFFFF" />
								) : (
									<MaterialCommunityIcons name="camera-outline" size={16} color="#FFFFFF" />
								)}
							</TouchableOpacity>
						</View>
						<View style={styles.photoText}>
							<Text style={styles.photoName} numberOfLines={1}>
								{draft.name || 'Their name'}
							</Text>
							<Text style={styles.photoSub} numberOfLines={1}>
								{memberId
									? `${relationLabel(draft.relation)}${draft.code ? ` · Karola ID ${draft.code}` : ''}`
									: 'Profile photo (optional)'}
							</Text>
						</View>
					</View>

					{memberId && !draft.complete && (
						<AppInfoBanner
							tone="warning"
							icon={null}
							title={`Add ${firstName}'s date of birth and health details`}
							subtitle="So doctors and labs have the full picture."
							style={styles.banner}
						/>
					)}
					<AppFormCard title="Basic details">
						<AppFormField
							label="Full name"
							required
							value={draft.name}
							onChangeText={(v) => set('name', v)}
							placeholder="As on their ID"
							maxLength={100}
							errorText={errors.name}
						/>
						<AppFormField label="Relationship to you" required errorText={errors.relation}>
							<AppSelect
								{...FORM_SELECT_PROPS}
								options={withCurrent(FAMILY_RELATION_OPTIONS, draft.relation)}
								value={draft.relation}
								onSelect={(v) => set('relation', v)}
								placeholder="Select relationship"
								presentation="sheet"
								sheetTitle="Relationship to you"
							/>
						</AppFormField>
						<AppFormField label="Gender" required errorText={errors.gender}>
							<AppSelect
								{...FORM_SELECT_PROPS}
								options={withCurrent(GENDER_OPTIONS, draft.gender)}
								value={draft.gender}
								onSelect={(v) => set('gender', v)}
								placeholder="Select gender"
								presentation="sheet"
								sheetTitle="Gender"
							/>
						</AppFormField>
						<AppFormField label="Date of birth" required errorText={errors.dob}>
							<AppCalendar
								value={draft.dob}
								onChange={(v) => set('dob', v)}
								placeholder="DD-MM-YYYY"
								maximumDate={new Date()}
								modalTitle="Date of birth"
							/>
						</AppFormField>
						<AppFormField
							label="Their mobile number"
							optional
							value={draft.mobile}
							onChangeText={(v) => set('mobile', v)}
							placeholder="For visit reminders to them"
							keyboardType="phone-pad"
							maxLength={15}
							errorText={errors.mobile}
						/>
					</AppFormCard>

					<HealthFields
						value={draft.health}
						onChange={(patch) => set('health', { ...draft.health, ...patch })}
						healthHelper="Shown to doctors and nurses only for this person's bookings."
					/>

					<AppFormCard
						title="ID document"
						helper="Some labs and hospitals ask for ID. Our team checks each upload."
					>
						<AppDocumentRow
							label="Government photo ID"
							description="Aadhaar, passport or birth certificate for children"
							status="missing"
							optional
							onUpload={() => showComingSoon('Document upload will be available soon')}
						/>
					</AppFormCard>

					{memberId && (
						<AppFormCard
							title="Access"
							helper={`You manage this profile. Bookings, reports and prescriptions for ${firstName} appear under your account.`}
						>
							<TouchableOpacity
								style={styles.remove}
								onPress={() => setConfirmRemove(true)}
								accessibilityRole="button"
							>
								<Text style={styles.removeText}>Remove {firstName} from family</Text>
							</TouchableOpacity>
						</AppFormCard>
					)}
				</>
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	photoCard: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
	},
	photoWrap: { width: 72, height: 72 },
	photoButton: {
		position: 'absolute',
		right: -4,
		bottom: -4,
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#FFFFFF',
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	photoText: { flex: 1, minWidth: 0 },
	photoName: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	photoSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	banner: {
		marginHorizontal: 16,
		marginTop: 12,
	},
	remove: {
		height: 48,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	removeText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
})
