// src/components/common/booking/AppProviderCard.tsx
//
// Provider (nurse / physio / caregiver) select card from "Book nursing visit" — step 2 "Choose your nurse":
//   card: radius 12, 2px APP_COLORS.divider border on white; selected = APP_COLORS.primary border on APP_COLORS.mint;
//         disabled (e.g. not free on any of the picked days) = 0.55 opacity.
//   row (padding 12 12 8, gap 12): 48px AppAvatar (initials on a TONES pair), name 15/20 800 + fee 15/20 800,
//         "★ 4.8 (120+) · 6 yrs · 2.1 km" 12/16 muted, languages 12/16 muted, availability AppTag
//         (11/16 700 — e.g. 'confirmed' "Free on all 3 days", 'pending' "Free on 2 of 3 days",
//         'done' = APP_COLORS.neutralBg + inkMuted "Not free on your days"), trailing AppRadio.
//   "View profile & reviews ›" AppTextLink indented under the text column (padding 0 12 10 72).
//   Optional `children` rendered inside the card below (e.g. the provider's time-slot SlotChipGrid).
// Pure UI — all data comes in through props.

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS, TONES, toneForString, type ToneKey } from '../../../config/theme'
import AppAvatar from '../display/AppAvatar'
import { AppTag, type AppTagTone } from '../display/AppTag'
import { AppRadio } from '../inputs/AppRadio'
import { AppTextLink } from '../buttons/AppTextLink'

export type AppProviderAvailability = {
	label: string
	/** AppTag tone. Defaults to 'confirmed'. Use 'done' for the neutral "Not free on your days" pill. */
	tone?: AppTagTone
}

export type AppProviderCardProps = {
	name: string
	avatarUri?: string | null
	/** Initials-avatar tone. Defaults to a stable tone derived from the name. */
	avatarTone?: ToneKey
	/** e.g. "₹199/visit". */
	feeLabel?: string
	rating?: number | string
	/** Review count, e.g. 120 or "120+". */
	reviews?: number | string
	/** e.g. "6 yrs" or "12 yrs · Senior". */
	experienceLabel?: string
	/** e.g. "2.1 km". */
	distanceLabel?: string
	/** Joined with ", " when an array. */
	languages?: string | string[]
	availability?: AppProviderAvailability
	selected?: boolean
	/** Greys the card out (0.55) and blocks selection; "View profile" stays tappable. */
	disabled?: boolean
	onPress?: () => void
	onViewProfile?: () => void
	/** Defaults to "View profile & reviews". */
	viewProfileLabel?: string
	/** Extra content inside the card, below the header (e.g. the time-slot grid when expanded). */
	children?: React.ReactNode
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

/** "★ 4.8 (120+) · 6 yrs · 2.1 km" — shared with AppProviderProfileSheet callers that need the same line. */
export const providerMetaLine = ({
	rating,
	reviews,
	experienceLabel,
	distanceLabel,
}: Pick<AppProviderCardProps, 'rating' | 'reviews' | 'experienceLabel' | 'distanceLabel'>) => {
	const ratingPart =
		rating != null && rating !== '' ? `★ ${rating}${reviews != null && reviews !== '' ? ` (${reviews})` : ''}` : ''
	return [ratingPart, experienceLabel, distanceLabel].filter(Boolean).join(' · ')
}

export function AppProviderCard({
	name,
	avatarUri,
	avatarTone,
	feeLabel,
	rating,
	reviews,
	experienceLabel,
	distanceLabel,
	languages,
	availability,
	selected = false,
	disabled = false,
	onPress,
	onViewProfile,
	viewProfileLabel = 'View profile & reviews',
	children,
	accessibilityLabel,
	style,
}: AppProviderCardProps) {
	const tone = avatarTone ? TONES[avatarTone] : toneForString(name)
	const meta = providerMetaLine({ rating, reviews, experienceLabel, distanceLabel })
	const langs = Array.isArray(languages) ? languages.join(', ') : languages
	const a11y =
		accessibilityLabel ??
		[
			name,
			feeLabel,
			rating != null && rating !== '' ? `rated ${rating}${reviews != null ? `, ${reviews} reviews` : ''}` : '',
			experienceLabel,
			distanceLabel,
			langs ? `speaks ${langs}` : '',
			availability?.label,
		]
			.filter(Boolean)
			.join(', ')

	return (
		<View style={[styles.card, selected && styles.cardOn, disabled && styles.cardDisabled, style]}>
			<Pressable
				onPress={onPress}
				disabled={disabled || !onPress}
				accessibilityRole="radio"
				accessibilityState={{ checked: selected, disabled }}
				accessibilityLabel={a11y}
				style={({ pressed }) => [styles.row, pressed && styles.pressed]}
			>
				<AppAvatar
					uri={avatarUri}
					name={name}
					size={48}
					backgroundColor={tone.bg}
					initialsColor={tone.ink}
					initialsStyle={styles.initials}
				/>
				<View style={styles.body}>
					<View style={styles.titleRow}>
						<Text style={styles.name} numberOfLines={1}>
							{name}
						</Text>
						{!!feeLabel && <Text style={styles.fee}>{feeLabel}</Text>}
					</View>
					{!!meta && <Text style={styles.meta}>{meta}</Text>}
					{!!langs && <Text style={styles.meta}>{langs}</Text>}
					{!!availability && (
						<AppTag
							label={availability.label}
							tone={availability.tone ?? 'confirmed'}
							style={styles.availability}
							textStyle={styles.availabilityText}
						/>
					)}
				</View>
				<AppRadio checked={selected} style={styles.radio} />
			</Pressable>
			{!!onViewProfile && (
				<View style={styles.linkRow}>
					<AppTextLink
						label={viewProfileLabel}
						onPress={onViewProfile}
						size="sm"
						accessibilityLabel={`${viewProfileLabel}, ${name}`}
						accessibilityHint="Opens the profile sheet"
					/>
				</View>
			)}
			{children != null && <View style={styles.children}>{children}</View>}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 12,
		borderWidth: 2,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	cardOn: {
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
	},
	cardDisabled: {
		opacity: 0.55,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		paddingTop: 12,
		paddingHorizontal: 12,
		paddingBottom: 8,
	},
	pressed: {
		opacity: 0.9,
	},
	initials: {
		fontSize: 15,
		fontWeight: '800',
	},
	body: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	name: {
		flexShrink: 1,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	fee: {
		flexShrink: 0,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	meta: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	availability: {
		marginTop: 4,
	},
	availabilityText: {
		fontSize: 11,
		lineHeight: 16,
	},
	radio: {
		marginTop: 2,
	},
	linkRow: {
		paddingLeft: 72,
		paddingRight: 12,
		paddingBottom: 10,
		alignItems: 'flex-start',
	},
	children: {
		paddingHorizontal: 12,
		paddingBottom: 12,
	},
})

export default AppProviderCard
