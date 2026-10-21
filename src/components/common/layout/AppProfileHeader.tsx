// src/components/common/layout/AppProfileHeader.tsx
//
// Profile-hub header from the "My profile" designs: APP_COLORS.ink panel with a 24px bottom radius and a
// decorative primary circle top-right; back button + "My profile" title row; 64px avatar (2px mintAccent
// ring) or initials, 20/26 800 name, 13/18 mint role line, optional status tag (e.g. "Verified doctor",
// "Licence in review"); optional white 48px square action (the patient's health-QR button); and a
// translucent completion card ("Profile 85% complete" · hint) with a 6px mintAccent progress bar.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppAvatar from '../display/AppAvatar'
import { AppTag, type AppTagTone } from '../display/AppTag'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppProfileHeaderProps = {
	title?: string
	onBack?: () => void
	name: string
	roleLine?: string
	avatarUri?: string | null
	status?: { label: string; tone?: AppTagTone; icon?: IconName } | null
	/** White square action on the identity row (e.g. health QR). */
	action?: { icon: IconName; onPress: () => void; accessibilityLabel: string }
	/** 0-100; the completion card is hidden when undefined. */
	completion?: number
	/** Right-hand hint on the completion card, e.g. "Add a bio". Defaults to "Almost done" / "Complete". */
	completionHint?: string
}

export function AppProfileHeader({
	title = 'My profile',
	onBack,
	name,
	roleLine,
	avatarUri,
	status,
	action,
	completion,
	completionHint,
}: AppProfileHeaderProps) {
	const insets = useSafeAreaInsets()
	const pct = completion == null ? null : Math.max(0, Math.min(100, Math.round(completion)))
	const hint = completionHint ?? (pct === 100 ? 'Complete' : 'Almost done')

	return (
		<View style={[styles.header, { paddingTop: insets.top + 4 }]}>
			<View style={styles.circle} pointerEvents="none" />
			<View style={styles.titleRow}>
				{onBack ? (
					<TouchableOpacity
						onPress={onBack}
						style={styles.back}
						accessibilityRole="button"
						accessibilityLabel="Back"
					>
						<MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
					</TouchableOpacity>
				) : null}
				<Text style={styles.title} accessibilityRole="header">
					{title}
				</Text>
			</View>

			<View style={styles.identity}>
				<AppAvatar
					uri={avatarUri || null}
					name={name}
					size={64}
					borderWidth={2}
					borderColor={APP_COLORS.mintAccent}
					backgroundColor={APP_COLORS.mint}
					initialsColor={APP_COLORS.primary}
					initialsStyle={styles.initials}
				/>
				<View style={styles.identityText}>
					<Text style={styles.name} numberOfLines={1}>
						{name}
					</Text>
					{!!roleLine && (
						<Text style={styles.roleLine} numberOfLines={1}>
							{roleLine}
						</Text>
					)}
					{!!status && (
						<AppTag
							label={status.label}
							tone={status.tone ?? 'confirmed'}
							icon={status.icon}
							size="sm"
							shape="rounded"
							style={styles.status}
							textStyle={styles.statusText}
						/>
					)}
				</View>
				{action ? (
					<TouchableOpacity
						onPress={action.onPress}
						style={styles.action}
						accessibilityRole="button"
						accessibilityLabel={action.accessibilityLabel}
					>
						<MaterialCommunityIcons name={action.icon} size={24} color={APP_COLORS.ink} />
					</TouchableOpacity>
				) : null}
			</View>

			{pct != null && (
				<View
					style={styles.completion}
					accessibilityRole="progressbar"
					accessibilityLabel="Profile completion"
					accessibilityValue={{ min: 0, max: 100, now: pct }}
				>
					<View style={styles.completionRow}>
						<Text style={styles.completionText}>Profile {pct}% complete</Text>
						<Text style={[styles.completionText, styles.completionHint]} numberOfLines={1}>
							{hint}
						</Text>
					</View>
					<View style={styles.track}>
						<View style={[styles.fill, { width: `${pct}%` }]} />
					</View>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	header: {
		position: 'relative',
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 12,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		zIndex: 2,
	},
	circle: {
		position: 'absolute',
		right: -60,
		top: -80,
		width: 220,
		height: 220,
		borderRadius: 110,
		backgroundColor: APP_COLORS.primary,
	},
	titleRow: {
		height: 52,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	back: {
		width: 44,
		height: 44,
		marginLeft: -10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		flex: 1,
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	identity: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
	},
	initials: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '800',
	},
	identityText: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	roleLine: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.mint,
	},
	status: {
		alignSelf: 'flex-start',
		marginTop: 4,
	},
	statusText: {
		fontSize: 11,
		lineHeight: 16,
		fontWeight: '800',
	},
	action: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	completion: {
		gap: 6,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: 'rgba(255,255,255,0.1)',
	},
	completionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 8,
	},
	completionText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	completionHint: {
		flexShrink: 1,
		color: APP_COLORS.mintAccent,
	},
	track: {
		height: 6,
		borderRadius: 3,
		overflow: 'hidden',
		backgroundColor: 'rgba(255,255,255,0.2)',
	},
	fill: {
		height: '100%',
		borderRadius: 3,
		backgroundColor: APP_COLORS.mintAccent,
	},
})

export default AppProfileHeader
