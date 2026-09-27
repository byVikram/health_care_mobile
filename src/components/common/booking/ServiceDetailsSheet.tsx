import React from 'react'
import { Image, ImageSourcePropType, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AppBottomSheet from '../layout/AppBottomSheet'
import { AppTypography } from '../display/AppTypography'
import { AppButton } from '../buttons/AppButton'
import { AppPathIcon } from '../display/AppIcon'
import { AppTag } from '../display/AppTag'
import { AppNumberedSteps } from '../display/AppNumberedSteps'
import { AppSkeleton } from '../display/AppSkeleton'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { safeJsonParse } from '../../../utils/jsonUtils'
import { ServiceProcedureItem } from './ServiceCatalogCard'

// ---------------------------------------------------------------------------------------------------------
// Two looks behind one component:
//   default  (legacy)  — image, name, price pill, About / What's included, optional rating row. Used by the
//                        Laboratory screens and HomeCareServiceCatalogScreen; props unchanged.
//   'modern' (opt-in)  — design "2a · service details sheet open" (home-care catalogue): AppBottomSheet
//                        appearance="modern", tinted hero (icon tile, name, price, MRP,
//                        % OFF), facts grid, About + "Good for:", What's included, prep steps, trust line and
//                        an "Add to booking · ₹x" / "Added to booking · Remove" footer. Every empty field hides.
// ---------------------------------------------------------------------------------------------------------

interface LegacyServiceDetailsSheetProps {
	variant?: 'default'
	visible: boolean
	service: ServiceProcedureItem | null
	onClose: () => void
	/** When omitted, the sheet is view-only and the footer action button is not rendered. */
	onAddToBooking?: (service: ServiceProcedureItem) => void
	/** Set to `false` to hide the rating row entirely. When `true` (default) it only shows when the service
	 *  carries a real `rating` (no simulated reviews are ever shown). */
	showReviews?: boolean
	/** Resolves a raw `image_url`/`imageUrl`/`image` string into a displayable
	 *  `ImageSourcePropType` (e.g. a domain-specific bundled-asset registry).
	 *  Kept out of this shared component so `common/booking` has no
	 *  dependency on any feature folder — pass your feature's own resolver
	 *  (e.g. Ancillary's `getAncillaryImageSource`) to reproduce that
	 *  feature's current image behavior. When omitted (or when it returns
	 *  nothing and `service.imageSource` is also unset), a generic
	 *  placeholder icon is shown instead. */
	resolveImageSource?: (raw?: string | null) => ImageSourcePropType | undefined
	/** Label for the footer CTA button. Defaults to "Book Service". */
	actionButtonText?: string
}

/** One cell of the modern sheet's 2-column "At a glance" grid. */
export type ServiceDetailsFact = {
	key: string
	label: string
	value: string
	/** Stroke path(s) on a 24x24 grid. */
	icon: string | string[]
	/** Soft tone for the cell (sky / lilac / sand / mint / peach). Defaults to 'mint'. */
	tone?: ToneKey
}

export type ServiceDetailsIncludedItem = {
	key?: string
	label: string
	/** Small lilac pill on the right, e.g. "7 visits" / "Daily". */
	meta?: string
}

/** Everything the modern sheet shows; the caller maps its API item into this. Empty fields hide. */
export type ServiceDetailsContent = {
	id: string
	/** 11/14 800 caps line above the name, e.g. "Nursing procedure". */
	kindLabel?: string
	name: string
	tone?: ToneKey
	iconPath?: string | string[]
	price: number
	mrp?: number | null
	facts?: ServiceDetailsFact[]
	about?: string | null
	goodFor?: string | null
	includes?: ServiceDetailsIncludedItem[]
	/** Show skeleton rows under "What's included" (e.g. while a package's procedures load). */
	includesLoading?: boolean
	/** e.g. "Before the nurse arrives". Defaults to "Before your visit". */
	prepTitle?: string
	prepSteps?: string[]
	/** e.g. "Qualified nurse at home · visit notes in the app". */
	trustLine?: string
}

export interface ModernServiceDetailsSheetProps {
	variant: 'modern'
	visible: boolean
	content: ServiceDetailsContent | null
	onClose: () => void
	/** Whether the service is already in the booking (switches the footer to "Added to booking · Remove"). */
	added?: boolean
	/** Footer "Add to booking · ₹x". The parent decides whether to close the sheet. Omit for a view-only sheet. */
	onAdd?: () => void
	/** Footer "Added to booking · Remove". */
	onRemove?: () => void
	/** Defaults to "Add to booking". */
	addLabel?: string
}

export type ServiceDetailsSheetProps = LegacyServiceDetailsSheetProps | ModernServiceDetailsSheetProps

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
				.map((line) => line.trim().replace(/^[-•*]\s*/, ''))
				.filter(Boolean)
		}
		return [trimmed]
	}
	return []
}

/** Shared helper so callers can map `whats_included` (array, JSON string or newline list) the same way. */
export const parseServiceIncludes = parseWhatsIncluded

export const ServiceDetailsSheet: React.FC<ServiceDetailsSheetProps> = (props) =>
	props.variant === 'modern' ? <ModernServiceDetailsSheet {...props} /> : <LegacyServiceDetailsSheet {...props} />

// ---------------------------------------------------------------------------------------------------------
// Modern (design 2a)
// ---------------------------------------------------------------------------------------------------------

const rupees = (amount: number) =>
	`₹${amount.toLocaleString('en-IN', { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}`

const PERSON_ICON = ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0']
const HOME_ICON = ['M4 11l8-7 8 7', 'M6 10v10h12V10']
const TICK_ICON = 'M5 12.5l4.5 4.5L19 7.5'

function ModernServiceDetailsSheet({
	visible,
	content,
	onClose,
	added = false,
	onAdd,
	onRemove,
	addLabel = 'Add to booking',
}: ModernServiceDetailsSheetProps) {
	if (!content) return null

	const tone = TONES[content.tone ?? 'mint']
	const priceLabel = rupees(content.price)
	const hasMrp = content.mrp != null && content.mrp > content.price
	const off = hasMrp && content.mrp ? Math.round(((content.mrp - content.price) / content.mrp) * 100) : 0
	const facts = (content.facts ?? []).filter((f) => !!f.value)
	const about = content.about?.trim()
	const goodFor = content.goodFor?.trim()
	const includes = (content.includes ?? []).filter((i) => !!i.label)
	const prep = (content.prepSteps ?? []).map((s) => s.trim()).filter(Boolean)
	const trustLine = content.trustLine?.trim()

	const footer = added ? (
		onRemove ? (
			<AppButton
				variant="outline"
				size="lg"
				icon="check"
				onPress={onRemove}
				style={styles.footerBtn}
				accessibilityLabel={`${content.name} added. Remove from booking`}
			>
				Added to booking · Remove
			</AppButton>
		) : undefined
	) : onAdd ? (
		<AppButton variant="primary" size="lg" icon="plus" onPress={onAdd} style={styles.footerBtn}>
			{`${addLabel} · ${priceLabel}`}
		</AppButton>
	) : undefined

	return (
		<AppBottomSheet
			visible={visible}
			title={content.kindLabel || 'Service details'}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.88}
			footer={footer}
		>
			<View style={styles.mWrap}>
				{/* Hero */}
				<View style={[styles.hero, { backgroundColor: tone.bg }]}>
					<View style={styles.heroCircle} importantForAccessibility="no-hide-descendants" />
					<View style={styles.heroTop}>
						<View style={styles.heroTile} importantForAccessibility="no-hide-descendants">
							{!!content.iconPath && (
								<AppPathIcon d={content.iconPath} size={32} strokeWidth={1.8} color={tone.ink} />
							)}
						</View>
						<View style={styles.heroText}>
							<Text style={styles.heroName} accessibilityRole="header">
								{content.name}
							</Text>
						</View>
					</View>
					<View
						style={styles.heroPriceRow}
						accessible
						accessibilityLabel={`${priceLabel}${hasMrp && content.mrp ? `, was ${rupees(content.mrp)}, ${off}% off` : ''}`}
					>
						<Text style={styles.heroPrice}>{priceLabel}</Text>
						{hasMrp && !!content.mrp && <Text style={styles.heroMrp}>{rupees(content.mrp)}</Text>}
						{off > 0 && <AppTag label={`${off}% OFF`} tone="offer" size="xs" />}
					</View>
				</View>

				{/* At a glance */}
				{facts.length > 0 && (
					<View style={styles.facts} accessibilityLabel="At a glance">
						{facts.map((f) => {
							const ft = TONES[f.tone ?? 'mint']
							return (
								<View
									key={f.key}
									style={[styles.fact, { backgroundColor: ft.bg }]}
									accessible
									accessibilityLabel={`${f.label}: ${f.value}`}
								>
									<View style={styles.factIcon}>
										<AppPathIcon d={f.icon} size={18} strokeWidth={2} color={ft.ink} />
									</View>
									<View style={styles.factText}>
										<Text style={[styles.factLabel, { color: ft.ink }]} numberOfLines={1}>
											{f.label}
										</Text>
										<Text style={styles.factValue} numberOfLines={2}>
											{f.value}
										</Text>
									</View>
								</View>
							)
						})}
					</View>
				)}

				{/* About + Good for */}
				{(!!about || !!goodFor) && (
					<View style={styles.block}>
						{!!about && (
							<>
								<Text style={styles.h3} accessibilityRole="header">
									About this service
								</Text>
								<Text style={styles.body}>{/[.!?]$/.test(about) ? about : `${about}.`}</Text>
							</>
						)}
						{!!goodFor && (
							<View style={styles.goodFor}>
								<AppPathIcon d={PERSON_ICON} size={16} strokeWidth={2.2} color={APP_COLORS.primary} />
								<Text style={styles.goodForText}>
									<Text style={styles.goodForLabel}>Good for: </Text>
									{goodFor}
								</Text>
							</View>
						)}
					</View>
				)}

				{/* What's included */}
				{(includes.length > 0 || content.includesLoading) && (
					<View style={styles.blockTight}>
						<Text style={styles.h3} accessibilityRole="header">
							What's included
						</Text>
						{content.includesLoading && includes.length === 0 ? (
							<View style={styles.includesSkeleton}>
								<AppSkeleton height={18} width="80%" borderRadius={6} color={APP_COLORS.divider} />
								<AppSkeleton height={18} width="60%" borderRadius={6} color={APP_COLORS.divider} />
							</View>
						) : (
							<View accessibilityRole="list">
								{includes.map((item, i) => (
									<View
										key={item.key ?? `${i}-${item.label}`}
										style={[styles.includeRow, i > 0 && styles.includeDivider]}
									>
										<AppPathIcon d={TICK_ICON} size={18} strokeWidth={2.4} color={APP_COLORS.success} />
										<Text style={styles.includeText}>{item.label}</Text>
										{!!item.meta && <AppTag label={item.meta} tone="lilac" shape="pill" />}
									</View>
								))}
							</View>
						)}
					</View>
				)}

				{/* Before the visit */}
				{prep.length > 0 && (
					<View style={styles.blockSteps}>
						<Text style={styles.h3} accessibilityRole="header">
							{content.prepTitle || 'Before your visit'}
						</Text>
						<AppNumberedSteps
							steps={prep.map((s, i) => ({ key: `${i}-${s}`, title: s }))}
							titleStyle={styles.stepText}
						/>
					</View>
				)}

				{!!trustLine && (
					<View style={styles.trust}>
						<View style={styles.trustIcon}>
							<AppPathIcon d={HOME_ICON} size={18} strokeWidth={2} color={APP_COLORS.primary} />
						</View>
						<Text style={styles.trustText}>{trustLine}</Text>
					</View>
				)}
			</View>
		</AppBottomSheet>
	)
}

// ---------------------------------------------------------------------------------------------------------
// Legacy (default)
// ---------------------------------------------------------------------------------------------------------

function LegacyServiceDetailsSheet({
	visible,
	service,
	onClose,
	onAddToBooking,
	showReviews = true,
	resolveImageSource,
	actionButtonText = 'Book Service',
}: LegacyServiceDetailsSheetProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	if (!service) return null

	const handleAdd = () => {
		onAddToBooking?.(service)
		onClose()
	}

	const aboutText = service.about_service?.trim() || service.aboutService?.trim() || service.description?.trim() || ''

	const includedList = parseWhatsIncluded(service.whats_included ?? service.whatsIncluded)

	// Real rating only (ServiceProcedureItem.rating / reviewCount) -- no simulated review text.
	const showRating = showReviews && typeof service.rating === 'number' && service.rating > 0

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

				{/* 6. Rating (real data only) */}
				{showRating ? (
					<View style={styles.section}>
						<View style={styles.reviewsHeaderRow}>
							<AppTypography variant="h4" style={styles.sectionHeading}>
								Patient Reviews
							</AppTypography>
							<View style={styles.starBadge}>
								<Ionicons name="star" size={12} color="#F59E0B" />
								<AppTypography variant="caption" style={styles.starText}>
									{`${service.rating?.toFixed(1)}${service.reviewCount ? ` · ${service.reviewCount} reviews` : ''}`}
								</AppTypography>
							</View>
						</View>
					</View>
				) : null}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	// ---- modern ----
	mWrap: {
		gap: 20,
		paddingBottom: 4,
	},
	hero: {
		borderRadius: 16,
		padding: 16,
		overflow: 'hidden',
		gap: 14,
	},
	heroCircle: {
		position: 'absolute',
		right: -40,
		top: -50,
		width: 170,
		height: 170,
		borderRadius: 85,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.45,
	},
	heroTop: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
	},
	heroTile: {
		width: 64,
		height: 64,
		borderRadius: 18,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 8,
		elevation: 2,
	},
	heroText: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	heroName: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	heroPriceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	heroPrice: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	heroMrp: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
		textDecorationLine: 'line-through',
	},
	facts: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	fact: {
		flexBasis: '47%',
		flexGrow: 1,
		padding: 12,
		borderRadius: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	factIcon: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	factText: {
		flex: 1,
		minWidth: 0,
	},
	factLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
	},
	factValue: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	block: {
		gap: 6,
	},
	blockTight: {
		gap: 8,
	},
	blockSteps: {
		gap: 10,
	},
	h3: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	body: {
		fontSize: 14,
		lineHeight: 21,
		color: APP_COLORS.inkMuted,
	},
	goodFor: {
		marginTop: 4,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	goodForText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
	goodForLabel: {
		fontWeight: '700',
	},
	includesSkeleton: {
		gap: 10,
		paddingVertical: 6,
	},
	includeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
	},
	includeDivider: {
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	includeText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	stepText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '400',
		color: APP_COLORS.ink,
	},
	trust: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 14,
		backgroundColor: APP_COLORS.mint,
	},
	trustIcon: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	trustText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	footerBtn: {
		width: '100%',
	},

	// ---- legacy ----
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
