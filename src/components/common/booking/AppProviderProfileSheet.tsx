// src/components/common/booking/AppProviderProfileSheet.tsx
//
// "View profile" sheet from "Book nursing visit", on AppBottomSheet appearance="modern":
//   title = provider name, subtitle = role ("Nurse · 6 yrs").
//   64px AppAvatar + stat cells (APP_COLORS.pageBg, padding 8, radius 10, centred: 15/800 value, 11 muted label)
//     — "6 yrs / experience", "2.1 km / away".
//   about 14/20, "Works: …" / "Speaks: …" 13/18 (bold keys), APP_COLORS.success shield "Background and licence verified".
//   Footer CTA: AppButton size="lg" (e.g. "Choose Sunita" / disabled "Not free on your days").
// Pure UI — provider data comes in through props.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { APP_COLORS, TONES, toneForString, type ToneKey } from '../../../config/theme'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import AppAvatar from '../display/AppAvatar'
import { AppIcon } from '../display/AppIcon'
import { AppSkeleton } from '../display/AppSkeleton'
import { AppButton } from '../buttons/AppButton'

export type AppProviderProfileSheetProps = {
	visible: boolean
	onClose: () => void
	name: string
	/** Subtitle under the name, e.g. "Nurse · 6 yrs". */
	role?: string
	avatarUri?: string | null
	avatarTone?: ToneKey
	/** e.g. "6 yrs". */
	experienceLabel?: string
	/** e.g. "2.1 km". */
	distanceLabel?: string
	about?: string
	/** "Works:" line, e.g. "Mon–Sat · 7 AM – 9 PM". */
	worksLabel?: string
	/** "Speaks:" line; joined with ", " when an array. */
	languages?: string | string[]
	/** Shows the verified line. Defaults to true. */
	verified?: boolean
	/** Defaults to "Background and licence verified". */
	verifiedLabel?: string
	/** Shows skeletons for the whole body (e.g. while the profile loads). */
	loading?: boolean
	ctaLabel: string
	onCtaPress: () => void
	ctaDisabled?: boolean
	ctaLoading?: boolean
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
			<Text style={styles.statValue} numberOfLines={1}>
				{value}
			</Text>
			<Text style={styles.statLabel} numberOfLines={1}>
				{label}
			</Text>
		</View>
	)
}

export function AppProviderProfileSheet({
	visible,
	onClose,
	name,
	role,
	avatarUri,
	avatarTone,
	experienceLabel,
	distanceLabel,
	about,
	worksLabel,
	languages,
	verified = true,
	verifiedLabel = 'Background and licence verified',
	loading = false,
	ctaLabel,
	onCtaPress,
	ctaDisabled = false,
	ctaLoading = false,
}: AppProviderProfileSheetProps) {
	const tone = avatarTone ? TONES[avatarTone] : toneForString(name)
	const langs = Array.isArray(languages) ? languages.join(', ') : languages
	const stats: { value: string; label: string }[] = []
	if (experienceLabel) stats.push({ value: experienceLabel, label: 'experience' })
	if (distanceLabel) stats.push({ value: distanceLabel, label: 'away' })

	const footer = (
		<AppButton
			size="lg"
			onPress={onCtaPress}
			disabled={ctaDisabled || loading}
			loading={ctaLoading}
			softDisabled
			accessibilityLabel={ctaLabel}
		>
			{ctaLabel}
		</AppButton>
	)

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={name}
			subtitle={role}
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.9}
			footer={footer}
		>
			{loading ? (
				<View style={styles.body} accessibilityLabel="Loading profile" accessible>
					<View style={styles.top}>
						<AppSkeleton width={64} height={64} borderRadius={32} color={APP_COLORS.neutralBg} />
						<View style={styles.stats}>
							<AppSkeleton
								height={52}
								borderRadius={10}
								color={APP_COLORS.neutralBg}
								style={styles.flex}
							/>
							<AppSkeleton
								height={52}
								borderRadius={10}
								color={APP_COLORS.neutralBg}
								style={styles.flex}
							/>
						</View>
					</View>
					<AppSkeleton height={40} borderRadius={8} color={APP_COLORS.neutralBg} />
					<AppSkeleton height={56} borderRadius={10} color={APP_COLORS.neutralBg} />
				</View>
			) : (
				<View style={styles.body}>
					<View style={styles.top}>
						<AppAvatar
							uri={avatarUri}
							name={name}
							size={64}
							backgroundColor={tone.bg}
							initialsColor={tone.ink}
							initialsStyle={styles.initials}
						/>
						{stats.length > 0 && (
							<View style={styles.stats}>
								{stats.map((s) => (
									<Stat key={s.label} value={s.value} label={s.label} />
								))}
							</View>
						)}
					</View>

					{!!about && <Text style={styles.about}>{about}</Text>}

					{(!!worksLabel || !!langs || verified) && (
						<View style={styles.facts}>
							{!!worksLabel && (
								<Text style={styles.fact}>
									<Text style={styles.factKey}>Works:</Text> {worksLabel}
								</Text>
							)}
							{!!langs && (
								<Text style={styles.fact}>
									<Text style={styles.factKey}>Speaks:</Text> {langs}
								</Text>
							)}
							{verified && (
								<View style={styles.verified} accessible accessibilityLabel={verifiedLabel}>
									<AppIcon
										name="shield"
										size={16}
										color={APP_COLORS.success}
										strokeWidth={2.2}
										rounded
									/>
									<Text style={styles.verifiedText}>{verifiedLabel}</Text>
								</View>
							)}
						</View>
					)}
				</View>
			)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 14,
		paddingTop: 0,
	},
	flex: {
		flex: 1,
	},
	top: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	initials: {
		fontSize: 20,
		fontWeight: '800',
	},
	stats: {
		flex: 1,
		flexDirection: 'row',
		gap: 6,
	},
	stat: {
		flex: 1,
		minWidth: 0,
		padding: 8,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	statLabel: {
		fontSize: 11,
		lineHeight: 14,
		color: APP_COLORS.inkMuted,
	},
	about: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	facts: {
		gap: 4,
	},
	fact: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
	factKey: {
		fontWeight: '700',
	},
	verified: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	verifiedText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
})

export default AppProviderProfileSheet
