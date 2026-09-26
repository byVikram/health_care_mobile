import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	NativeScrollEvent,
	NativeSyntheticEvent,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIconTile, AppTypography, AppIcon, AppPathIcon } from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { getSpecialities } from '../doctorService'
import { ROUTES } from '../../../navigation/routes'
import { APP_COLORS, TONES, toneAt } from '../../../config/theme'
import { specialityVisual } from './components/specialityMeta'
import type { NavigationProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'

const SYMPTOM_CHIPS = ['Fever', 'Cough', 'Headache', 'Back pain', 'Skin rash', 'Stomach pain', 'Anxiety', 'Joint pain']

const GRID_COL_GAP = 8
const GRID_ROW_GAP = 16
const SIDE_PADDING = 16

type Speciality = {
	id: string
	label: string
	icon: string
	hint: string
	/** Lower-cased label + hint + tags, used for local filtering. */
	haystack: string
}

// ─── Speciality Grid Item ─────────────────────────────────────────────────────
function SpecialityGridItem({
	spec,
	tone,
	width,
	onPress,
}: {
	spec: Speciality
	tone: { bg: string; ink: string }
	width: number
	onPress: () => void
}) {
	return (
		<TouchableOpacity style={[styles.specItem, { width }]} onPress={onPress} activeOpacity={0.75}>
			<AppIconTile size={68} radius={20} backgroundColor={tone.bg}>
				<AppPathIcon d={spec.icon} size={30} color={tone.ink} />
			</AppIconTile>
			<View style={styles.specTextCol}>
				<AppTypography style={styles.specLabel} numberOfLines={2}>
					{spec.label}
				</AppTypography>
				{!!spec.hint && (
					<AppTypography style={styles.specHint} numberOfLines={1}>
						{spec.hint}
					</AppTypography>
				)}
			</View>
		</TouchableOpacity>
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
	// Keep each speciality's original index so its tone doesn't change while filtering.
	const filtered = useMemo(
		() =>
			specialities.map((spec, index) => ({ spec, index })).filter(({ spec }) => !q || spec.haystack.includes(q)),
		[specialities, q]
	)

	const itemWidth = Math.floor((width - SIDE_PADDING * 2 - GRID_COL_GAP * 2) / 3)

	const handleBack = () => {
		navigation.navigate(ROUTES.MAIN.HOME as any)
	}

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

	const handleVideoConsult = () => {
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, { mode: 'video' })
	}

	const handleSeeAllDoctors = () => {
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH as any)
	}

	// Animated header values (design: expanded → compact)
	const headerPadBottom = progress.interpolate({ inputRange: [0, 1], outputRange: [20, 12] })
	const headGap = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 4] })
	const introMax = progress.interpolate({ inputRange: [0, 1], outputRange: [90, 0] })
	const introOpacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0, 0] })
	const miniOpacity = progress
	const miniShift = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })
	const shadowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] })
	const elevation = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 4] })

	const showSymptoms = !q
	const countLabel = loadingSpecs ? '' : `${specialities.length} specialities · `

	return (
		<View style={styles.container}>
			{/* HEADER (collapses on scroll) */}
			<Animated.View style={[styles.headerShadow, { shadowOpacity, elevation }]}>
				<Animated.View style={[styles.hero, { paddingTop: insets.top + 4, paddingBottom: headerPadBottom }]}>
					<View style={[styles.decorCircle, styles.decorCircleTop]} />
					<View style={[styles.decorCircle, styles.decorCircleBottom]} />

					<View style={styles.heroTopRow}>
						<TouchableOpacity
							style={styles.backButton}
							onPress={handleBack}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel="Back"
						>
							<AppIcon name="back" size={24} color={APP_COLORS.surface} />
						</TouchableOpacity>
						<Animated.View
							style={{ opacity: miniOpacity, transform: [{ translateY: miniShift }] }}
							accessibilityElementsHidden={!compact}
							importantForAccessibility={compact ? 'auto' : 'no-hide-descendants'}
						>
							<AppTypography style={styles.miniTitle}>Consult a doctor</AppTypography>
						</Animated.View>
					</View>

					<Animated.View
						style={[styles.heroIntro, { marginTop: headGap, maxHeight: introMax, opacity: introOpacity }]}
						accessibilityElementsHidden={compact}
						importantForAccessibility={compact ? 'no-hide-descendants' : 'auto'}
					>
						{!!firstName && <AppTypography style={styles.heroEyebrow}>HI {firstName}</AppTypography>}
						<AppTypography style={styles.heroTitle}>Consult a doctor</AppTypography>
						<AppTypography style={styles.heroSubtitle}>{countLabel}In-clinic or video</AppTypography>
					</Animated.View>

					<Animated.View style={[styles.searchBox, { marginTop: headGap }]}>
						<AppIcon name="search" size={20} color={APP_COLORS.inkMuted} />
						<TextInput
							value={query}
							onChangeText={setQuery}
							placeholder="Search speciality or symptom"
							placeholderTextColor={APP_COLORS.inkMuted}
							style={styles.searchInput}
							returnKeyType="search"
							autoCorrect={false}
							clearButtonMode="while-editing"
							accessibilityLabel="Search specialities or symptoms"
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
							<TouchableOpacity
								style={styles.videoBanner}
								onPress={handleVideoConsult}
								activeOpacity={0.85}
							>
								<View style={styles.videoBannerDecor} />
								<AppIconTile size={52} circle backgroundColor={TONES.sky.ink}>
									<AppIcon name="video" size={26} color={APP_COLORS.surface} />
								</AppIconTile>
								<View style={styles.videoBannerTextCol}>
									<AppTypography style={styles.videoBannerTitle}>
										See a doctor from home
									</AppTypography>
									<AppTypography style={styles.videoBannerSubtitle}>
										Video consults with doctors available today
									</AppTypography>
								</View>
								<AppIconTile size={36} circle backgroundColor={APP_COLORS.surface}>
									<AppIcon name="chevronRight" size={18} color={TONES.sky.ink} strokeWidth={2.4} />
								</AppIconTile>
							</TouchableOpacity>
						</View>

						{/* NOT SURE WHO TO SEE */}
						<View style={styles.symptomSection}>
							<AppTypography style={styles.sectionTitle}>
								Not sure who to see? Pick a symptom
							</AppTypography>
							<View style={styles.symptomRow}>
								{SYMPTOM_CHIPS.map((symptom, i) => {
									const tone = toneAt(i)
									return (
										<TouchableOpacity
											key={symptom}
											style={[styles.symptomChip, { backgroundColor: tone.bg }]}
											onPress={() => handleSymptomPress(symptom)}
											activeOpacity={0.8}
										>
											<View style={[styles.symptomDot, { backgroundColor: tone.ink }]} />
											<AppTypography style={styles.symptomChipText}>{symptom}</AppTypography>
										</TouchableOpacity>
									)
								})}
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
						{!loadingSpecs && (
							<AppTypography style={styles.sectionCount}>
								{filtered.length} of {specialities.length}
							</AppTypography>
						)}
					</View>

					{loadingSpecs ? (
						<View style={styles.loadingBox}>
							<ActivityIndicator color={APP_COLORS.primary} />
						</View>
					) : (
						<>
							<View style={styles.specGrid}>
								{filtered.map(({ spec, index }) => (
									<SpecialityGridItem
										key={spec.id}
										spec={spec}
										tone={toneAt(index)}
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
				<TouchableOpacity style={styles.seeAllRow} onPress={handleSeeAllDoctors} activeOpacity={0.8}>
					<AppIconTile radius={8} backgroundColor={TONES.sky.bg}>
						<AppIcon name="video" size={20} color={TONES.sky.ink} />
					</AppIconTile>
					<View style={styles.seeAllTextCol}>
						<AppTypography style={styles.seeAllTitle}>See all doctors</AppTypography>
						<AppTypography style={styles.seeAllSubtitle}>Browse every doctor near you</AppTypography>
					</View>
					<AppIcon name="chevronRight" size={20} color={APP_COLORS.inkMuted} />
				</TouchableOpacity>
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
	decorCircle: {
		position: 'absolute',
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	decorCircleTop: {
		right: -60,
		top: -70,
		width: 220,
		height: 220,
	},
	decorCircleBottom: {
		right: 90,
		bottom: -60,
		width: 110,
		height: 110,
		opacity: 0.6,
	},
	heroTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		height: 52,
	},
	backButton: {
		width: 44,
		height: 44,
		marginLeft: -10,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
	},
	miniTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: APP_COLORS.surface,
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
	heroSubtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.mint,
	},
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 48,
		paddingHorizontal: 12,
		backgroundColor: APP_COLORS.surface,
		borderRadius: 12,
	},
	searchInput: {
		flex: 1,
		minWidth: 0,
		height: 44,
		paddingVertical: 0,
		fontSize: 16,
		color: APP_COLORS.ink,
	},

	// Scroll content (design <main>: gap 8, padding-bottom 8)
	scrollContent: { paddingBottom: 8, gap: 8 },
	bannerSection: {
		backgroundColor: APP_COLORS.surface,
		paddingTop: 16,
		paddingHorizontal: 16,
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
	sectionCount: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},

	// Video banner
	videoBanner: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		borderRadius: 16,
		backgroundColor: TONES.sky.bg,
		overflow: 'hidden',
	},
	videoBannerDecor: {
		position: 'absolute',
		right: -24,
		bottom: -40,
		width: 120,
		height: 120,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.5,
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
		color: APP_COLORS.ink,
	},

	// Symptom chips — kept local: AppChip's `dot` is fixed at 6px, the design's is 8px.
	symptomRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	symptomChip: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 9999,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	symptomDot: {
		width: 8,
		height: 8,
		borderRadius: 9999,
	},
	symptomChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},

	// Speciality grid (3 cols, 16px row gap, 8px column gap)
	loadingBox: {
		paddingVertical: 24,
		alignItems: 'center',
	},
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
	specHint: {
		fontSize: 11,
		lineHeight: 14,
		color: APP_COLORS.inkMuted,
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
	seeAllRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		backgroundColor: APP_COLORS.surface,
	},
	seeAllTextCol: {
		flex: 1,
	},
	seeAllTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	seeAllSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})
