// src/features/profile/radiology/tabs/ServicesTab.tsx

import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View, useWindowDimensions, ActivityIndicator } from 'react-native'
import Toast from 'react-native-toast-message'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppButton,
	AppInput,
	AppModal,
	AppMultiSelect,
	AppTimePicker,
	AppToggle,
	AppTypography,
	type AppSelectOption,
} from '../../../../components/common'
import { AppSelect } from '../../../../components/common/inputs/AppSelect'
import {
	mergeRadiologyProfileData,
	updateRadiologyProfile,
	getScanTypes,
	getMyScans,
	updateMyScans,
	MobileScanType,
	MobileRadiologyScan,
	MobileScanSetupItem,
} from '../radiologyService'
import { RadiologyProfileData } from '../../../../types/radiology-profile-api'
import { showStatusModal } from '../../../../services/apiService'

const DAY_OPTIONS: AppSelectOption[] = [
	{ label: 'Monday', value: '1' },
	{ label: 'Tuesday', value: '2' },
	{ label: 'Wednesday', value: '3' },
	{ label: 'Thursday', value: '4' },
	{ label: 'Friday', value: '5' },
	{ label: 'Saturday', value: '6' },
	{ label: 'Sunday', value: '7' },
]

const PAYMENT_OPTIONS: AppSelectOption[] = [
	{ label: 'UPI', value: 'UPI' },
	{ label: 'Cash', value: 'Cash' },
	{ label: 'Card', value: 'Card' },
]

const PRICING_MODELS = [
	{ label: 'Fixed Price', value: 'fixed' },
	{ label: 'Starting From', value: 'starting_from' },
	{ label: 'Request Quote', value: 'quote_required' },
]

const SUCCESS_MESSAGE = 'Services & Scan catalog saved successfully'

type ServicesFormData = {
	openDays: string[]
	openingTime: string
	closingTime: string
	paymentMethods: string[]
}

type ServicesTabProps = {
	profileData?: RadiologyProfileData | null
	onProfileChange?: React.Dispatch<React.SetStateAction<RadiologyProfileData | null>>
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? (
				<AppTypography variant="caption" style={styles.requiredMark}>
					*
				</AppTypography>
			) : null}
		</AppTypography>
	)
}

function SectionCard({
	title,
	icon,
	children,
}: {
	title: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	children: React.ReactNode
}) {
	return (
		<View style={styles.sectionCard}>
			<View style={styles.sectionHeader}>
				<MaterialCommunityIcons name={icon} size={16} color="#0c7c7c" />
				<AppTypography variant="caption" style={styles.sectionTitle}>
					{title}
				</AppTypography>
			</View>
			<View style={styles.sectionBody}>{children}</View>
		</View>
	)
}

function FormRow({ children, stacked, compact }: { children: React.ReactNode; stacked: boolean; compact: boolean }) {
	return (
		<View style={[styles.formRow, stacked && styles.formRowStacked, compact && styles.formRowCompact]}>
			{React.Children.map(children, (child, index) => (
				<View
					style={[
						styles.formCell,
						stacked
							? [styles.formCellStacked, index === 0 && styles.formCellStackedFirst]
							: index === 0
								? styles.formCellLeft
								: styles.formCellRight,
					]}
				>
					{child}
				</View>
			))}
		</View>
	)
}

function ToggleRow({
	title,
	description,
	value,
	onValueChange,
}: {
	title: string
	description?: string
	value: boolean
	onValueChange: (value: boolean) => void
}) {
	return (
		<View style={styles.toggleRow}>
			<View style={styles.toggleCopy}>
				<AppTypography variant="body" style={styles.toggleTitle}>
					{title}
				</AppTypography>
				{description ? (
					<AppTypography variant="caption" style={styles.toggleDescription}>
						{description}
					</AppTypography>
				) : null}
			</View>
			<AppToggle
				value={value}
				onValueChange={onValueChange}
				showStatusText={false}
				accessibilityLabel={title}
				style={styles.toggleControl}
			/>
		</View>
	)
}

export default function ServicesTab({ profileData, onProfileChange }: ServicesTabProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<ServicesFormData>({
		openDays: [],
		openingTime: '09:00 AM',
		closingTime: '09:00 PM',
		paymentMethods: [],
	})

	const [catalogLoading, setCatalogLoading] = useState(true)
	const [scanTypes, setScanTypes] = useState<MobileScanType[]>([])
	const [catalogDraft, setCatalogDraft] = useState<
		Record<
			number,
			{
				is_available: boolean
				pricing_model: 'fixed' | 'starting_from' | 'quote_required'
				base_price: string
				price_details: string
			}
		>
	>({})

	const [isSaving, setIsSaving] = useState(false)
	const [successModalVisible, setSuccessModalVisible] = useState(false)

	const updateFormData = <K extends keyof ServicesFormData>(key: K, value: ServicesFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	const handleToggleAvailable = (scanTypeId: number, checked: boolean) => {
		setCatalogDraft((prev) => ({
			...prev,
			[scanTypeId]: {
				...prev[scanTypeId],
				is_available: checked,
			},
		}))
	}

	const handlePricingModelChange = (scanTypeId: number, val: 'fixed' | 'starting_from' | 'quote_required') => {
		setCatalogDraft((prev) => ({
			...prev,
			[scanTypeId]: {
				...prev[scanTypeId],
				pricing_model: val,
				base_price: val === 'quote_required' ? '' : prev[scanTypeId].base_price,
			},
		}))
	}

	const handleBasePriceChange = (scanTypeId: number, text: string) => {
		setCatalogDraft((prev) => ({
			...prev,
			[scanTypeId]: {
				...prev[scanTypeId],
				base_price: text,
			},
		}))
	}

	const handlePriceDetailsChange = (scanTypeId: number, text: string) => {
		setCatalogDraft((prev) => ({
			...prev,
			[scanTypeId]: {
				...prev[scanTypeId],
				price_details: text,
			},
		}))
	}

	useEffect(() => {
		const details = profileData?.details
		if (!details) return

		const openDaysMapped = Array.isArray(details.open_days) ? details.open_days.map(String) : []

		// Parse mon-sat or general operating hours string if present, or fallback
		let openVal = '09:00 AM'
		let closeVal = '09:00 PM'
		const oh = details.operating_hours
		console.log('operating_hours =', oh)

		if (oh && typeof oh === 'object') {
			const keys = Object.keys(oh)

			if (keys.length > 0) {
				const timeStr = oh[keys[0]]
				console.log('timeStr =', timeStr)

				if (typeof timeStr === 'string' && timeStr.includes(' - ')) {
					const [open, close] = timeStr.split(' - ')

					openVal = open
					closeVal = close
				}
			}
		}

		setFormData({
			openDays: openDaysMapped,
			openingTime: openVal,
			closingTime: closeVal,
			paymentMethods: Array.isArray(details.payment_methods) ? details.payment_methods : [],
		})
	}, [profileData?.details])

	useEffect(() => {
		const loadScanCatalog = async () => {
			try {
				setCatalogLoading(true)
				const [typesRes, scansRes] = await Promise.all([getScanTypes(), getMyScans()])
				if (typesRes.success && scansRes.success) {
					setScanTypes(typesRes.data)

					const draft: typeof catalogDraft = {}
					typesRes.data.forEach((t) => {
						const existing = scansRes.data.find((s) => s.scan_type.id === t.id)
						draft[t.id] = {
							is_available: existing ? existing.is_available : false,
							pricing_model: existing ? existing.pricing_model : 'starting_from',
							base_price: existing?.base_price != null ? String(existing.base_price) : '',
							price_details: existing?.price_details ?? '',
						}
					})
					setCatalogDraft(draft)
				}
			} catch (err) {
				console.log('[RadiologyServicesTab] Failed to load scans catalog:', err)
			} finally {
				setCatalogLoading(false)
			}
		}

		loadScanCatalog()
	}, [])

	const handleSave = async () => {
		if (!formData.openDays.length) {
			Toast.show({ type: 'error', text1: 'Please select open days.' })
			return
		}

		setIsSaving(true)
		try {
			// Save Operating Hours, Open Days, Payment Methods
			const daysAsInt = formData.openDays.map(Number)
			const ohPayload = {
				operating_hours: {
					'mon-sat': `${formData.openingTime} - ${formData.closingTime}`,
				},
				open_days: daysAsInt,
				payment_methods: formData.paymentMethods,
			}

			// Save Scans Catalog
			const scansPayload: MobileScanSetupItem[] = []
			scanTypes.forEach((t) => {
				const draft = catalogDraft[t.id]
				if (draft?.is_available) {
					const basePriceNum = draft.pricing_model === 'quote_required' ? null : Number(draft.base_price)
					scansPayload.push({
						scan_type_id: t.id,
						pricing_model: draft.pricing_model,
						base_price: isNaN(basePriceNum as number) ? null : basePriceNum,
						price_details: draft.price_details || null,
						is_available: true,
					})
				}
			})

			const [detailsRes, scansRes] = await Promise.all([
				updateRadiologyProfile(ohPayload),
				updateMyScans({ scans: scansPayload }),
			])

			if (detailsRes.success && scansRes.success) {
				onProfileChange?.((current) =>
					mergeRadiologyProfileData(current, {
						details: {
							...(current?.details ?? {}),
							open_days: daysAsInt,
							operating_hours: ohPayload.operating_hours,
							payment_methods: formData.paymentMethods,
						},
					})
				)
				setSuccessModalVisible(true)
			} else {
				showStatusModal({
					status: 'error',
					title: "Couldn't save radiology services",
					description: 'Unable to save radiology services.',
					submitText: 'OK',
				})
			}
		} catch (error) {
			console.error('[RadiologyServicesTab] save error:', error)
			showStatusModal({
				status: 'error',
				title: "Couldn't save radiology services",
				description: 'Unable to save radiology services right now.',
				submitText: 'OK',
			})
		} finally {
			setIsSaving(false)
		}
	}

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (isTablet) return 820
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const sectionGap = isMobile ? 14 : 18

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.contentContainer,
				{
					paddingHorizontal: sectionPadding,
					paddingTop: sectionPadding,
					paddingBottom: sectionPadding,
				},
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentShell, { maxWidth: contentWidth, gap: sectionGap }]}>
				<SectionCard title="Operating Hours" icon="clock-time-four-outline">
					<View style={styles.fieldGroup}>
						<FieldLabel label="Open Days" required />
						<AppMultiSelect
							values={formData.openDays}
							options={DAY_OPTIONS}
							onChange={(values) => updateFormData('openDays', values)}
							placeholder="Select open days"
							borderRadius={10}
							size="form"
							noMargin
						/>
					</View>

					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<AppTimePicker
							label="Opening Time"
							value={formData.openingTime}
							onChange={(value) => updateFormData('openingTime', value)}
							required
							noMargin
						/>
						<AppTimePicker
							label="Closing Time"
							value={formData.closingTime}
							onChange={(value) => updateFormData('closingTime', value)}
							required
							noMargin
						/>
					</FormRow>
				</SectionCard>

				<SectionCard title="Scans Offered (Catalog)" icon="magnify">
					{catalogLoading ? (
						<ActivityIndicator size="small" color="#0c7c7c" style={{ padding: 12 }} />
					) : (
						scanTypes.map((t, idx) => {
							const draft = catalogDraft[t.id] || {
								is_available: false,
								pricing_model: 'starting_from',
								base_price: '',
								price_details: '',
							}

							return (
								<View key={t.id} style={styles.scanItem}>
									{idx > 0 && <View style={styles.rowDivider} />}
									<ToggleRow
										title={t.name}
										description={t.description || undefined}
										value={draft.is_available}
										onValueChange={(checked) => handleToggleAvailable(t.id, checked)}
									/>

									{draft.is_available && (
										<View style={styles.pricingConfig}>
											<AppSelect
												label="Pricing Model"
												value={draft.pricing_model}
												options={PRICING_MODELS}
												onSelect={(val) => handlePricingModelChange(t.id, val as any)}
												placeholder="Select model"
												size="form"
												noMargin
											/>

											{draft.pricing_model !== 'quote_required' && (
												<View style={{ marginTop: 10 }}>
													<FieldLabel label="Base Price (INR)" required />
													<AppInput
														value={draft.base_price}
														onChangeText={(text) =>
															handleBasePriceChange(t.id, text.replace(/\D/g, ''))
														}
														placeholder="e.g. 1500"
														keyboardType="numeric"
														fieldSize="form"
														noMargin
														dense
													/>
												</View>
											)}

											<View style={{ marginTop: 10 }}>
												<FieldLabel label="Pricing Details / Notes" />
												<AppInput
													value={draft.price_details}
													onChangeText={(text) => handlePriceDetailsChange(t.id, text)}
													placeholder="e.g. Includes report summaries"
													fieldSize="form"
													noMargin
													dense
												/>
											</View>
										</View>
									)}
								</View>
							)
						})
					)}
				</SectionCard>

				<SectionCard title="Accepted Payments" icon="credit-card-outline">
					<View style={styles.fieldGroup}>
						<FieldLabel label="Payment Methods" />
						<AppMultiSelect
							values={formData.paymentMethods}
							options={PAYMENT_OPTIONS}
							onChange={(values) => updateFormData('paymentMethods', values)}
							placeholder="Select payment methods"
							borderRadius={10}
							size="form"
							noMargin
						/>
					</View>
				</SectionCard>

				<AppButton
					variant="primary"
					formAction
					style={styles.saveButton}
					onPress={handleSave}
					loading={isSaving}
					disabled={isSaving}
				>
					Save
				</AppButton>
			</View>

			<AppModal
				visible={successModalVisible}
				onDismiss={() => setSuccessModalVisible(false)}
				contentContainerStyle={styles.successModalContainer}
			>
				<View style={styles.successIconCircle}>
					<MaterialCommunityIcons name="check" size={46} color="#2E7D32" />
				</View>
				<AppTypography variant="h3" style={styles.successModalTitle}>
					Success
				</AppTypography>
				<AppTypography variant="body" style={styles.successModalMessage}>
					{SUCCESS_MESSAGE}
				</AppTypography>
				<AppButton
					variant="primary"
					formAction
					style={styles.successModalButton}
					contentStyle={styles.successModalButtonContent}
					labelStyle={styles.successModalButtonLabel}
					onPress={() => setSuccessModalVisible(false)}
				>
					Okay
				</AppButton>
			</AppModal>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	contentContainer: {
		flexGrow: 1,
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	contentShell: {
		width: '100%',
	},
	sectionCard: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#e4ecef',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		padding: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 16,
	},
	sectionTitle: {
		color: '#253136',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	sectionBody: {
		gap: 14,
	},
	scanItem: {
		width: '100%',
	},
	pricingConfig: {
		marginTop: 12,
		paddingLeft: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#0c7c7c',
		gap: 8,
	},
	formRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginHorizontal: -10,
	},
	formRowCompact: {
		marginHorizontal: -8,
	},
	formRowStacked: {
		flexDirection: 'column',
		marginHorizontal: 0,
	},
	formCell: {
		flex: 1,
		minWidth: 0,
	},
	formCellLeft: {
		paddingHorizontal: 10,
	},
	formCellRight: {
		paddingHorizontal: 10,
	},
	formCellStacked: {
		width: '100%',
		marginTop: 14,
	},
	formCellStackedFirst: {
		marginTop: 0,
	},
	fieldGroup: {
		width: '100%',
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#ef5d5d',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 4,
	},
	toggleCopy: {
		flex: 1,
		minWidth: 0,
	},
	toggleTitle: {
		color: '#1f2b33',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
	},
	toggleDescription: {
		color: '#64747c',
		fontSize: 12,
		lineHeight: 17,
		marginTop: 2,
	},
	toggleControl: {
		flexShrink: 0,
	},
	rowDivider: {
		height: 1,
		backgroundColor: '#edf2f4',
		width: '100%',
		marginVertical: 12,
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
	},
	successModalContainer: {
		alignSelf: 'center',
		width: '78%',
		maxWidth: 330,
		borderRadius: 16,
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 18,
	},
	successIconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#E6F4EA',
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		marginBottom: 12,
	},
	successModalTitle: {
		color: '#000000',
		fontSize: 21,
		lineHeight: 26,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 6,
	},
	successModalMessage: {
		color: '#6b6b6b',
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		marginBottom: 16,
	},
	successModalButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		minWidth: 120,
		borderRadius: 12,
		paddingVertical: 0,
	},
	successModalButtonContent: {
		minHeight: 44,
		paddingVertical: 0,
	},
	successModalButtonLabel: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '700',
	},
})
