// src/features/doctor/dashboard/DoctorScreenHeader.tsx
//
// The dark "ink" header shared by the doctor dashboard's Home / Schedule / Engage / Verify-access
// views (source: the "Doctor Dashboard" design — avatar + name + clinic switcher + search on Home, title
// + subtitle + an optional segmented-control slot elsewhere). Deliberately kept as its own component
// rather than folded into the shared (patient/pharmacy/radiology/lab/nurse) AppHeader: that component
// already carries patient-specific scroll-collapse animation and per-role branching, and doctor
// screens don't share its ScrollContext wiring, so extending it here would risk every other role's
// header for no real benefit. This file is the doctor-only equivalent, made properly configurable
// on its own terms instead:
//   - "home"'s clinic switcher and search box are each optional — omit `showHospitalSelector` or
//     `onSearchChange` and that piece just doesn't render, so a future doctor-adjacent Home screen
//     (e.g. a nurse/ancillary variant) can reuse this without carrying concepts it doesn't need.
//   - The single notification bell is a generic `actions[]` array under the hood (icon + onPress +
//     badge), so adding a second header button later doesn't mean another bespoke prop.
//   - "simple" (Schedule/Engage/Questions/Verify-access) takes an optional `rightAccessory` in its
//     top row for the same reason, alongside its existing `children` slot for a segmented control.

import React from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppAvatar, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { HOME_CHROME_PATHS, type HomeChromeIcon } from '../../dashboard/homeChromeIcons'
import { ClinicSwitcher } from './ClinicSwitcher'

export type DoctorHeaderAction = {
	/** A HOME_CHROME_PATHS key, or a raw SVG path string for a one-off icon. */
	icon: HomeChromeIcon | string
	onPress?: () => void
	accessibilityLabel: string
	/** Small dot badge (unread indicator) — shown whenever true, independent of `count`. */
	badge?: boolean
	/** If > 0, folded into `accessibilityLabel`'s "N new" reading via the caller; purely informational here. */
	count?: number
}

export type DoctorScreenHeaderProps =
	| {
			variant: 'home'
			name: string
			avatarUri?: string | null
			onAvatarPress?: () => void
			/** Small icon badge over the avatar (defaults to a hamburger/menu glyph, matching the rest of the app's "tap avatar to open the drawer" affordance). */
			avatarBadgeIcon?: HomeChromeIcon | string
			/**
			 * Right-side header buttons. If omitted, falls back to a single bell button built from
			 * `notificationCount`/`onNotificationsPress` (kept for backward compatibility) — pass
			 * `actions` directly for anything beyond a single notifications bell.
			 */
			actions?: DoctorHeaderAction[]
			notificationCount?: number
			onNotificationsPress?: () => void
			/** Adds the clinic switcher chip under the doctor's name (opens a "Your clinics" sheet) — for a
			 * doctor who practices at more than one hospital. Wired to real clinics/AuthContext. */
			showHospitalSelector?: boolean
			/** Search box. Omit `onSearchChange` entirely to skip it. */
			searchValue?: string
			onSearchChange?: (value: string) => void
			onSearchSubmit?: () => void
			searchPlaceholder?: string
	  }
	| {
			variant: 'simple'
			title: string
			subtitle?: string
			onBack?: () => void
			/** e.g. an AppSegmentedControl for Today/Past or the Requests/Q&A switch. */
			children?: React.ReactNode
			/** A single icon button (or any node) on the right of the title row. */
			rightAccessory?: React.ReactNode
			/** Adds the clinic switcher chip under the title/subtitle (same chip + "Your clinics" sheet as Home). */
			showHospitalSelector?: boolean
			style?: StyleProp<ViewStyle>
	  }

function resolveIconPath(icon: HomeChromeIcon | string): string {
	return (HOME_CHROME_PATHS as Record<string, string>)[icon] ?? icon
}

export function DoctorScreenHeader(props: DoctorScreenHeaderProps) {
	// Same pattern as the patient-side AppHeader (src/components/common/layout/AppHeader.tsx):
	// the header's own paddingTop must clear the status bar/notch itself -- it isn't wrapped in a
	// SafeAreaView by whatever screen renders it, so without this the top row renders underneath
	// the status bar on any real device (only looked fine where the top inset happens to be 0).
	const insets = useSafeAreaInsets()

	if (props.variant === 'home') {
		const {
			name,
			avatarUri,
			onAvatarPress,
			avatarBadgeIcon = 'hamburger',
			actions,
			notificationCount = 0,
			onNotificationsPress,
			showHospitalSelector = false,
			searchValue = '',
			onSearchChange,
			onSearchSubmit,
			searchPlaceholder = 'Search patients, reports or questions',
		} = props
		const resolvedActions: DoctorHeaderAction[] =
			actions ?? [
				{
					icon: 'bell',
					onPress: onNotificationsPress,
					badge: notificationCount > 0,
					count: notificationCount,
					accessibilityLabel: notificationCount > 0 ? `Notifications, ${notificationCount} new` : 'Notifications',
				},
			]

		return (
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<Blobs />
				<View style={styles.topRow}>
					<Pressable
						onPress={onAvatarPress}
						accessibilityRole="button"
						accessibilityLabel="Open menu and profile"
						style={styles.avatarButton}
					>
						<AppAvatar uri={avatarUri} name={name} size={44} radius={10} borderWidth={0} />
						<View style={styles.avatarBadge}>
							<AppPathIcon d={resolveIconPath(avatarBadgeIcon)} size={14} strokeWidth={2.6} color={APP_COLORS.ink} />
						</View>
					</Pressable>
					<View style={styles.greetingCol}>
						<Text style={styles.name} numberOfLines={1}>
							{name}
						</Text>
						{showHospitalSelector && <ClinicSwitcher />}
					</View>
					{resolvedActions.map((action, i) => (
						<Pressable
							key={i}
							onPress={action.onPress}
							accessibilityRole="button"
							accessibilityLabel={action.accessibilityLabel}
							style={styles.actionButton}
						>
							<AppPathIcon d={resolveIconPath(action.icon)} size={22} strokeWidth={2} color="#FFFFFF" />
							{action.badge && <View style={styles.actionBadge} />}
						</Pressable>
					))}
				</View>
				{!!onSearchChange && (
					<View style={styles.searchBox}>
						<AppPathIcon d={HOME_CHROME_PATHS.search} size={20} strokeWidth={2.2} color={APP_COLORS.inkMuted} />
						<TextInput
							value={searchValue}
							onChangeText={onSearchChange}
							onSubmitEditing={onSearchSubmit}
							placeholder={searchPlaceholder}
							placeholderTextColor={APP_COLORS.inkMuted}
							style={styles.searchInput}
							returnKeyType="search"
							accessibilityLabel="Search"
						/>
					</View>
				)}
			</View>
		)
	}

	const { title, subtitle, onBack, children, rightAccessory, showHospitalSelector = false, style } = props
	return (
		<View style={[styles.header, styles.headerSimple, { paddingTop: insets.top + 16 }, style]}>
			<Blobs />
			<View style={styles.simpleTopRow}>
				{!!onBack && (
					<Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
						<AppPathIcon d="M15 6l-6 6 6 6" size={22} strokeWidth={2.2} color="#FFFFFF" />
					</Pressable>
				)}
				<View style={styles.simpleTitleCol}>
					<Text style={styles.simpleTitle} numberOfLines={1}>
						{title}
					</Text>
					{!!subtitle && (
						<Text style={styles.simpleSubtitle} numberOfLines={1}>
							{subtitle}
						</Text>
					)}
					{showHospitalSelector && <ClinicSwitcher />}
				</View>
				{rightAccessory}
			</View>
			{!!children && <View style={styles.segSlot}>{children}</View>}
		</View>
	)
}

function Blobs() {
	return (
		<>
			<View pointerEvents="none" style={styles.blobBig} />
			<View pointerEvents="none" style={styles.blobSmall} />
		</>
	)
}

export default DoctorScreenHeader

const styles = StyleSheet.create({
	header: {
		position: 'relative',
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		// paddingTop is set per-variant above (insets.top + 8 / + 16) so the header always clears the
		// status bar/notch -- do not hardcode a static value here again.
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		gap: 12,
	},
	headerSimple: {
		paddingBottom: 12,
		gap: 10,
	},
	blobBig: {
		position: 'absolute',
		right: -60,
		top: -80,
		width: 220,
		height: 220,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	blobSmall: {
		position: 'absolute',
		right: 90,
		top: 60,
		width: 90,
		height: 90,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mintAccent,
		opacity: 0.12,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 52,
	},
	avatarButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: APP_COLORS.mintAccent,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarBadge: {
		position: 'absolute',
		right: -6,
		bottom: -6,
		width: 22,
		height: 22,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.ink,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.16,
		shadowRadius: 3,
		elevation: 2,
	},
	greetingCol: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	actionButton: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#FFFFFF1F',
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBadge: {
		position: 'absolute',
		right: 10,
		top: 9,
		width: 9,
		height: 9,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mintAccent,
		borderWidth: 2,
		borderColor: APP_COLORS.ink,
	},
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 48,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
	},
	searchInput: {
		flex: 1,
		height: 44,
		fontSize: 16,
		color: APP_COLORS.ink,
	},
	simpleTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		minHeight: 44,
	},
	backButton: {
		width: 44,
		height: 44,
		marginLeft: -8,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	simpleTitleCol: {
		flex: 1,
		minWidth: 0,
	},
	simpleTitle: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	simpleSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.mintAccent,
	},
	segSlot: {
		zIndex: 1,
	},
})
