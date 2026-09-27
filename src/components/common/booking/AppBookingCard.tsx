// src/components/common/booking/AppBookingCard.tsx
//
// Cross-vertical booking card from "My bookings" (doctor / lab / home care / medicines / radiology):
//   card: white, 1px APP_COLORS.divider border, radius 12.
//   head (padding 14 14 12, gap 12): 48px kind tile (radius 12, TONES pair per kind — or a photo), then
//       kind label 11/14 800 caps in the tone ink + AppTag status (STATUS_TONES key), title 16/22 800, sub 13/18 muted.
//   when / where box (APP_COLORS.pageBg, margin 0 14, padding 10x12, radius 10, gap 4):
//       AppIcon calendar (primary) + when 14/20 700, where icon (inkMuted) + where 13/18 muted.
//   optional note banner (warning tone by default, 12/16 700, clock icon; margin 8 14 0, padding 8x10, radius 10),
//       e.g. "Start code 3957 · share it when the nurse arrives".
//   footer (padding 12 14 14): ref line 12/16 muted (flex), secondary AppActionChip (outline) + primary (filled).
// `onPress` makes the head + details region a button; the footer actions stay separate touch targets.

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import AppAvatar from '../display/AppAvatar'
import { AppIcon, type AppIconName } from '../display/AppIcon'
import { AppIconTile } from '../display/AppIconTile'
import { AppTag, type AppTagTone } from '../display/AppTag'
import { AppActionChip } from '../buttons/AppActionChip'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type BookingKind = 'doctor' | 'lab' | 'homecare' | 'medicine' | 'radiology'

/** Default caps label, MaterialCommunityIcons glyph and TONES key per booking kind (My bookings design). */
export const BOOKING_KINDS: Record<BookingKind, { label: string; icon: IconName; tone: ToneKey }> = {
	doctor: { label: 'Doctor appointment', icon: 'stethoscope', tone: 'sky' },
	lab: { label: 'Laboratory', icon: 'flask-outline', tone: 'lilac' },
	homecare: { label: 'Ancillary · Home care', icon: 'hand-heart-outline', tone: 'peach' },
	medicine: { label: 'Pharmacy order', icon: 'pill', tone: 'sand' },
	radiology: { label: 'Radiology', icon: 'radiology-box-outline', tone: 'mint' },
}

export type AppBookingCardAction = {
	label: string
	onPress: () => void
	icon?: IconName
	loading?: boolean
	disabled?: boolean
	accessibilityLabel?: string
}

export type AppBookingCardNoteTone = 'warning' | 'info' | 'success' | 'danger'

export type AppBookingCardNote = {
	text: string
	/** Defaults to 'warning' (warningBg / warning ink, as in the design). */
	tone?: AppBookingCardNoteTone
	/** Defaults to 'clock-outline'. */
	icon?: IconName
}

export type AppBookingCardProps = {
	kind: BookingKind
	/** Overrides the kind's default caps label. */
	kindLabel?: string
	/** Overrides the kind's default tile glyph. */
	icon?: IconName
	/** Overrides the kind's default tone. */
	tone?: ToneKey
	/** Photo shown instead of the kind tile (e.g. the doctor's picture). */
	imageUri?: string | null
	status?: { label: string; tone?: AppTagTone }
	title: string
	sub?: string
	when?: string
	where?: string
	/** AppIcon glyph for the where row. Defaults to 'pin'. Ignored when `whereGlyph` is set. */
	whereIcon?: AppIconName
	/** MaterialCommunityIcons glyph for the where row (e.g. 'home-outline', 'truck-outline', 'file-document-outline'). */
	whereGlyph?: IconName
	/** Plain string = warning-tone note. */
	note?: string | AppBookingCardNote
	/** e.g. "Order #1234 · ₹599". */
	refLabel?: string
	secondaryAction?: AppBookingCardAction
	primaryAction?: AppBookingCardAction
	onPress?: () => void
	accessibilityLabel?: string
	accessibilityHint?: string
	style?: StyleProp<ViewStyle>
}

const NOTE_TONES: Record<AppBookingCardNoteTone, { bg: string; ink: string }> = {
	warning: { bg: APP_COLORS.warningBg, ink: APP_COLORS.warning },
	info: { bg: APP_COLORS.mint, ink: APP_COLORS.primary },
	success: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	danger: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
}

export function AppBookingCard({
	kind,
	kindLabel,
	icon,
	tone,
	imageUri,
	status,
	title,
	sub,
	when,
	where,
	whereIcon = 'pin',
	whereGlyph,
	note,
	refLabel,
	secondaryAction,
	primaryAction,
	onPress,
	accessibilityLabel,
	accessibilityHint,
	style,
}: AppBookingCardProps) {
	const meta = BOOKING_KINDS[kind]
	const pair = TONES[tone ?? meta.tone]
	const label = kindLabel ?? meta.label
	const noteObj: AppBookingCardNote | undefined = typeof note === 'string' ? { text: note } : note
	const noteTone = NOTE_TONES[noteObj?.tone ?? 'warning']
	const a11y =
		accessibilityLabel ?? [label, title, status?.label, sub, when, where, noteObj?.text].filter(Boolean).join('. ')

	const main = (
		<>
			<View style={styles.head}>
				{imageUri ? (
					<AppAvatar
						uri={imageUri}
						name={title}
						size={48}
						radius={12}
						backgroundColor={pair.bg}
						initialsColor={pair.ink}
					/>
				) : (
					<AppIconTile
						icon={icon ?? meta.icon}
						size={48}
						radius={12}
						iconSize={24}
						tone={tone ?? meta.tone}
					/>
				)}
				<View style={styles.headText}>
					<View style={styles.kindRow}>
						<Text style={[styles.kind, { color: pair.ink }]} numberOfLines={1}>
							{label.toUpperCase()}
						</Text>
						{!!status && (
							<AppTag
								label={status.label}
								tone={status.tone ?? 'confirmed'}
								textStyle={styles.statusText}
								style={styles.status}
							/>
						)}
					</View>
					<Text style={styles.title} numberOfLines={2}>
						{title}
					</Text>
					{!!sub && (
						<Text style={styles.sub} numberOfLines={2}>
							{sub}
						</Text>
					)}
				</View>
			</View>

			{(!!when || !!where) && (
				<View style={styles.details}>
					{!!when && (
						<View style={styles.detailRow}>
							<AppIcon name="calendar" size={16} color={APP_COLORS.primary} strokeWidth={2.2} />
							<Text style={styles.when} numberOfLines={1}>
								{when}
							</Text>
						</View>
					)}
					{!!where && (
						<View style={styles.detailRow}>
							{whereGlyph ? (
								<MaterialCommunityIcons name={whereGlyph} size={16} color={APP_COLORS.inkMuted} />
							) : (
								<AppIcon name={whereIcon} size={16} color={APP_COLORS.inkMuted} />
							)}
							<Text style={styles.where} numberOfLines={1}>
								{where}
							</Text>
						</View>
					)}
				</View>
			)}

			{!!noteObj && (
				<View style={[styles.note, { backgroundColor: noteTone.bg }]}>
					<MaterialCommunityIcons name={noteObj.icon ?? 'clock-outline'} size={16} color={noteTone.ink} />
					<Text style={[styles.noteText, { color: noteTone.ink }]}>{noteObj.text}</Text>
				</View>
			)}
		</>
	)

	const hasFooter = !!refLabel || !!secondaryAction || !!primaryAction

	return (
		<View style={[styles.card, style]}>
			{onPress ? (
				<Pressable
					onPress={onPress}
					accessibilityRole="button"
					accessibilityLabel={a11y}
					accessibilityHint={accessibilityHint}
					style={({ pressed }) => pressed && styles.pressed}
				>
					{main}
				</Pressable>
			) : (
				<View accessible accessibilityLabel={a11y}>
					{main}
				</View>
			)}

			{hasFooter ? (
				<View style={styles.footer}>
					<Text style={styles.ref} numberOfLines={1}>
						{refLabel ?? ''}
					</Text>
					{!!secondaryAction && (
						<AppActionChip
							label={secondaryAction.label}
							onPress={secondaryAction.onPress}
							icon={secondaryAction.icon}
							loading={secondaryAction.loading}
							disabled={secondaryAction.disabled}
							accessibilityLabel={
								secondaryAction.accessibilityLabel ?? `${secondaryAction.label}, ${title}`
							}
						/>
					)}
					{!!primaryAction && (
						<AppActionChip
							label={primaryAction.label}
							onPress={primaryAction.onPress}
							icon={primaryAction.icon}
							loading={primaryAction.loading}
							disabled={primaryAction.disabled}
							accessibilityLabel={primaryAction.accessibilityLabel ?? `${primaryAction.label}, ${title}`}
							variant="filled"
						/>
					)}
				</View>
			) : (
				<View style={styles.bottomPad} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		overflow: 'hidden',
	},
	pressed: {
		opacity: 0.9,
	},
	head: {
		flexDirection: 'row',
		gap: 12,
		paddingTop: 14,
		paddingHorizontal: 14,
		paddingBottom: 12,
	},
	headText: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	kindRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	kind: {
		flexShrink: 1,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.55,
	},
	status: {
		flexShrink: 0,
	},
	statusText: {
		fontSize: 11,
		lineHeight: 16,
	},
	title: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	details: {
		marginHorizontal: 14,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
		gap: 4,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	when: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	where: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	note: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 8,
		marginHorizontal: 14,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 10,
	},
	noteText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingTop: 12,
		paddingHorizontal: 14,
		paddingBottom: 14,
	},
	ref: {
		flex: 1,
		minWidth: 0,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	bottomPad: {
		height: 14,
	},
})

export default AppBookingCard
