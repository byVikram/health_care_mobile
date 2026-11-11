import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Animated,
	InteractionManager,
	NativeScrollEvent,
	NativeSyntheticEvent,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
	AppChip,
	AppHeaderBackdrop,
	AppIconTile,
	AppNavRow,
	AppTypography,
	AppIcon,
	AppPathIcon,
	AppSearchBar,
	AppSkeleton,
	LocationSelector,
} from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { getSpecialities } from '../doctorService'
import { ROUTES } from '../../../navigation/routes'
import { APP_COLORS, SOFT_CARD_SHADOW } from '../../../config/theme'
import { specialityVisual } from './components/specialityMeta'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types'

const SYMPTOM_CHIPS = ['Fever', 'Cough', 'Headache', 'Back pain', 'Skin rash', 'Stomach pain', 'Anxiety', 'Joint pain']

const GRID_COL_GAP = 8
const GRID_ROW_GAP = 16
const SIDE_PADDING = 16
/** Placeholder cards shown while the specialities load (3 rows of 3). */
const SKELETON_COUNT = 9

type Speciality = {
	id: string
	label: string
	icon: string
	hint: string
	/** Lower-cased label + hint + tags, used for local filtering. */
	haystack: string
}

// ─── Speciality Grid Item ─────────────────────────────────────────────────────
function SpecialityGridItem({ spec, width, onPress }: { spec: Speciality; width: number; onPress: () => void }) {
	return (
		<TouchableOpacity style={[styles.specItem, { width }]} onPress={onPress} activeOpacity={0.75}>
			<AppIconTile
				size={68}
				radius={16}
				backgroundColor={APP_COLORS.surface}
				borderColor={APP_COLORS.cardBorder}
				style={styles.specTile}
			>
				<AppPathIcon d={spec.icon} size={30} color={APP_COLORS.primary} />
			</AppIconTile>
			<View style={styles.specTextCol}>
				<AppTypography style={styles.specLabel} numberOfLines={2}>
					{spec.label}
				</AppTypography>
			</View>
		</TouchableOpacity>
	)
}

// ─── Speciality Grid Skeleton ─────────────────────────────────────────────────
// Same footprint as SpecialityGridItem (68px tile + one label line) so nothing jumps when the data lands.
function SpecialityGridSkeleton({ width }: { width: number }) {
	return (
		<View style={[styles.specItem, { width }]}>
			<AppSkeleton width={68} height={68} borderRadius={16} color={APP_COLORS.divider} />
			<AppSkeleton width={56} height={12} borderRadius={4} color={APP_COLORS.divider} />
		</View>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SearchPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { user } = useAuth()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const [specialities, setSpecialities] = useState<Speciality[]>([])
	const [loadingSpecs, setLoadingSpecs] = useState(true)
	const [query, setQuery] = useState('')

	// Coming from the Home search bar: open the keyboard straight away. The flag is used once and cleared, so a tap on the
	// Search tab itself does not pop the keyboard.
	const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>()
	const route = useRoute<RouteProp<MainTabParamList, typeof ROUTES.MAIN.SEARCH>>()
	const searchInputRef = useRef<TextInput>(null)
	const focusSearch = route.params?.focusSearch
	useFocusEffect(
		useCallback(() => {
			if (!focusSearch) return
			const task = InteractionManager.runAfterInteractions(() => {
				searchInputRef.current?.focus()
				tabNavigation.setParams({ focusSearch: undefined })
			})
			return () => task.cancel()
		}, [focusSearch, tabNavigation])
	)

	// Collapsing header: `compact` flips with hysteresis (on > 24, off <= 4,
	// same as the design) and `progress` animates 0 → 1 between the states.
	const [compact, setCompact] = useState(false)
	const compactRef = useRef(false)
	const progress = useRef(new Animated.Value(0)).current

	useEffect(() => {
		Animated.timing(progress, {
			toValue: compact ? 1 : 0,
			duration: 220,
			useNativeDriver: false,
		}).start()
	}, [compact, progress])

	const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const y = e.nativeEvent.contentOffset.y
		const on = compactRef.current ? y > 4 : y > 24
		if (on !== compactRef.current) {
			compactRef.current = on
			setCompact(on)
		}
	}

	useEffect(() => {
		const loadSpecialities = async () => {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) {
					const specMap: Speciality[] = res.data.map((s) => {
						const visual = specialityVisual(s.label)
						return {
							id: s.id,
							label: s.label,
							icon: visual.icon,
							hint: visual.hint,
							haystack: `${s.label} ${visual.hint} ${visual.tags}`.toLowerCase(),
						}
					})
					setSpecialities(specMap)
				}
			} catch (error) {
				console.error('Error fetching specialities:', error)
			} finally {
				setLoadingSpecs(false)
			}
		}
		loadSpecialities()
	}, [])

	const firstName = useMemo(() => {
		const name = user?.name?.trim()
		if (!name) return ''
		return name.split(/\s+/)[0].toUpperCase()
	}, [user?.name])

	const q = query.trim().toLowerCase()
	const filtered = useMemo(() => specialities.filter((spec) => !q || spec.haystack.includes(q)), [specialities, q])

	const itemWidth = Math.floor((width - SIDE_PADDING * 2 - GRID_COL_GAP * 2) / 3)

	const handleSpecialityPress = (spec: Speciality) => {
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
			query: '',
			specialityId: spec.id,
			specialityName: spec.label,
		})
	}

	const handleSymptomPress = (symptom: string) => {
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, { query: symptom })
	}

	const handleSeeAllDoctors = () => {
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH as any)
	}

	// Animated header values (design: expanded → compact)
	const headerPadBottom = progress.interpolate({ inputRange: [0, 1], outputRange: [20, 12] })
	const topRowHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 52] })
	const headGap = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 4] })
	const introMax = progress.interpolate({ inputRange: [0, 1], outputRange: [88, 0] })
	const introOpacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0, 0] })
	const miniOpacity = progress
	const miniShift = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })
	const shadowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] })
	const elevation = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 4] })

	const showSymptoms = !q

	return (
		<View style={styles.container}>
			{/* HEADER (collapses on scroll) */}
			<Animated.View style={[styles.headerShadow, { shadowOpacity, elevation }]}>
				<Animated.View style={[styles.hero, { paddingTop: insets.top + 4, paddingBottom: headerPadBottom }]}>
					<AppHeaderBackdrop />

					<Animated.View style={[styles.heroTopRow, { height: topRowHeight }]}>
						<Animated.View
							style={{ opacity: miniOpacity, transform: [{ translateY: miniShift }] }}
							accessibilityElementsHidden={!compact}
							importantForAccessibility={compact ? 'auto' : 'no-hide-descendants'}
						>
							<AppTypography style={styles.miniTitle}>Consult a doctor</AppTypography>
							{compact && (
								<View style={styles.miniLocation}>
									<LocationSelector
										color={APP_COLORS.mint}
										iconSize={14}
										textStyle={styles.miniLocationText}
									/>
								</View>
							)}
						</Animated.View>
					</Animated.View>

					<Animated.View
						style={[styles.heroIntro, { marginTop: headGap, maxHeight: introMax, opacity: introOpacity }]}
						pointerEvents={compact ? 'none' : 'auto'}
						accessibilityElementsHidden={compact}
						importantForAccessibility={compact ? 'no-hide-descendants' : 'auto'}
					>
						{!!firstName && <AppTypography style={styles.heroEyebrow}>HI {firstName}</AppTypography>}
						<AppTypography style={styles.heroTitle}>Consult a doctor</AppTypography>
						<View style={styles.heroLocation}>
							<LocationSelector
								color={APP_COLORS.mint}
								iconSize={16}
								textStyle={styles.heroLocationText}
							/>
						</View>
					</Animated.View>

					<Animated.View style={{ marginTop: headGap }}>
						<AppSearchBar
							context="doctorSearch"
							tone="onDark"
							value={query}
							onChangeText={setQuery}
							inputRef={searchInputRef}
						/>
					</Animated.View>
				</Animated.View>
			</Animated.View>

			<Animated.ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				onScroll={handleScroll}
				scrollEventThrottle={16}
			>
				{showSymptoms && (
					<>
						{/* SEE A DOCTOR FROM HOME */}
						<View style={styles.bannerSection}>
							<View style={styles.videoBanner}>
								<AppIconTile size={48} radius={12} backgroundColor={APP_COLORS.neutralBg}>
									<AppIcon name="video" size={26} color={APP_COLORS.primary} />
								</AppIconTile>
								<View style={styles.videoBannerTextCol}>
									<AppTypography style={styles.videoBannerTitle}>
										See a doctor from home
									</AppTypography>
									<AppTypography style={styles.videoBannerSubtitle}>
										Video consults with doctors available today
									</AppTypography>
								</View>
							</View>
						</View>

						{/* NOT SURE WHO TO SEE */}
						<View style={styles.symptomSection}>
							<AppTypography style={styles.sectionTitle}>
								Not sure who to see? Pick a symptom
							</AppTypography>
							<View style={styles.symptomRow}>
								{SYMPTOM_CHIPS.map((symptom) => (
									<AppChip
										key={symptom}
										label={symptom}
										onPress={() => handleSymptomPress(symptom)}
										size="sm"
										shape="rounded"
										borderWidth={0}
										style={styles.symptomChip}
									/>
								))}
							</View>
						</View>
					</>
				)}

				{/* ALL SPECIALITIES */}
				<View style={styles.specSection}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography style={styles.sectionTitle}>
							{q ? 'Matching specialities' : 'All specialities'}
						</AppTypography>
					</View>

					{loadingSpecs ? (
						<View style={styles.specGrid} accessibilityLabel="Loading specialities">
							{Array.from({ length: SKELETON_COUNT }, (_, index) => (
								<SpecialityGridSkeleton key={`spec-skeleton-${index}`} width={itemWidth} />
							))}
						</View>
					) : (
						<>
							<View style={styles.specGrid}>
								{filtered.map((spec) => (
									<SpecialityGridItem
										key={spec.id}
										spec={spec}
										width={itemWidth}
										onPress={() => handleSpecialityPress(spec)}
									/>
								))}
							</View>
							{filtered.length === 0 && (
								<AppTypography style={styles.noResults}>
									No speciality matches. Try a symptom like "fever" or "back pain".
								</AppTypography>
							)}
						</>
					)}
				</View>

				{/* SEE ALL DOCTORS */}
				<AppNavRow
					title="See all doctors"
					subtitle="Browse every doctor near you"
					onPress={handleSeeAllDoctors}
					leading={
						<AppIconTile size={40} radius={12} backgroundColor={APP_COLORS.neutralBg}>
							<AppIcon name="video" size={20} color={APP_COLORS.primary} />
						</AppIconTile>
					}
					trailing={<AppIcon name="chevronRight" size={20} color={APP_COLORS.inkMuted} />}
					style={styles.seeAllRow}
					titleStyle={styles.seeAllTitle}
				/>
			</Animated.ScrollView>
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },

	// Header — outer view carries the (animated) shadow, inner view clips the circles.
	headerShadow: {
		zIndex: 2,
		backgroundColor: APP_COLORS.ink,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
	},
	hero: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		overflow: 'hidden',
	},
	// Only the collapsed header shows the small title, so the row is short while the big intro is showing (height
	// is animated, see topRowHeight).
	heroTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		overflow: 'hidden',
	},
	miniTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: APP_COLORS.surface,
	},
	miniLocation: {
		marginTop: -2,
		alignItems: 'flex-start',
	},
	miniLocationText: {
		fontSize: 12,
		fontWeight: '500',
	},
	heroLocation: {
		marginTop: 2,
		alignItems: 'flex-start',
	},
	heroLocationText: {
		fontSize: 13,
		fontWeight: '600',
	},
	heroIntro: {
		gap: 4,
		overflow: 'hidden',
	},
	heroEyebrow: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.72,
		color: APP_COLORS.mintAccent,
	},
	heroTitle: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: '700',
		letterSpacing: -0.26,
		color: APP_COLORS.surface,
	},

	// Scroll content (design <main>: gap 8, padding-bottom 8)
	scrollContent: { paddingBottom: 8, gap: 8 },
	// The banner's shadow falls below the card, onto the next (white) section: room for it (8, as the design) and a
	// zIndex so this section is painted over the one that follows instead of under it.
	bannerSection: {
		backgroundColor: APP_COLORS.surface,
		paddingTop: 16,
		paddingBottom: 8,
		paddingHorizontal: 16,
		zIndex: 1,
	},
	symptomSection: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		marginTop: -8,
		gap: 10,
	},
	specSection: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		gap: 12,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},

	// Video banner
	videoBanner: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 16,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.cardBorder,
		...SOFT_CARD_SHADOW,
	},
	videoBannerTextCol: {
		flex: 1,
		gap: 2,
	},
	videoBannerTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	videoBannerSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},

	// Symptom chips: AppChip sm (36h, 13/600) on a neutral background, 14px side padding
	symptomRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	symptomChip: {
		paddingHorizontal: 14,
		backgroundColor: APP_COLORS.neutralBg,
	},

	// Speciality grid (3 cols, 16px row gap, 8px column gap)
	specGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		rowGap: GRID_ROW_GAP,
		columnGap: GRID_COL_GAP,
	},
	specItem: {
		alignItems: 'center',
		gap: 8,
	},
	specTile: {
		...SOFT_CARD_SHADOW,
	},
	specTextCol: {
		alignItems: 'center',
	},
	specLabel: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	noResults: {
		paddingVertical: 16,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},

	// See all doctors row
	// AppNavRow (gap 12, 15/600 ink title) as a padded white page row; the design's title is 15/22
	seeAllRow: {
		padding: 16,
		backgroundColor: APP_COLORS.surface,
	},
	seeAllTitle: {
		lineHeight: 22,
	},
})
