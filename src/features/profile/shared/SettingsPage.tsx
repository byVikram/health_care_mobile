// Settings for patients, doctors and ancillary providers (content from SETTINGS_CONFIG). Notification
// toggles and the app language are screen-only for now: they change on screen but aren't saved and the
// language doesn't switch. Delete account is real: a soft delete on the backend, then local logout.

import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import {
	AppConfirmSheet,
	AppFormField,
	AppInfoBanner,
	AppNavRow,
	AppSelect,
	AppToggle,
	FORM_SELECT_PROPS,
	StatusModal,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { useAuth } from '../../../context/AuthContext'
import { showComingSoon } from '../../../utils/toast'
import { deleteMyAccount } from '../../auth/authService'
import { ROUTES } from '../../../navigation/routes'
import { hubRoleFor } from '../config/profileHubConfig'
import { LANGUAGE_CHOICES, SETTINGS_CONFIG } from '../config/settingsConfig'
import { ProfileScreen } from './components/ProfileScreen'

export default function SettingsPage() {
	const navigation = useNavigation()
	const { role, clearAuth } = useAuth()
	const config = SETTINGS_CONFIG[hubRoleFor(role) ?? 'patient']
	const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(config.toggles.map((t) => [t.key, t.defaultOn]))
	)
	const [language, setLanguage] = useState(LANGUAGE_CHOICES[0])
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	const handleDelete = async () => {
		try {
			await deleteMyAccount()
			setConfirmDelete(false)
			Toast.show({ type: 'success', text1: 'Your account has been deleted' })
			await clearAuth()
		} catch (e) {
			setConfirmDelete(false)
			setDeleteError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	return (
		<ProfileScreen
			title="Settings"
			subtitle="Notifications, language, privacy"
			overlays={
				<>
					<AppConfirmSheet
						visible={confirmDelete}
						onClose={() => setConfirmDelete(false)}
						title="Delete your account?"
						message={config.deleteMessage}
						confirmLabel="Delete"
						cancelLabel="Keep account"
						onConfirm={handleDelete}
					/>
					<StatusModal
						visible={!!deleteError}
						status="error"
						title="Couldn't delete your account"
						description={deleteError || ''}
						submitText="OK"
						onSubmit={() => setDeleteError(null)}
					/>
				</>
			}
		>
			<AppInfoBanner
				tone="info"
				icon={null}
				title="Notification and language settings are coming soon"
				subtitle="You can look around; changes here aren't saved yet."
				style={styles.banner}
			/>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
				{config.toggles.map((t, i) => (
					<View key={t.key} style={[styles.toggleRow, i < config.toggles.length - 1 && styles.divider]}>
						<View style={styles.flex}>
							<Text style={styles.rowTitle}>{t.title}</Text>
							<Text style={styles.rowSub}>{t.subtitle}</Text>
						</View>
						<AppToggle
							value={toggles[t.key]}
							onValueChange={(v) => setToggles((cur) => ({ ...cur, [t.key]: v }))}
							accessibilityLabel={t.title}
						/>
					</View>
				))}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>PREFERENCES</Text>
				<AppFormField label="App language" style={styles.language}>
					<AppSelect
						{...FORM_SELECT_PROPS}
						options={LANGUAGE_CHOICES.map((l) => ({ value: l, label: l }))}
						value={language}
						onSelect={setLanguage}
					/>
				</AppFormField>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>PRIVACY & HELP</Text>
				<AppNavRow
					title="Privacy & data sharing"
					subtitle={config.privacySubtitle}
					leading="shield-account-outline"
					minHeight={60}
					divider
					onPress={() => showComingSoon()}
				/>
				<AppNavRow
					title="Help & support"
					subtitle="FAQs, chat with Karolahealth"
					leading="lifebuoy"
					minHeight={60}
					divider
					onPress={() => showComingSoon()}
				/>
				<AppNavRow
					title="Terms & privacy policy"
					subtitle="Read our policies"
					leading="file-document-outline"
					minHeight={60}
					onPress={() => navigation.navigate(ROUTES.STACK.LEGAL as never)}
				/>
			</View>

			<TouchableOpacity style={styles.delete} onPress={() => setConfirmDelete(true)} accessibilityRole="button">
				<MaterialCommunityIcons name="account-remove-outline" size={20} color={APP_COLORS.danger} />
				<Text style={styles.deleteText}>Delete account</Text>
			</TouchableOpacity>
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	banner: {
		marginHorizontal: 16,
		marginTop: 12,
	},
	section: {
		backgroundColor: APP_COLORS.surface,
		paddingHorizontal: 16,
		paddingTop: 6,
		paddingBottom: 8,
	},
	sectionTitle: {
		marginTop: 8,
		marginBottom: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.7,
		color: APP_COLORS.inkMuted,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 64,
		paddingVertical: 8,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	rowTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	rowSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	language: {
		paddingVertical: 8,
	},
	delete: {
		marginHorizontal: 16,
		marginTop: 8,
		height: 48,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	deleteText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
})
