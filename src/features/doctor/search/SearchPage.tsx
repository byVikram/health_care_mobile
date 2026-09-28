import React, { useMemo, useState, useEffect } from 'react'
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography, AppInput } from '../../../components/common'
import LocationSelector from '../../../components/common/LocationSelector'
import { useAuth } from '../../../context/AuthContext'
import { getSpecialities } from '../doctorService'
import { ROUTES } from '../../../navigation/routes'
import type { NavigationProp } from '@react-navigation/native'
import type { AppStackParamList } from '../../../navigation/types'

// ─── Design tokens (matches the "Consult a doctor" HTML design) ─────────────
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const PAGE_BG = '#F5F8F8'
const HERO_BG = '#12373E'
const HERO_DECOR = '#2B6F71'
const HERO_EYEBROW = '#9FD3D1'
const HERO_SUBTLE = '#E3EFEF'

type Tone = { bg: string; ink: string }
const TONES: Tone[] = [
	{ bg: '#E3EFEF', ink: '#2B6F71' }, // mint
	{ bg: '#DDEBFA', ink: '#2463A8' }, // sky
	{ bg: '#ECE6FA', ink: '#6A4BB5' }, // lilac
	{ bg: '#FDE8DC', ink: '#B4532A' }, // peach
	{ bg: '#FBEFD5', ink: '#8A5300' }, // sand
]

const SYMPTOM_CHIPS = ['Fever', 'Cough', 'Headache', 'Back pain', 'Skin rash', 'Stomach pain', 'Anxiety', 'Joint pain']

// ─── Icon map (extend as needed) ─────────────────────────────────────────────
const SPECIALITY_ICON_MAP: Record<string, string> = {
	all: 'format-list-bulleted',
	'general physician': 'stethoscope',
	dentistry: 'tooth-outline',
	dentist: 'tooth-outline',
	cardiology: 'heart-pulse',
	cardiologist: 'heart-pulse',
	orthopedic: 'bone',
	orthopaedic: 'bone',
	neurology: 'brain',
	neurologist: 'brain',
	kidney: 'kidney',
	nephrologist: 'kidney',
	diabetologist: 'water',
	diabetology: 'water',
	dermatologist: 'creation',
	dermatology: 'creation',
	paediatrician: 'baby-face-outline',
	pediatrician: 'baby-face-outline',
	gynaecologist: 'human-female',
	gynecologist: 'human-female',
	ent: 'ear-hearing',
	psychiatrist: 'head-heart-outline',
	gastroenterologist: 'stomach',
	pulmonologist: 'lungs',
	ophthalmologist: 'eye-outline',
	physiotherapist: 'walk',
}

function resolveSpecialityIcon(label: string): string {
	const key = label.toLowerCase().trim()
	if (SPECIALITY_ICON_MAP[key]) return SPECIALITY_ICON_MAP[key]
	for (const [k, v] of Object.entries(SPECIALITY_ICON_MAP)) {
		if (key.includes(k)) return v
	}
	if (key.includes('dent')) return 'tooth-outline'
	return 'medical-bag'
}

type Speciality = {
	id: string
	label: string
	icon: string
}

// ─── Speciality Grid Item ─────────────────────────────────────────────────────
function SpecialityGridItem({ spec, tone, onPress }: { spec: Speciality; tone: Tone; onPress: () => void }) {
	return (
		<TouchableOpacity style={styles.specItem} onPress={onPress} activeOpacity={0.75}>
			<View style={[styles.specIconBox, { backgroundColor: tone.bg }]}>
				<MaterialCommunityIcons name={spec.icon as any} size={30} color={tone.ink} />
			</View>
			<AppTypography style={styles.specLabel} numberOfLines={2}>
				{spec.label}
			</AppTypography>
		</TouchableOpacity>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SearchPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { user } = useAuth()

	const [specialities, setSpecialities] = useState<Speciality[]>([])
	const [loadingSpecs, setLoadingSpecs] = useState(true)

	useEffect(() => {
		const loadSpecialities = async () => {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) {
					const specMap: Speciality[] = res.data.map((s) => ({
						id: s.id,
						label: s.label,
						icon: resolveSpecialityIcon(s.label),
					}))
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

	return (
		<View style={styles.container}>
			{/* HERO HEADER */}
			<View style={styles.hero}>
				<View style={[styles.decorCircle, styles.decorCircleTop]} />
				<View style={[styles.decorCircle, styles.decorCircleBottom]} />

				<View style={styles.heroTopRow}>
					<TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
						<MaterialCommunityIcons name="chevron-left" size={26} color="#FFFFFF" />
					</TouchableOpacity>
				</View>

				<View style={styles.heroIntro}>
					{!!firstName && <AppTypography style={styles.heroEyebrow}>HI {firstName}</AppTypography>}
					<AppTypography style={styles.heroTitle}>Consult a doctor</AppTypography>
					<View style={styles.heroSubRow}>
						<AppTypography style={styles.heroSubtitle}>
							{loadingSpecs ? '' : `${specialities.length} specialities`} · In-clinic or video
						</AppTypography>
					</View>
					<LocationSelector color={HERO_SUBTLE} />
				</View>

				<TouchableOpacity
					style={styles.searchInputWrap}
					activeOpacity={0.8}
					onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH as any)}
				>
					<AppInput
						isSearch
						value=""
						onChangeText={() => {}}
						placeholder="Search speciality or symptom"
						placeholderTextColor="#5B6B6E"
						containerStyle={styles.searchInputContainer}
						style={styles.searchInput}
						contentStyle={styles.searchInputContent}
						outlineStyle={styles.searchInputOutline}
						outlineColor="transparent"
						activeOutlineColor="transparent"
						textColor={INK}
						editable={false}
						pointerEvents="none"
						noMargin
					/>
				</TouchableOpacity>
			</View>

			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				{/* SEE A DOCTOR FROM HOME */}
				<View style={styles.section}>
					<TouchableOpacity style={styles.videoBanner} onPress={handleVideoConsult} activeOpacity={0.85}>
						<View style={styles.videoBannerDecor} />
						<View style={styles.videoIconCircle}>
							<MaterialCommunityIcons name="video-outline" size={26} color="#FFFFFF" />
						</View>
						<View style={styles.videoBannerTextCol}>
							<AppTypography style={styles.videoBannerTitle}>See a doctor from home</AppTypography>
							<AppTypography style={styles.videoBannerSubtitle}>
								Video consults with doctors available today
							</AppTypography>
						</View>
						<View style={styles.videoBannerChevron}>
							<MaterialCommunityIcons name="chevron-right" size={18} color="#2463A8" />
						</View>
					</TouchableOpacity>
				</View>

				{/* NOT SURE WHO TO SEE */}
				<View style={styles.section}>
					<AppTypography style={styles.sectionTitle}>Not sure who to see? Pick a symptom</AppTypography>
					<View style={styles.symptomRow}>
						{SYMPTOM_CHIPS.map((symptom, i) => {
							const tone = TONES[i % TONES.length]
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

				{/* ALL SPECIALITIES */}
				<View style={styles.section}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography style={styles.sectionTitle}>All specialities</AppTypography>
						{!loadingSpecs && (
							<AppTypography style={styles.sectionCount}>
								{specialities.length} of {specialities.length}
							</AppTypography>
						)}
					</View>

					{loadingSpecs ? (
						<View style={styles.loadingBox}>
							<ActivityIndicator color={HERO_DECOR} />
						</View>
					) : (
						<View style={styles.specGrid}>
							{specialities.map((spec, i) => (
								<SpecialityGridItem
									key={spec.id}
									spec={spec}
									tone={TONES[i % TONES.length]}
									onPress={() => handleSpecialityPress(spec)}
								/>
							))}
						</View>
					)}
				</View>

				{/* SEE ALL DOCTORS */}
				<TouchableOpacity style={styles.seeAllRow} onPress={handleSeeAllDoctors} activeOpacity={0.8}>
					<View style={styles.seeAllIconBox}>
						<MaterialCommunityIcons name="video-outline" size={20} color="#2463A8" />
					</View>
					<View style={styles.seeAllTextCol}>
						<AppTypography style={styles.seeAllTitle}>See all doctors</AppTypography>
						<AppTypography style={styles.seeAllSubtitle}>Browse every doctor near you</AppTypography>
					</View>
					<MaterialCommunityIcons name="chevron-right" size={20} color={INK_MUTED} />
				</TouchableOpacity>
			</ScrollView>
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: PAGE_BG },

	// Hero header
	hero: {
		backgroundColor: HERO_BG,
		paddingHorizontal: 16,
		paddingTop: 4,
		paddingBottom: 20,
		gap: 12,
		overflow: 'hidden',
	},
	decorCircle: {
		position: 'absolute',
		borderRadius: 9999,
		backgroundColor: HERO_DECOR,
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
		height: 40,
	},
	backButton: {
		width: 44,
		height: 44,
		marginLeft: -10,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
	},
	heroIntro: {
		gap: 4,
	},
	heroEyebrow: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.72,
		color: HERO_EYEBROW,
	},
	heroTitle: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: '700',
		letterSpacing: -0.26,
		color: '#FFFFFF',
	},
	heroSubRow: {
		flexDirection: 'row',
	},
	heroSubtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: HERO_SUBTLE,
	},
	searchInputWrap: {
		marginTop: 4,
	},
	searchInputContainer: {
		width: '100%',
	},
	searchInput: {
		backgroundColor: '#FFFFFF',
	},
	searchInputContent: {
		height: 48,
		minHeight: 48,
		paddingVertical: 0,
		fontSize: 16,
	},
	searchInputOutline: {
		borderRadius: 12,
		borderWidth: 0,
	},

	// Scroll content
	scrollContent: { paddingBottom: 40 },
	section: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		marginBottom: 8,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: INK,
		marginBottom: 10,
	},
	sectionCount: {
		fontSize: 12,
		lineHeight: 16,
		color: INK_MUTED,
	},

	// Video banner
	videoBanner: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		borderRadius: 16,
		backgroundColor: '#DDEBFA',
		overflow: 'hidden',
	},
	videoBannerDecor: {
		position: 'absolute',
		right: -24,
		bottom: -40,
		width: 120,
		height: 120,
		borderRadius: 9999,
		backgroundColor: '#FFFFFF',
		opacity: 0.5,
	},
	videoIconCircle: {
		width: 52,
		height: 52,
		borderRadius: 9999,
		backgroundColor: '#2463A8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	videoBannerTextCol: {
		flex: 1,
		gap: 2,
	},
	videoBannerTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '700',
		color: INK,
	},
	videoBannerSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: INK,
	},
	videoBannerChevron: {
		width: 36,
		height: 36,
		borderRadius: 9999,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},

	// Symptom chips
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
		color: INK,
	},

	// Speciality grid
	loadingBox: {
		paddingVertical: 24,
		alignItems: 'center',
	},
	specGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -8,
	},
	specItem: {
		width: '33.33%',
		paddingHorizontal: 8,
		marginBottom: 16,
		alignItems: 'center',
		gap: 8,
	},
	specIconBox: {
		width: 68,
		height: 68,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	specLabel: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: INK,
		textAlign: 'center',
	},

	// See all doctors row
	seeAllRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		backgroundColor: '#FFFFFF',
	},
	seeAllIconBox: {
		width: 40,
		height: 40,
		borderRadius: 8,
		backgroundColor: '#DDEBFA',
		alignItems: 'center',
		justifyContent: 'center',
	},
	seeAllTextCol: {
		flex: 1,
		gap: 2,
	},
	seeAllTitle: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '600',
		color: INK,
	},
	seeAllSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
	},
})
