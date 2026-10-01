// Personal details for patients, doctors and ancillary providers. Which cards / fields appear, their
// required flags and how the data loads and saves all come from PERSONAL_DETAILS_CONFIG[role].

import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppAvatar,
	AppCalendar,
	AppChipGroup,
	AppDocumentRow,
	AppFormCard,
	AppFormField,
	AppSaveFooter,
	AppSelect,
	AppTag,
	FORM_SELECT_PROPS,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { useAuth } from '../../../context/AuthContext'
import { buildS3Url } from '../../../utils/s3Utils'
import { showComingSoon } from '../../../utils/toast'
import { hubRoleFor } from '../config/profileHubConfig'
import {
	PERSONAL_DETAILS_CONFIG,
	PERSONAL_FIELD_META,
	personalSchemaFor,
	type PersonalDraft,
	type PersonalFieldKey,
} from '../config/personalDetailsConfig'
import { withCurrent, type Option } from '../config/profileOptions'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from './components/ProfileScreen'

const toOptions = (options: Option[] | string[] = []): Option[] =>
	options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))

export default function PersonalDetailsPage() {
	const { role } = useAuth()
	const config = PERSONAL_DETAILS_CONFIG[hubRoleFor(role) ?? 'patient']
	const schema = useMemo(() => personalSchemaFor(config.required), [config])
	const form = useProfileForm<PersonalDraft>({ load: config.load, save: config.save, schema })
	const { draft, set, errors } = form

	const renderField = (key: PersonalFieldKey, labelOverride?: string) => {
		if (!draft) return null
		const meta = PERSONAL_FIELD_META[key]
		const label = labelOverride ?? meta.label
		const required = config.required.includes(key)
		const value = draft[key]

		switch (meta.kind) {
			case 'select':
				return (
					<AppFormField key={key} label={label} required={required} errorText={errors[key]}>
						<AppSelect
							{...FORM_SELECT_PROPS}
							options={withCurrent(toOptions(meta.options), value as string)}
							value={value as string}
							onSelect={(v) => set(key, v as never)}
							placeholder={`Select ${label.toLowerCase()}`}
						/>
					</AppFormField>
				)
			case 'date':
				return (
					<AppFormField key={key} label={label} required={required} errorText={errors[key]}>
						<AppCalendar
							value={value as string}
							onChange={(v) => set(key, v as never)}
							placeholder="DD-MM-YYYY"
							maximumDate={new Date()}
							modalTitle={label}
						/>
					</AppFormField>
				)
			case 'chips':
				return (
					<AppFormField key={key} label={label} required={required} errorText={errors[key]}>
						<AppChipGroup
							options={toOptions(meta.options)}
							values={value as string[]}
							onChange={(v) => set(key, v as never)}
							accessibilityLabel={label}
						/>
					</AppFormField>
				)
			case 'readonly':
				return <AppFormField key={key} label={label} value={(value as string) || '—'} editable={false} />
			case 'document':
				return (
					<AppDocumentRow
						key={key}
						label={label}
						fileName={value as string}
						status={value ? 'in_review' : 'missing'}
						onUpload={() => showComingSoon('Document upload will be available soon')}
					/>
				)
			default:
				return (
					<AppFormField
						key={key}
						label={label}
						required={required}
						value={value as string}
						onChangeText={(v) => set(key, v as never)}
						placeholder={meta.placeholder}
						keyboardType={meta.keyboardType}
						maxLength={meta.maxLength}
						autoCapitalize={meta.keyboardType === 'email-address' ? 'none' : undefined}
						errorText={errors[key]}
					/>
				)
		}
	}

	return (
		<ProfileScreen
			title="Personal details"
			subtitle={config.subtitle}
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
				/>
			}
		>
			{draft && (
				<>
					<View style={styles.photoCard}>
						<View style={styles.photoWrap}>
							<AppAvatar
								uri={buildS3Url(draft.avatar)}
								name={draft.name}
								size={72}
								backgroundColor={APP_COLORS.mint}
								initialsColor={APP_COLORS.primary}
							/>
							<TouchableOpacity
								style={styles.photoButton}
								onPress={() => showComingSoon('Photo upload will be available soon')}
								accessibilityRole="button"
								accessibilityLabel="Change photo"
							>
								<MaterialCommunityIcons name="camera-outline" size={16} color="#FFFFFF" />
							</TouchableOpacity>
						</View>
						<View style={styles.photoText}>
							<Text style={styles.photoName} numberOfLines={1}>
								{draft.name || 'Your name'}
							</Text>
							<Text style={styles.photoSub}>{config.photoSubtitle}</Text>
						</View>
					</View>

					{config.cards.map((card) => (
						<AppFormCard
							key={card.key}
							title={card.title}
							helper={card.helper}
							right={
								card.verifiedTag ? (
									<AppTag label="Verified" tone="confirmed" icon="check" size="sm" shape="rounded" />
								) : undefined
							}
						>
							{card.fields.map((key) => renderField(key, card.labels?.[key]))}
						</AppFormCard>
					))}
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
	photoWrap: {
		width: 72,
		height: 72,
	},
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
	photoText: {
		flex: 1,
		minWidth: 0,
	},
	photoName: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	photoSub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})
