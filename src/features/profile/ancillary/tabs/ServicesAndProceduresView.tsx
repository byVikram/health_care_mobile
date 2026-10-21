import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppTypography } from '../../../../components/common'
import {
	fetchAncillaryHierarchyBackend,
	fetchProviderProfile,
	AncillaryHierarchySubspecialty,
} from '../../../ancillary/ancillaryService'

/**
 * Dynamic, read-only Specialization -> Sub-specialty -> Category -> Procedures
 * display, driven entirely by the GET /api/ancillary/hierarchy backend endpoint.
 *
 * This component performs NO writes: no checkboxes, no selection, no save action,
 * and no mock data. It only retrieves and renders whatever the backend database
 * returns for the provider's currently selected specialization / subspecialty
 * (selected in the Professional Details tab).
 *
 * When the provider changes their specialization in Professional Details, the
 * parent passes the new `subspecialtyId`, which immediately re-fetches and displays
 * the updated hierarchy dynamically from the API.
 */

export interface ServicesAndProceduresViewProps {
	specialtyKey?: string
	subspecialtyId?: string
	refreshToken?: string | number | boolean
	isActive?: boolean
	onNextTab?: () => void
	specialtyLabel?: string
}

export default function ServicesAndProceduresView({
	specialtyKey = 'physiotherapy',
	subspecialtyId,
	refreshToken,
	isActive,
	onNextTab,
}: ServicesAndProceduresViewProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [subspecialtyNode, setSubspecialtyNode] = useState<AncillaryHierarchySubspecialty | null>(null)
	const [activeSubId, setActiveSubId] = useState<string | undefined>(subspecialtyId)

	useEffect(() => {
		let isMounted = true

		const load = async () => {
			const resolvedKey = specialtyKey || 'physiotherapy'
			setLoading(true)
			setError(null)

			try {
				let targetSubId = subspecialtyId
				if (!targetSubId) {
					try {
						targetSubId = (await AsyncStorage.getItem('ancillary_subspecialty_id')) || undefined
					} catch (e) {
						// Storage read is only a hint for the sub-specialty; fall through to the profile lookup.
					}
				}
				if (!targetSubId) {
					try {
						const prof = await fetchProviderProfile()
						targetSubId = prof?.sub_specialty_id ?? undefined
					} catch (e) {
						// Profile lookup is only a hint; the hierarchy fetch below still works without a sub-specialty.
					}
				}

				if (isMounted) {
					setActiveSubId(targetSubId)
				}

				// Fetch dynamic hierarchy from backend using selected specialty and subspecialty
				const specialties = await fetchAncillaryHierarchyBackend(resolvedKey, targetSubId)
				if (!isMounted) return

				const specialtyNode = specialties[0] || null
				const subList = specialtyNode?.sub_specialties || (specialtyNode as any)?.subspecialties || []

				let matched: AncillaryHierarchySubspecialty | null = null
				if (targetSubId) {
					matched = subList.find((s: any) => s.id === targetSubId || (s as any).public_id === targetSubId) || null
				} else if (subList.length > 0) {
					matched = subList[0]
				}

				setSubspecialtyNode(matched)
			} catch (e) {
				console.log('[ServicesAndProceduresView] error loading hierarchy:', e)
				if (isMounted) setError('Unable to load services right now.')
			} finally {
				if (isMounted) setLoading(false)
			}
		}

		load()

		return () => {
			isMounted = false
		}
	}, [specialtyKey, subspecialtyId, refreshToken, isActive])

	if (loading) {
		return (
			<View style={styles.centerBlock}>
				<ActivityIndicator size="small" color="#004D40" />
				<AppTypography variant="caption" style={styles.centerText}>
					Loading services and procedures...
				</AppTypography>
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.centerBlock, styles.errorBlock]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={26} color="#DC2626" />
				<AppTypography variant="caption" style={styles.errorText}>
					{error}
				</AppTypography>
			</View>
		)
	}

	if (!activeSubId && !subspecialtyNode) {
		return (
			<View style={styles.centerBlock}>
				<View style={styles.emptyIconWrap}>
					<MaterialCommunityIcons name="information-outline" size={28} color="#0D9488" />
				</View>
				<AppTypography variant="body" style={styles.emptyTitle}>
					No Specialization Selected
				</AppTypography>
				<AppTypography variant="caption" style={styles.centerText}>
					Please select your specialization in the Professional Details tab. The corresponding
					clinical categories and procedures will automatically appear here.
				</AppTypography>
			</View>
		)
	}

	if (!subspecialtyNode || subspecialtyNode.categories.length === 0) {
		return (
			<ScrollView
				style={styles.scrollContainer}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.innerContainer, isTablet && styles.innerContainerTablet]}>
					{subspecialtyNode ? (
						<View style={styles.specializationCard}>
							<View style={styles.specializationLeft}>
								<View style={styles.specializationIconWrapper}>
									<MaterialCommunityIcons name="stethoscope" size={26} color="#004D40" />
								</View>
								<View style={styles.specializationInfo}>
									<View style={styles.specializationTagRow}>
										<AppTypography variant="caption" style={styles.specializationHeaderTag}>
											SELECTED SPECIALIZATION
										</AppTypography>
										<View style={styles.primaryPill}>
											<AppTypography variant="caption" style={styles.primaryPillText}>
												Primary
											</AppTypography>
										</View>
									</View>
									<AppTypography variant="h3" style={styles.specializationTitle}>
										{subspecialtyNode.label}
									</AppTypography>
								</View>
							</View>
						</View>
					) : null}
					<View style={styles.centerBlock}>
						<View style={styles.emptyIconWrap}>
							<MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#64748B" />
						</View>
						<AppTypography variant="body" style={styles.emptyTitle}>
							No Procedures Configured
						</AppTypography>
						<AppTypography variant="caption" style={styles.centerText}>
							No clinical procedures are configured yet for this specialization.
						</AppTypography>
					</View>
				</View>
			</ScrollView>
		)
	}

	return (
		<ScrollView
			style={styles.scrollContainer}
			contentContainerStyle={styles.contentContainer}
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.innerContainer, isTablet && styles.innerContainerTablet]}>
				{/* Selected Specialization Card */}
				<View style={styles.specializationCard}>
					<View style={styles.specializationLeft}>
						<View style={styles.specializationIconWrapper}>
							<MaterialCommunityIcons name="stethoscope" size={26} color="#004D40" />
						</View>
						<View style={styles.specializationInfo}>
							<View style={styles.specializationTagRow}>
								<AppTypography variant="caption" style={styles.specializationHeaderTag}>
									SELECTED SPECIALIZATION
								</AppTypography>
								<View style={styles.primaryPill}>
									<AppTypography variant="caption" style={styles.primaryPillText}>
										Primary
									</AppTypography>
								</View>
							</View>
							<AppTypography variant="h3" style={styles.specializationTitle}>
								{subspecialtyNode.label}
							</AppTypography>
						</View>
					</View>
				</View>

				{/* Categories and Procedures Section */}
				<View style={styles.categorySections}>
					{subspecialtyNode.categories.map((category) => (
						<View key={category.id} style={styles.categoryCard}>
							{/* Category Header */}
							<View style={styles.categoryHeader}>
								<View style={styles.categoryHeaderLeft}>
									<View style={styles.categoryDot} />
									<View style={styles.categoryTitleContainer}>
										<AppTypography variant="h4" style={styles.categoryHeaderTitle}>
											{category.label}
										</AppTypography>
										<AppTypography variant="caption" style={styles.categorySubtitle}>
											Standard clinical procedures and modalities covered under this specialty.
										</AppTypography>
									</View>
								</View>
								<View style={styles.categoryCountBadge}>
									<View style={styles.countBadgeDot} />
									<AppTypography variant="caption" style={styles.categoryCountText}>
										{category.procedures.length} procedure{category.procedures.length === 1 ? '' : 's'} included
									</AppTypography>
								</View>
							</View>

							<View style={styles.categoryDivider} />

							{/* Procedures Interactive/Read-only List */}
							<View style={styles.proceduresList}>
								{category.procedures.map((proc) => (
									<View key={proc.id} style={styles.procedureCard}>
										<View style={styles.procedureIconBadge}>
											<MaterialCommunityIcons name="shield-check-outline" size={16} color="#0D9488" />
										</View>
										<View style={styles.procedureTextContainer}>
											<AppTypography variant="body" style={styles.procedureLabel}>
												{proc.label}
											</AppTypography>
											{proc.aboutService ? (
												<AppTypography variant="caption" style={styles.procedureSubtitle}>
													{proc.aboutService}
												</AppTypography>
											) : null}
										</View>
									</View>
								))}
							</View>
						</View>
					))}
				</View>

				{onNextTab ? (
					<View style={styles.footerRow}>
						<AppButton
							variant="primary"
							onPress={onNextTab}
							style={styles.continueBtn}
							labelStyle={styles.continueBtnLabel}
						>
							Continue
						</AppButton>
					</View>
				) : null}
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scrollContainer: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	contentContainer: {
		paddingHorizontal: 16,
		paddingVertical: 20,
		flexGrow: 1,
	},
	innerContainer: {
		gap: 20,
		width: '100%',
	},
	innerContainerTablet: {
		maxWidth: 820,
		alignSelf: 'center',
	},
	footerRow: {
		marginTop: 8,
		marginBottom: 32,
	},
	continueBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		height: 48,
		justifyContent: 'center',
	},
	continueBtnLabel: {
		fontSize: 15,
		fontWeight: '600',
		color: '#FFFFFF',
		letterSpacing: 0.3,
	},
	centerBlock: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 48,
		paddingHorizontal: 24,
		gap: 12,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginVertical: 16,
	},
	errorBlock: {
		backgroundColor: '#FEF2F2',
		borderColor: '#FECACA',
	},
	emptyIconWrap: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: '#F0FDFA',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	emptyTitle: {
		fontWeight: '700',
		color: '#0F172A',
		fontSize: 16,
	},
	centerText: {
		textAlign: 'center',
		color: '#64748B',
		fontSize: 13,
		lineHeight: 19,
	},
	errorText: {
		textAlign: 'center',
		color: '#DC2626',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500',
	},
	specializationCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F0FDFA',
		borderRadius: 16,
		padding: 18,
		borderWidth: 1,
		borderColor: '#CCFBF1',
	},
	specializationLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 14,
	},
	specializationIconWrapper: {
		width: 50,
		height: 50,
		borderRadius: 14,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#0D9488',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 3,
		elevation: 1,
	},
	specializationInfo: {
		flex: 1,
	},
	specializationTagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	specializationHeaderTag: {
		fontSize: 11,
		color: '#0F766E',
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	primaryPill: {
		backgroundColor: '#CCFBF1',
		borderWidth: 1,
		borderColor: '#99F6E4',
		borderRadius: 10,
		paddingHorizontal: 7,
		paddingVertical: 1.5,
	},
	primaryPillText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#115E59',
	},
	specializationTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},
	categorySections: {
		gap: 20,
	},
	categoryCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 6,
		elevation: 1,
	},
	categoryHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 12,
		flexWrap: 'wrap',
	},
	categoryHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		flex: 1,
		minWidth: 220,
		gap: 10,
	},
	categoryDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0D9488',
		marginTop: 6,
	},
	categoryTitleContainer: {
		flex: 1,
	},
	categoryHeaderTitle: {
		color: '#0F172A',
		fontSize: 18,
		fontWeight: '700',
		letterSpacing: -0.2,
	},
	categorySubtitle: {
		fontSize: 13,
		color: '#64748B',
		marginTop: 3,
		lineHeight: 18,
	},
	categoryCountBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0FDFA',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 14,
		gap: 6,
		alignSelf: 'flex-start',
	},
	countBadgeDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#0D9488',
	},
	categoryCountText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0F766E',
	},
	categoryDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 16,
	},
	proceduresList: {
		gap: 10,
	},
	procedureCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	procedureIconBadge: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#F0FDFA',
		borderWidth: 1,
		borderColor: '#99F6E4',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 1,
	},
	procedureTextContainer: {
		flex: 1,
	},
	procedureLabel: {
		fontSize: 15,
		color: '#0F172A',
		fontWeight: '600',
	},
	procedureSubtitle: {
		fontSize: 13,
		lineHeight: 19,
		color: '#475569',
		marginTop: 3,
	},
})

