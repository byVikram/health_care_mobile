import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppTypography } from '../../../../components/common'
import {
	fetchAncillaryHierarchyBackend,
	fetchProviderProfileBackend,
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
					} catch (e) {}
				}
				if (!targetSubId) {
					try {
						const prof = await fetchProviderProfileBackend()
						targetSubId =
							prof?.subspecialty_id ||
							(prof as any)?.sub_specialty_id ||
							prof?.subspecialty?.id ||
							(prof as any)?.sub_specialty?.id ||
							undefined
					} catch (e) {}
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
				<ActivityIndicator size="small" color="#2B6F71" />
				<AppTypography variant="caption" style={styles.centerText}>
					Loading services and procedures...
				</AppTypography>
			</View>
		)
	}

	if (error) {
		return (
			<View style={styles.centerBlock}>
				<MaterialCommunityIcons name="alert-circle-outline" size={24} color="#B45309" />
				<AppTypography variant="caption" style={styles.centerText}>
					{error}
				</AppTypography>
			</View>
		)
	}

	if (!activeSubId && !subspecialtyNode) {
		return (
			<View style={styles.centerBlock}>
				<MaterialCommunityIcons name="information-outline" size={26} color="#64748B" />
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
			<View style={styles.container}>
				{subspecialtyNode ? (
					<View style={styles.subspecialtyBanner}>
						<View style={styles.bannerIconWrap}>
							<MaterialCommunityIcons name="stethoscope" size={20} color="#0c7c7c" />
						</View>
						<View style={{ flex: 1 }}>
							<AppTypography variant="caption" style={styles.subspecialtyHeaderTag}>
								Selected Specialization
							</AppTypography>
							<AppTypography variant="subtitle" style={styles.subspecialtyBannerText}>
								{subspecialtyNode.label}
							</AppTypography>
						</View>
					</View>
				) : null}
				<View style={styles.centerBlock}>
					<MaterialCommunityIcons name="clipboard-text-outline" size={26} color="#64748B" />
					<AppTypography variant="body" style={styles.emptyTitle}>
						No Procedures Configured
					</AppTypography>
					<AppTypography variant="caption" style={styles.centerText}>
						No clinical procedures are configured yet for this specialization.
					</AppTypography>
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			{/* Specialization / Sub-specialty Banner */}
			<View style={styles.subspecialtyBanner}>
				<View style={styles.bannerIconWrap}>
					<MaterialCommunityIcons name="stethoscope" size={20} color="#0c7c7c" />
				</View>
				<View style={{ flex: 1 }}>
					<AppTypography variant="caption" style={styles.subspecialtyHeaderTag}>
						Selected Specialization
					</AppTypography>
					<AppTypography variant="subtitle" style={styles.subspecialtyBannerText}>
						{subspecialtyNode.label}
					</AppTypography>
				</View>
			</View>

			{/* Categories and Procedures */}
			<View style={styles.categorySections}>
				{subspecialtyNode.categories.map((category) => (
					<View key={category.id} style={styles.categoryBlock}>
						<View style={styles.categoryTitleRow}>
							<View style={{ flex: 1 }}>
								<AppTypography variant="h4" style={styles.categoryHeaderTitle}>
									{category.label}
								</AppTypography>
							</View>
							<AppTypography variant="caption" style={styles.categoryCountBadge}>
								{category.procedures.length} procedure{category.procedures.length === 1 ? '' : 's'}
							</AppTypography>
						</View>

						<View style={styles.proceduresList}>
							{category.procedures.map((proc) => (
								<View key={proc.id} style={styles.procedureRow}>
									<View style={styles.procedureIconBadge}>
										<MaterialCommunityIcons name="check-circle-outline" size={18} color="#2B6F71" />
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
					>
						Continue to Availability -&gt;
					</AppButton>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		gap: 18,
	},
	footerRow: {
		marginTop: 10,
		marginBottom: 24,
	},
	continueBtn: {
		backgroundColor: '#2B6F71',
	},
	centerBlock: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 48,
		paddingHorizontal: 24,
		gap: 8,
		backgroundColor: '#F8FAFB',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginVertical: 12,
	},
	emptyTitle: {
		fontWeight: '700',
		color: '#1F2933',
		fontSize: 15,
	},
	centerText: {
		textAlign: 'center',
		color: '#4B5563',
		fontSize: 13,
		lineHeight: 18,
	},
	subspecialtyBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: '#E6F4F2',
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: '#B2DFDB',
	},
	bannerIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	subspecialtyHeaderTag: {
		fontSize: 11,
		color: '#00695C',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	subspecialtyBannerText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#004D40',
	},
	categorySections: {
		gap: 20,
	},
	categoryBlock: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 10,
	},
	categoryTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F4F8',
	},
	categoryHeaderTitle: {
		color: '#1F2933',
		fontSize: 15,
		fontWeight: '700',
	},
	categoryCountBadge: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
	},
	proceduresList: {
		gap: 8,
	},
	procedureRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: '#F8FAFB',
		borderRadius: 8,
		gap: 10,
	},
	procedureIconBadge: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	procedureTextContainer: {
		flex: 1,
	},
	procedureLabel: {
		fontSize: 14,
		color: '#1F2933',
		fontWeight: '600',
	},
	procedureSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: '#4B5F66',
		marginTop: 2,
	},
})
