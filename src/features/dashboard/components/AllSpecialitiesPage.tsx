import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Image,
	ImageSourcePropType,
	Platform,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import { getSpecialities } from '../../doctor/doctorService'
import { SpecialityItem } from '../../../types/speciality'
import { ROUTES } from '../../../navigation/routes'
import { AppTypography } from '../../../components/common'

import dentistImage from '../../../assets/specialties/dentist.png'
import gynoCologistImage from '../../../assets/specialties/gynocologist.png'
import nutritionImage from '../../../assets/specialties/nutrition.png'
import physiotherapistImage from '../../../assets/specialties/physiotherapist.png'
import dermatologistImage from '../../../assets/specialties/dermatologist.png'
import neurologistImage from '../../../assets/specialties/neurologist.png'
import pediatricianImage from '../../../assets/specialties/pediatrician .png'
import entImage from '../../../assets/specialties/ent.png'
import orthopedicsImage from '../../../assets/specialties/orthopedics.png'
import opthalmologistImage from '../../../assets/specialties/ophthalmologist.png'
import psychiatristImage from '../../../assets/specialties/psychiatrist.png'
import nephrologistImage from '../../../assets/specialties/nephrologist.png'
import gastroenterologistImage from '../../../assets/specialties/gastroenterologist.png'
import urologistImage from '../../../assets/specialties/urologist.png'
import pulmonologistImage from '../../../assets/specialties/pulmonologist.png'
import oncologistImage from '../../../assets/specialties/oncologist.png'
import rheumatologistImage from '../../../assets/specialties/rheumatologist.png'
import endocrinologistImage from '../../../assets/specialties/endocrinologist.png'

const COLORS = {
	background: '#FFFFFF',
	searchBg: '#F5F7FB',
	searchIcon: '#7F90AA',
	textPrimary: '#050B18',
	textSecondary: '#5F7394',
	error: '#C62828',
	errorBg: '#FDECEC',
	primary: '#1976D2',
	skeletonBase: '#E8EDF4',
	skeletonLine: '#F1F4F8',
}

const FALLBACK_IMAGE: ImageSourcePropType = {
	uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&h=320&fit=crop&auto=format',
}

type Navigation = ReturnType<typeof useNavigation<any>>

interface SpecialityConfig {
	image: ImageSourcePropType
	description: string
}

interface EnrichedSpeciality extends SpecialityItem {
	image: ImageSourcePropType
	description: string
}

const SPECIALITY_CONFIGS: Record<string, SpecialityConfig> = {
	heart: {
		image: FALLBACK_IMAGE,
		description: 'Heart and blood vessel specialist care',
	},
	skin: {
		image: dermatologistImage,
		description: 'Skin, hair, nails and cosmetic treatments',
	},
	bone: {
		image: orthopedicsImage,
		description: 'Bone, joint, spine and musculoskeletal care',
	},
	brain: {
		image: neurologistImage,
		description: 'Brain, nerves, spine and neurological disorders',
	},
	stethoscope: {
		image: FALLBACK_IMAGE,
		description: 'General health checkup and primary care',
	},
	dentistry: {
		image: dentistImage,
		description: 'Dental care, oral hygiene and teeth treatment',
	},
	gynecology: {
		image: gynoCologistImage,
		description: "Women's health, pregnancy and fertility care",
	},
	nutrition: {
		image: nutritionImage,
		description: 'Diet planning, healthy eating and nutrition guidance',
	},
	physiotherapy: {
		image: physiotherapistImage,
		description: 'Pain relief, movement rehab and physical therapy',
	},
	pediatrics: {
		image: pediatricianImage,
		description: 'Child health, growth and immunization care',
	},
	ophthalmology: {
		image: opthalmologistImage,
		description: 'Eye care, vision and eye disease treatment',
	},
	ent: {
		image: entImage,
		description: 'Ear, nose, throat and hearing care',
	},
	psychiatry: {
		image: psychiatristImage,
		description: 'Mental health, stress, anxiety and emotional well-being',
	},
	urology: {
		image: urologistImage,
		description: "Urinary tract, kidney and men's health care",
	},
	gastroenterology: {
		image: gastroenterologistImage,
		description: 'Digestive system, stomach, liver and gut health',
	},
	pulmonology: {
		image: pulmonologistImage,
		description: 'Lung and respiratory disorders treatment',
	},
	endocrinology: {
		image: endocrinologistImage,
		description: 'Hormone disorders, diabetes and thyroid care',
	},
	oncology: {
		image: oncologistImage,
		description: 'Cancer care, treatment and support',
	},
	nephrology: {
		image: nephrologistImage,
		description: 'Kidney care, dialysis and renal diseases',
	},
	rheumatology: {
		image: rheumatologistImage,
		description: 'Arthritis, joint pain and autoimmune disorders',
	},
}

function enrichSpeciality(speciality: SpecialityItem): EnrichedSpeciality {
	const config = SPECIALITY_CONFIGS[speciality.icon_key]

	return {
		...speciality,
		image: config?.image ?? FALLBACK_IMAGE,
		description: config?.description ?? `Specialised care for ${speciality.label.toLowerCase()}`,
	}
}

function getLayout(width: number) {
	const isTablet = width >= 600
	const columns = width >= 900 ? 4 : isTablet ? 3 : 2
	const horizontalPadding = isTablet ? 32 : 20
	const columnGap = isTablet ? 20 : 14
	const rowGap = isTablet ? 28 : 22
	const cardWidth = (width - horizontalPadding * 2 - columnGap * (columns - 1)) / columns

	return {
		columns,
		horizontalPadding,
		columnGap,
		rowGap,
		cardWidth,
		imageHeight: isTablet ? Math.min(cardWidth * 0.64, 140) : Math.max(cardWidth * 0.64, 78),
	}
}

function SearchBar({
	value,
	onChangeText,
	horizontalPadding,
}: {
	value: string
	onChangeText: (text: string) => void
	horizontalPadding: number
}) {
	return (
		<View style={[styles.searchWrap, { paddingHorizontal: horizontalPadding }]}>
			<View style={styles.searchBox}>
				<MaterialCommunityIcons name="magnify" size={18} color={COLORS.searchIcon} />
				{!value ? (
					<AppTypography variant="caption" style={styles.searchPlaceholder} pointerEvents="none">
						Search for treatments or doctors...
					</AppTypography>
				) : null}
				<TextInput
					value={value}
					onChangeText={onChangeText}
					style={styles.searchInput}
					returnKeyType="search"
					clearButtonMode="while-editing"
				/>
			</View>
		</View>
	)
}

function SpecialityCard({
	item,
	width,
	imageHeight,
	onPress,
}: {
	item: EnrichedSpeciality
	width: number
	imageHeight: number
	onPress: () => void
}) {
	return (
		<TouchableOpacity style={[styles.card, { width }]} activeOpacity={0.82} onPress={onPress}>
			<Image source={item.image} style={[styles.cardImage, { height: imageHeight }]} resizeMode="cover" />
			<AppTypography variant="caption" style={styles.cardTitle} numberOfLines={1}>
				{item.label}
			</AppTypography>
			<AppTypography variant="caption" style={styles.cardDescription} numberOfLines={2}>
				{item.description}
			</AppTypography>
		</TouchableOpacity>
	)
}

function SpecialitySkeleton({ width, imageHeight }: { width: number; imageHeight: number }) {
	return (
		<View style={[styles.card, { width }]}>
			<View style={[styles.cardImage, styles.skeletonImage, { height: imageHeight }]} />
			<View style={[styles.skeletonLine, styles.skeletonTitle]} />
			<View style={[styles.skeletonLine, styles.skeletonDesc]} />
			<View style={[styles.skeletonLine, styles.skeletonDescShort]} />
		</View>
	)
}

function ErrorBanner({
	message,
	onRetry,
	horizontalPadding,
}: {
	message: string
	onRetry: () => void
	horizontalPadding: number
}) {
	return (
		<View style={[styles.errorBanner, { marginHorizontal: horizontalPadding }]}>
			<AppTypography variant="caption" style={styles.errorText}>
				{message}
			</AppTypography>
			<TouchableOpacity onPress={onRetry} activeOpacity={0.75}>
				<AppTypography variant="caption" style={styles.retryText}>
					Retry
				</AppTypography>
			</TouchableOpacity>
		</View>
	)
}

export default function AllSpecialitiesPage() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const layout = useMemo(() => getLayout(width), [width])

	const [specialities, setSpecialities] = useState<EnrichedSpeciality[]>([])
	const [apiLoading, setApiLoading] = useState(true)
	const [apiError, setApiError] = useState<string | null>(null)
	const [search, setSearch] = useState('')

	const loadSpecialities = useCallback(async (mountedRef?: { current: boolean }) => {
		try {
			setApiLoading(true)
			const response = await getSpecialities()
			if (mountedRef && !mountedRef.current) return

			setSpecialities(response.data.map(enrichSpeciality))
			setApiError(null)
		} catch (error) {
			if (mountedRef && !mountedRef.current) return
			setApiError('Failed to load specialities. Please try again.')
		} finally {
			if (!mountedRef || mountedRef.current) setApiLoading(false)
		}
	}, [])

	useEffect(() => {
		const mountedRef = { current: true }
		void loadSpecialities(mountedRef)

		return () => {
			mountedRef.current = false
		}
	}, [loadSpecialities])

	const filteredSpecialities = useMemo(() => {
		const term = search.trim().toLowerCase()
		if (!term) return specialities

		return specialities.filter(
			(speciality) =>
				speciality.label.toLowerCase().includes(term) ||
				speciality.description.toLowerCase().includes(term),
		)
	}, [search, specialities])

	const handleRetry = useCallback(() => {
		setSpecialities([])
		setApiError(null)
		void loadSpecialities()
	}, [loadSpecialities])

	const handlePressSpeciality = useCallback(
		(item: EnrichedSpeciality) => {
			;(navigation as Navigation).navigate(ROUTES.STACK.DOCTOR_SEARCH, {
				specialityId: String(item.id),
				specialityName: item.label,
			})
		},
		[navigation],
	)

	const renderItem = useCallback(
		({ item }: { item: EnrichedSpeciality }) => (
			<SpecialityCard
				item={item}
				width={layout.cardWidth}
				imageHeight={layout.imageHeight}
				onPress={() => handlePressSpeciality(item)}
			/>
		),
		[handlePressSpeciality, layout.cardWidth, layout.imageHeight],
	)

	const renderSkeleton = () => (
		<View
			style={[
				styles.grid,
				{
					columnGap: layout.columnGap,
					rowGap: layout.rowGap,
					paddingHorizontal: layout.horizontalPadding,
				},
			]}
		>
			{Array.from({ length: 12 }, (_, index) => (
				<SpecialitySkeleton
					key={`speciality-skeleton-${index}`}
					width={layout.cardWidth}
					imageHeight={layout.imageHeight}
				/>
			))}
		</View>
	)

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

			<SearchBar
				value={search}
				onChangeText={setSearch}
				horizontalPadding={layout.horizontalPadding}
			/>

			{apiError ? (
				<ErrorBanner
					message={apiError}
					onRetry={handleRetry}
					horizontalPadding={layout.horizontalPadding}
				/>
			) : null}

			{apiLoading ? (
				renderSkeleton()
			) : filteredSpecialities.length === 0 ? (
				<View style={styles.emptyState}>
					<AppTypography variant="caption" style={styles.emptyText}>
						{search ? `No specialities match "${search}"` : 'No specialities available'}
					</AppTypography>
				</View>
			) : (
				<FlatList
					data={filteredSpecialities}
					key={layout.columns}
					numColumns={layout.columns}
					renderItem={renderItem}
					keyExtractor={(item) => String(item.id)}
					columnWrapperStyle={layout.columns > 1 ? { gap: layout.columnGap } : undefined}
					ItemSeparatorComponent={() => <View style={{ height: layout.rowGap }} />}
					contentContainerStyle={[
						styles.listContent,
						{ paddingHorizontal: layout.horizontalPadding },
					]}
					showsVerticalScrollIndicator={false}
					removeClippedSubviews
					initialNumToRender={12}
					maxToRenderPerBatch={12}
					windowSize={7}
					ListFooterComponent={<View style={styles.listFooter} />}
				/>
			)}

			{apiLoading && <ActivityIndicator color={COLORS.primary} style={styles.loadingIndicator} />}
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	searchWrap: {
		paddingTop: Platform.OS === 'android' ? 18 : 14,
		paddingBottom: 30,
		backgroundColor: COLORS.background,
	},
	searchBox: {
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderRadius: 14,
		backgroundColor: COLORS.searchBg,
		paddingHorizontal: 16,
	},
	searchPlaceholder: {
		position: 'absolute',
		left: 44,
		right: 16,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500',
		color: COLORS.textSecondary,
	},
	searchInput: {
		flex: 1,
		height: '100%',
		padding: 0,
		margin: 0,
		fontSize: 13,
		fontWeight: '500',
		color: COLORS.textPrimary,
	},
	listContent: {
		paddingBottom: 18,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingBottom: 18,
	},
	card: {
		backgroundColor: COLORS.background,
	},
	cardImage: {
		width: '100%',
		borderRadius: 8,
		backgroundColor: COLORS.skeletonBase,
	},
	cardTitle: {
		marginTop: 8,
		fontSize: 11,
		fontWeight: '800',
		lineHeight: 14,
		color: COLORS.textPrimary,
	},
	cardDescription: {
		marginTop: 4,
		fontSize: 9,
		fontWeight: '500',
		lineHeight: 14,
		color: COLORS.textSecondary,
	},
	skeletonImage: {
		backgroundColor: COLORS.skeletonBase,
	},
	skeletonLine: {
		borderRadius: 4,
		backgroundColor: COLORS.skeletonLine,
	},
	skeletonTitle: {
		width: '58%',
		height: 10,
		marginTop: 9,
	},
	skeletonDesc: {
		width: '88%',
		height: 8,
		marginTop: 7,
	},
	skeletonDescShort: {
		width: '66%',
		height: 8,
		marginTop: 5,
	},
	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 14,
		borderRadius: 8,
		borderLeftWidth: 3,
		borderLeftColor: COLORS.error,
		backgroundColor: COLORS.errorBg,
		paddingHorizontal: 10,
		paddingVertical: 9,
	},
	errorText: {
		flex: 1,
		fontSize: 11,
		lineHeight: 16,
		color: COLORS.error,
	},
	retryText: {
		marginLeft: 10,
		fontSize: 11,
		fontWeight: '800',
		color: COLORS.primary,
	},
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 28,
	},
	emptyText: {
		fontSize: 13,
		lineHeight: 19,
		textAlign: 'center',
		color: COLORS.textSecondary,
	},
	loadingIndicator: {
		position: 'absolute',
		alignSelf: 'center',
		bottom: 16,
	},
	listFooter: {
		height: 10,
	},
})
