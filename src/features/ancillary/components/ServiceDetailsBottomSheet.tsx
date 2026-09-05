import React from 'react'
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AppBottomSheet from '../../../components/common/AppBottomSheet'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'
import { ServiceProcedureItem } from './AllServiceCard'

interface ServiceDetailsBottomSheetProps {
	visible: boolean
	service: ServiceProcedureItem | null
	onClose: () => void
	onAddToBooking: (service: ServiceProcedureItem) => void
}

interface ReviewItem {
	name: string
	rating: string
	time: string
	text: string
}

// Simulated reviews database mapped by service IDs or fallback reviews
const MOCK_REVIEWS_POOL: Record<string, ReviewItem[]> = {
	'gen1': [
		{ name: 'Rohan D.', rating: '5.0', time: '2 days ago', text: 'Highly professional wound care. The nurse disinfected everything before start.' },
		{ name: 'Sneha P.', rating: '4.8', time: '1 week ago', text: 'The dressing was done with extreme care. Highly recommend this service for diabetic patients.' }
	],
	'gen2': [
		{ name: 'Amit K.', rating: '5.0', time: '3 days ago', text: 'Prompt IV administration. Nurse was very skilled and found the vein in one go.' },
		{ name: 'Meera S.', rating: '4.5', time: '2 weeks ago', text: 'Extremely polite nurse. Checked my vitals before and after the IV infusion.' }
	],
	'gen3': [
		{ name: 'Karan A.', rating: '5.0', time: 'Yesterday', text: 'Quick vitals and sugar check. Very convenient for elderly parents at home.' }
	]
}

const DEFAULT_REVIEWS: ReviewItem[] = [
	{ name: 'Rajesh S.', rating: '5.0', time: '3 days ago', text: 'Excellent healthcare professional. Very thorough and answered all our questions patiently.' },
	{ name: 'Anjali V.', rating: '4.8', time: '1 week ago', text: 'Highly satisfied with the treatment. Safe and hygienic protocols were followed.' }
]

export const ServiceDetailsBottomSheet: React.FC<ServiceDetailsBottomSheetProps> = ({
	visible,
	service,
	onClose,
	onAddToBooking,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	if (!service) return null

	const handleAdd = () => {
		onAddToBooking(service)
		onClose()
	}

	const detailedDesc =
		'Includes sterile medical equipment, thorough vitals assessment, professional sanitization, and step-by-step patient care by certified healthcare professionals.'

	const serviceInstructions =
		'Please ensure a clean, comfortable, and well-lit space for the nurse during the home visit.'

	// Select matching reviews or fallback
	const reviewsList = MOCK_REVIEWS_POOL[service.id] || DEFAULT_REVIEWS

	return (
		<AppBottomSheet
			visible={visible}
			title="Service Details"
			onClose={onClose}
			maxHeightRatio={0.85}
			footer={
				<View style={[styles.ctaContainer, isTablet && styles.containerTablet]}>
					<AppButton
						variant="primary"
						formAction
						style={styles.addBtn}
						onPress={handleAdd}
					>
						Book Service
					</AppButton>
				</View>
			}
		>
			<View style={[styles.mainWrapper, isTablet && styles.containerTablet]}>
				{/* 1. Service Image */}
				{service.image ? (
					<Image
						source={{ uri: service.image }}
						style={[styles.image, isTablet && styles.imageTablet]}
						resizeMode="cover"
					/>
				) : null}

				{/* 2. Badges Row */}
				<View style={styles.badgeRow}>
					{service.verified && (
						<View style={styles.verifiedBadge}>
							<Ionicons name="checkmark-circle" size={13} color="#1F5F68" />
							<AppTypography variant="caption" style={styles.verifiedText}>
								Verified Provider
							</AppTypography>
						</View>
					)}
					{service.premiumBadgeText && (
						<View style={styles.premiumBadge}>
							<AppTypography variant="caption" style={styles.premiumText}>
								{service.premiumBadgeText}
							</AppTypography>
						</View>
					)}
				</View>

				{/* 3. Service Name */}
				<AppTypography variant="h2" style={styles.title}>
					{service.title}
				</AppTypography>

				{/* 4. Duration & Price Summary Pill */}
				<View style={styles.infoPillRow}>
					{/* <View style={styles.infoPill}>
						<Ionicons name="time-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.infoPillText}>
							{service.duration}
						</AppTypography>
					</View> */}

					<View style={styles.infoPill}>
						<Ionicons name="pricetag-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.infoPillText}>
							{service.price}
						</AppTypography>
					</View>
				</View>

				{/* 5. Short & Detailed Description */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionHeading}>
						About Service
					</AppTypography>
					<AppTypography variant="body" style={styles.descriptionText}>
						{service.description}
					</AppTypography>
					<AppTypography variant="caption" style={styles.detailedDescText}>
						{detailedDesc}
					</AppTypography>
				</View>

				{/* SECTION A: WHAT'S INCLUDED */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionHeading}>
						What's Included
					</AppTypography>
					<View style={styles.inclusionList}>
						<View style={styles.inclusionItem}>
							<Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
							<AppTypography variant="caption" style={styles.inclusionText}>
								Certified & background-verified clinical nurse
							</AppTypography>
						</View>
						<View style={styles.inclusionItem}>
							<Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
							<AppTypography variant="caption" style={styles.inclusionText}>
								100% sterile, single-use medical consumables
							</AppTypography>
						</View>
						<View style={styles.inclusionItem}>
							<Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
							<AppTypography variant="caption" style={styles.inclusionText}>
								Vitals reporting & medication check-off
							</AppTypography>
						</View>
					</View>
				</View>

				{/* SECTION B: PREPARATION & EXPECTATIONS */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionHeading}>
						Preparation & Guidelines
					</AppTypography>
					<View style={styles.guidelineBox}>
						<View style={styles.guidelineRow}>
							<MaterialCommunityIcons name="clock-check-outline" size={16} color="#546E7A" />
							<AppTypography variant="caption" style={styles.guidelineText}>
								Requires 30-45 minutes of active clinical time.
							</AppTypography>
						</View>
						<View style={styles.guidelineRow}>
							<MaterialCommunityIcons name="home-analytics" size={16} color="#546E7A" />
							<AppTypography variant="caption" style={styles.guidelineText}>
								Please prepare a well-lit space with a nearby chair or bed.
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 6. Service Instructions / Notes */}
				<View style={styles.instructionsBox}>
					<MaterialCommunityIcons name="information-outline" size={20} color="#1F5F68" style={styles.infoIcon} />
					<View style={styles.instructionsTextCol}>
						<AppTypography variant="caption" style={styles.instructionsTitle}>
							Service Instructions
						</AppTypography>
						<AppTypography variant="caption" style={styles.instructionsText}>
							{serviceInstructions}
						</AppTypography>
					</View>
				</View>

				{/* SECTION C: REVIEWS & RATINGS */}
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
	imageTablet: {
		height: 180,
		borderRadius: 16,
	},
	badgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		gap: 3,
	},
	verifiedText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1F5F68',
	},
	premiumBadge: {
		backgroundColor: '#CFF4F5',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
	},
	premiumText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0D474D',
		letterSpacing: 0.3,
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
	detailedDescText: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 17,
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
	},
	guidelineBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		padding: 12,
		borderWidth: 1,
		borderColor: '#ECEFF1',
		gap: 8,
	},
	guidelineRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	guidelineText: {
		fontSize: 11.5,
		color: '#546E7A',
		fontWeight: '500',
	},
	instructionsBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginBottom: 20,
	},
	infoIcon: {
		marginRight: 10,
		marginTop: 2,
	},
	instructionsTextCol: {
		flex: 1,
	},
	instructionsTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F5F68',
		marginBottom: 2,
	},
	instructionsText: {
		fontSize: 11,
		color: '#475569',
		lineHeight: 15,
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
