// src/features/doctor/detail/CollapsingProfileHeader.tsx
//
// Scroll-driven header of the "Collapsing doctor profile" design. As the profile scrolls:
//   - the title "Doctor profile" fades up and out (0 -> 60px of scroll);
//   - the doctor's avatar rides up with the content until it reaches the header, then shrinks
//     (112 -> 36px) and slides left to sit beside the name (74 -> 158px of scroll), its green
//     "available" dot fading out on the way;
//   - the compact identity ("Dr. Name / Speciality · 14 yrs · ₹800") fades in beside it (146 -> 172px);
//   - a soft shadow fades in under the header once it has collapsed.
// Everything is a transform / opacity driven by `scrollY`, so it runs on the native thread.
// The in-page hero avatar stays in the layout, invisible (see DoctorDetailPage), so nothing reflows.

import React, { useMemo } from 'react'
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppAvatar, AppTypography } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'

export const PROFILE_AVATAR_SIZE = 112
/** The hero avatar sits this far below the top of the scroll content (banner 84 - 60 overlap). */
const HERO_AVATAR_TOP = 24
const BAR_HEIGHT = 64
const COMPACT_AVATAR_SIZE = 36
/** Where the compact avatar's centre rests, from the left edge (beside the back button). */
const COMPACT_AVATAR_CENTER_X = 72
// Scroll offsets (px) of each phase, from the design.
const SHRINK_START = 74
const SHRINK_END = 158
const TITLE_FADE_END = 60
const IDENT_FADE_START = 146
const IDENT_FADE_END = 172
const SHRINK_STEPS = 8

type Props = {
	scrollY: Animated.Value
	name: string
	/** Compact identity line under the name, e.g. "Diabetologist · 14 yrs · ₹800". */
	subtitle?: string
	avatarUri: string | null
	/** Green "available today" dot on the avatar. */
	available: boolean
	onBack: () => void
	onShare: () => void
}

export function CollapsingProfileHeader({ scrollY, name, subtitle, avatarUri, available, onBack, onShare }: Props) {
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const headerHeight = insets.top + BAR_HEIGHT
	const restTop = headerHeight + HERO_AVATAR_TOP
	const restCenterX = width / 2

	const motion = useMemo(() => {
		const scaleEnd = COMPACT_AVATAR_SIZE / PROFILE_AVATAR_SIZE
		const half = PROFILE_AVATAR_SIZE / 2
		// Phase 1 (0 -> 74): the avatar scrolls up with the page, unchanged.
		// Phase 2 (74 -> 158): it holds at the header, shrinks, and drifts left on an eased (k^1.3) path.
		const xs: number[] = [0, SHRINK_START]
		const tx: number[] = [0, 0]
		for (let i = 1; i <= SHRINK_STEPS; i++) {
			const t = i / SHRINK_STEPS
			xs.push(SHRINK_START + (SHRINK_END - SHRINK_START) * t)
			tx.push((COMPACT_AVATAR_CENTER_X - restCenterX) * Math.pow(t, 1.3))
		}
		const ty = [-0, -SHRINK_START, -SHRINK_START - half * (1 - scaleEnd)]
		return {
			translateX: scrollY.interpolate({ inputRange: xs, outputRange: tx, extrapolate: 'clamp' }),
			translateY: scrollY.interpolate({ inputRange: [0, SHRINK_START, SHRINK_END], outputRange: ty, extrapolate: 'clamp' }),
			scale: scrollY.interpolate({ inputRange: [0, SHRINK_START, SHRINK_END], outputRange: [1, 1, scaleEnd], extrapolate: 'clamp' }),
			dotOpacity: scrollY.interpolate({ inputRange: [SHRINK_START, SHRINK_START + (SHRINK_END - SHRINK_START) * 0.625], outputRange: [1, 0], extrapolate: 'clamp' }),
			titleOpacity: scrollY.interpolate({ inputRange: [0, TITLE_FADE_END], outputRange: [1, 0], extrapolate: 'clamp' }),
			titleShift: scrollY.interpolate({ inputRange: [0, TITLE_FADE_END], outputRange: [0, -10], extrapolate: 'clamp' }),
			identOpacity: scrollY.interpolate({ inputRange: [IDENT_FADE_START, IDENT_FADE_END], outputRange: [0, 1], extrapolate: 'clamp' }),
			identShift: scrollY.interpolate({ inputRange: [IDENT_FADE_START, IDENT_FADE_END], outputRange: [6, 0], extrapolate: 'clamp' }),
			shadowOpacity: scrollY.interpolate({ inputRange: [SHRINK_START, SHRINK_END], outputRange: [0, 1], extrapolate: 'clamp' }),
		}
	}, [scrollY, restCenterX])

	return (
		<>
			<View style={[styles.header, { paddingTop: insets.top, height: headerHeight }]}>
				<Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to doctors" style={[styles.iconBtn, { marginLeft: -10 }]}>
					<MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
				</Pressable>
				<View style={styles.center}>
					<Animated.View
						pointerEvents="none"
						style={[styles.titleWrap, { opacity: motion.titleOpacity, transform: [{ translateY: motion.titleShift }] }]}
					>
						<AppTypography style={styles.title}>Doctor profile</AppTypography>
					</Animated.View>
					<Animated.View
						pointerEvents="none"
						style={[styles.ident, { opacity: motion.identOpacity, transform: [{ translateY: motion.identShift }] }]}
					>
						<AppTypography style={styles.identName} numberOfLines={1}>
							{name}
						</AppTypography>
						{!!subtitle && (
							<AppTypography style={styles.identSub} numberOfLines={1}>
								{subtitle}
							</AppTypography>
						)}
					</Animated.View>
				</View>
				<Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share profile" style={[styles.iconBtn, { marginRight: -10 }]}>
					<MaterialCommunityIcons name="share-variant-outline" size={22} color="#FFFFFF" />
				</Pressable>
			</View>

			{/* Soft shadow under the header once it has collapsed. */}
			<Animated.View pointerEvents="none" style={[styles.shadow, { top: headerHeight, opacity: motion.shadowOpacity }]}>
				<Svg width="100%" height="100%">
					<Defs>
						<LinearGradient id="headerShadow" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="0" stopColor="#12373E" stopOpacity={0.16} />
							<Stop offset="1" stopColor="#12373E" stopOpacity={0} />
						</LinearGradient>
					</Defs>
					<Rect width="100%" height="100%" fill="url(#headerShadow)" />
				</Svg>
			</Animated.View>

			{/* The flying avatar: starts exactly over the (invisible) hero avatar, ends beside the name. */}
			<Animated.View
				pointerEvents="none"
				style={[
					styles.avatar,
					{
						top: restTop,
						left: restCenterX - PROFILE_AVATAR_SIZE / 2,
						transform: [{ translateX: motion.translateX }, { translateY: motion.translateY }, { scale: motion.scale }],
					},
				]}
			>
				<AppAvatar
					uri={avatarUri}
					size={PROFILE_AVATAR_SIZE}
					borderWidth={4}
					borderColor="#FFFFFF"
					backgroundColor={TONES.lilac.bg}
					fallbackIcon="account"
					initialsColor={TONES.lilac.ink}
				/>
				{available && <Animated.View style={[styles.dot, { opacity: motion.dotOpacity }]} />}
			</Animated.View>
		</>
	)
}

const styles = StyleSheet.create({
	header: {
		zIndex: 2,
		backgroundColor: APP_COLORS.primary,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	iconBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
	center: { flex: 1, minWidth: 0, height: 48, justifyContent: 'center' },
	titleWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center' },
	title: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: '#FFFFFF' },
	// Starts past the compact avatar (centre 72, 36 wide) with a 10px gap.
	ident: { position: 'absolute', left: 46, right: 0, top: 6 },
	identName: { fontSize: 16, lineHeight: 20, fontWeight: '700', color: '#FFFFFF' },
	identSub: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: '#E3EFEF' },
	shadow: { position: 'absolute', left: 0, right: 0, height: 8, zIndex: 2 },
	avatar: { position: 'absolute', zIndex: 3, elevation: 8 },
	dot: {
		position: 'absolute',
		right: 6,
		bottom: 6,
		width: 22,
		height: 22,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.success,
		borderWidth: 3,
		borderColor: '#FFFFFF',
	},
})

export default CollapsingProfileHeader
