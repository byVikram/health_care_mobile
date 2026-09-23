import React from 'react'
import { Image, ImageSourcePropType, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AppBottomSheet from '../AppBottomSheet'
import { AppTypography } from '../AppTypography'
import { AppButton } from '../AppButton'
import { safeJsonParse } from '../../../utils/jsonUtils'
import { ServiceProcedureItem } from './ServiceCatalogCard'

interface ServiceDetailsSheetProps {
	visible: boolean
	service: ServiceProcedureItem | null
	onClose: () => void
	/** When omitted, the sheet is view-only and the footer action button is not rendered. */
	onAddToBooking?: (service: ServiceProcedureItem) => void
	/** Set to `false` to hide the "Patient Reviews" section entirely â€” for
	 *  callers (e.g. Laboratory) whose services have no real rating/review
	 *  data, rather than showing simulated reviews for them. Defaults to
	 *  `true` so every existing caller (Nursing, Physiotherapy, ...) is
	 *  unaffected. */
	showReviews?: boolean
	/** Resolves a raw `image_url`/`imageUrl`/`image` string into a displayable
	 *  `ImageSourcePropType` (e.g. a domain-specific bundled-asset registry).
	 *  Kept out of this shared component so `common/booking` has no
	 *  dependency on any feature folder â€” pass your feature's own resolver
	 *  (e.g. Ancillary's `getAncillaryImageSource`) to reproduce that
	 *  feature's current image behavior. When omitted (or when it returns
	 *  nothing and `service.imageSource` is also unset), a generic
	 *  placeholder icon is shown instead. */
	resolveImageSource?: (raw?: string | null) => ImageSourcePropType | undefined
	actionButtonText?: string
}

interface ReviewItem {
	name: string
	rating: string
	time: string
	text: string
}

const MOCK_REVIEWS_POOL: Record<string, ReviewItem[]> = {
	'gen-inj': [
		{
			name: 'Pooja K.',
			rating: '5.0',
			time: '2 days ago',
			text: 'Nurse was extremely gentle and professional with the injection. Arrived on time!',
		},
		{
			name: 'Rohan S.',
			rating: '4.9',
			time: '1 week ago',
			text: 'Zero pain, clean disposal kit used. Very comforting bedside manner.',
		},
	],
	'gen-wound': [
		{
			name: 'Amit G.',
			rating: '5.0',
			time: 'Yesterday',
			text: 'Sterile surgical dressing done with great care. Saved us a clinic visit.',
		},
		{
			name: 'Meera P.',
			rating: '4.8',
			time: '3 days ago',
			text: 'Very thorough diabetic foot ulcer care. Highly recommend.',
		},
	],
	'hc-bath': [
		{
			name: 'Sunita M.',
			rating: '5.0',
			time: '3 days ago',
			text: 'Caregiver was very patient and gentle with my elderly mother.',
		},
		{
			name: 'Ramesh T.',
			rating: '4.9',
			time: '1 week ago',
			text: 'Excellent hygiene assistance, very polite and punctual.',
		},
	],
}

const DEFAULT_REVIEWS: ReviewItem[] = [
	{
		name: 'Priya Sharma',
		rating: '5.0',
		time: '2 days ago',
		text: 'Caregiver arrived right on time and provided excellent, respectful care.',
	},
	{
		name: 'Anjali V.',
		rating: '4.8',
		time: '1 week ago',
		text: 'Highly satisfied with the treatment. Safe and hygienic protocols were followed.',
	},
]

const parseWhatsIncluded = (raw: any): string[] => {
	if (!raw) return []
	if (Array.isArray(raw)) {
		return raw.map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim())).filter(Boolean)
	}
	if (typeof raw === 'string') {
		const trimmed = raw.trim()
		if (!trimmed) return []
		const parsed = safeJsonParse<any>(trimmed)
		if (Array.isArray(parsed)) {
			return parsed
				.map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
				.filter(Boolean)
		}
		if (trimmed.includes('\n')) {
			return trimmed
				.split('\n')
				.map((line) => line.trim().replace(/^[-â€¢*]\s*/, ''))
				.filter(Boolean)
		}
		return [trimmed]
	}
	return []
}

export const ServiceDetailsSheet: React.FC<ServiceDetailsSheetProps> = ({
	visible,
	service,
	onClose,
	onAddToBooking,
	showReviews = true,
	resolveImageSource,
	actionButtonText = 'Add to Booking',
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	if (!service) return null

	const handleAdd = () => {
		onAddToBooking?.(service)
		onClose()
	}

	const aboutText = service.about_service?.trim() || service.aboutService?.trim() || service.description?.trim() || ''

	const includedList = parseWhatsIncluded(service.whats_included ?? service.whatsIncluded)

	// Select matching reviews or fallback
	const reviewsList = MOCK_REVIEWS_POOL[service.id] || DEFAULT_REVIEWS

	const resolvedImageSource =
		service.imageSource || resolveImageSource?.(service.image_url || service.imageUrl || service.image)

	return (
		<AppBottomSheet
			visible={visible}
			title="Service Details"
			onClose={onClose}
			maxHeightRatio={0.85}
			footer={
				onAddToBooking ? (
					<View style={[styles.ctaContainer, isTablet && styles.containerTablet]}>
						<AppButton variant="primary" formAction style={styles.addBtn} onPress={handleAdd}>
							{actionButtonText}
						</AppButton>
					</View>
				) : undefined
			}
		>
			<View style={[styles.mainWrapper, isTablet && styles.containerTablet]}>
				{/* 1. Service Image */}
				{resolvedImageSource ? (
					<Image
						source={resolvedImageSource}
						style={[styles.image, isTablet && styles.imageTablet]}
						resizeMode="cover"
					/>
				) : (
					<View style={[styles.image, styles.imageFallback, isTablet && styles.imageTablet]}>
						<MaterialCommunityIcons name="flask-outline" size={32} color="#0C7C7C" />
					</View>
				)}

				{/* 2. Service Name */}
				<AppTypography variant="h2" style={styles.title}>
					{service.title || (service as any).label || (service as any).name || ''}
				</AppTypography>

				{/* 3. Price Summary Pill (Only if non-empty price exists) */}
				{Boolean(service.price && service.price.trim()) && (
					<View style={styles.infoPillRow}>
						<View style={styles.infoPill}>
							<Ionicons name="pricetag-outline" size={16} color="#1F5F68" />
							<AppTypography variant="caption" style={styles.infoPillText}>
								{service.price}
							</AppTypography>
						</View>
					</View>
				)}

				{/* 4. About Service */}
				{aboutText ? (
					<View style={styles.section}>
						<AppTypography variant="h4" style={styles.sectionHeading}>
							About Service
						</AppTypography>
						<AppTypography variant="body" style={styles.descriptionText}>
							{aboutText}
						</AppTypography>
					</View>
				) : null}

				{/* 5. What's Included */}
				{includedList.length > 0 ? (
					<View style={styles.section}>
						<AppTypography variant="h4" style={styles.sectionHeading}>
							What's Included
						</AppTypography>
						<View style={styles.inclusionList}>
							{includedList.map((item, index) => (
								<View key={index} style={styles.inclusionItem}>
									<Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
									<AppTypography variant="caption" style={styles.inclusionText}>
										{item}
									</AppTypography>
								</View>
							))}
						</View>
					</View>
				) : null}

				{/* 6. Patient Reviews (omitted for callers with no real review data) */}
				{showReviews ? (
					<View style={styles.section}>
						<View style={styles.reviewsHeaderRow}>
							<AppTypography variant="h4" style={styles.sectionHeading}>
								Patient Reviews
							</AppTypography>
							<View style={styles.starBadge}>
								<Ionicons name="star" size={12} color="#F59E0B" />
								<AppTypography variant="caption" style={styles.starText}>
									4.8 Rating
								</AppTypography>
							</View>
						</View>

						<View style={styles.reviewsList}>
							{reviewsList.map((review, index) => (
								<View key={index} style={styles.reviewCard}>
									<View style={styles.reviewHeader}>
										<View style={styles.avatarCircle}>
											<AppTypography variant="caption" style={styles.avatarLetter}>
												{review.name.charAt(0)}
											</AppTypography>
										</View>
										<View style={styles.reviewUserCol}>
											<View style={styles.nameStarRow}>
												<AppTypography variant="h4" style={styles.reviewName}>
													{review.name}
												</AppTypography>
												<View style={styles.miniStars}>
													<Ionicons name="star" size={10} color="#F59E0B" />
													<AppTypography variant="caption" style={styles.miniStarText}>
														{review.rating}
													</AppTypography>
												</View>
											</View>
											<AppTypography variant="caption" style={styles.reviewTime}>
												{review.time}
											</AppTypography>
										</View>
									</View>
									<AppTypography variant="caption" style={styles.reviewContent}>
										"{review.text}"
									</AppTypography>
								</View>
							))}
						</View>
					</View>
				) : null}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	mainWrapper: {
		width: '100%',
		paddingBottom: 8,
	},
	containerTablet: {
		maxWidth: 640,
		alignSelf: 'center',
		width: '100%',
	},
	image: {
		width: '100%',
		height: 140,
		borderRadius: 14,
		marginBottom: 14,
		backgroundColor: '#F1F5F9',
	},
	imageFallback: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageTablet: {
		height: 180,
		borderRadius: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 12,
		lineHeight: 26,
	},
	infoPillRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 16,
	},
	infoPill: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 6,
		borderWidth: 1,
		borderColor: '#D4EFEF',
	},
	infoPillText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1F5F68',
	},
	section: {
		marginBottom: 18,
	},
	sectionHeading: {
		fontSize: 14,
		fontWeight: '800',
		color: '#1A2E35',
		marginBottom: 8,
	},
	descriptionText: {
		fontSize: 13,
		color: '#334155',
		lineHeight: 18,
		marginBottom: 6,
	},
	inclusionList: {
		gap: 8,
	},
	inclusionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	inclusionText: {
		fontSize: 12,
		color: '#475569',
		fontWeight: '500',
		flex: 1,
	},
	reviewsHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	starBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF8E1',
		borderWidth: 1,
		borderColor: '#FFD54F',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
		gap: 4,
	},
	starText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#B7791F',
	},
	reviewsList: {
		gap: 10,
	},
	reviewCard: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#ECEFF1',
	},
	reviewHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	avatarCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#E6F3F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarLetter: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F5F68',
	},
	reviewUserCol: {
		flex: 1,
		marginLeft: 10,
	},
	nameStarRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	reviewName: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1A2E35',
	},
	miniStars: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	miniStarText: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#B7791F',
	},
	reviewTime: {
		fontSize: 10,
		color: '#78909C',
		marginTop: 1,
	},
	reviewContent: {
		fontSize: 11.5,
		color: '#455A64',
		lineHeight: 16,
		fontStyle: 'italic',
	},
	ctaContainer: {
		width: '100%',
		paddingTop: 4,
		paddingBottom: 4,
	},
	addBtn: {
		width: '100%',
		borderRadius: 14,
	},
})

