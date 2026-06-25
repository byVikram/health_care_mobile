import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppInput,
	AppMultiSelect,
	AppSelect,
	AppStickyFooter,
	AppTimePicker,
	AppToggle,
	AppTypography,
	StatusModal,
	type AppSelectOption,
} from '../../../../components/common'
import {
	buildLaboratoryProfileUpdatePayload,
	mergeLaboratoryProfileData,
	updateLaboratoryProfile,
	getTestTypes,
	getMyTests,
	updateMyTests,
	MobileTestType,
	MobileTestSetupItem,
} from '../laboratoryService'
import { LaboratoryOperatingHours, LaboratoryProfileData } from '../../../../types/laboratory-profile-api'

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

type ServicesFormData = {
	openDays: string[]
	openingTime: string
	closingTime: string
	paymentMethods: string[]
}

type ServicesTabProps = {
	profileData?: LaboratoryProfileData | null
	onProfileChange?: React.Dispatch<React.SetStateAction<LaboratoryProfileData | null>>
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? <AppTypography variant="caption" style={styles.requiredMark}>*</AppTypography> : null}
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

const readOperatingHours = (operatingHours?: LaboratoryOperatingHours) => {
	if (!operatingHours) return { openingTime: '09:00 AM', closingTime: '09:00 PM' }

	if (operatingHours.open || operatingHours.close) {
		return {
			openingTime: operatingHours.open || '09:00 AM',
			closingTime: operatingHours.close || '09:00 PM',
		}
	}

	const firstValue = Object.values(operatingHours).find(Boolean)
	if (firstValue?.includes(' - ')) {
		const [openingTime, closingTime] = firstValue.split(' - ')
		return {
			openingTime: openingTime || '09:00 AM',
			closingTime: closingTime || '09:00 PM',
		}
	}

	return { openingTime: '09:00 AM', closingTime: '09:00 PM' }
}

const buildOperatingHours = (
	existing: LaboratoryOperatingHours | undefined,
	openingTime: string,
	closingTime: string
): LaboratoryOperatingHours => {
	if (existing?.open !== undefined || existing?.close !== undefined) {
		return {
			...existing,
			open: openingTime,
			close: closingTime,
		}
	}

	const key = existing ? Object.keys(existing)[0] || 'mon-sat' : 'mon-sat'
	return {
		[key]: `${openingTime} - ${closingTime}`,
	}
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
	const [isSaving, setIsSaving] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	const [catalogLoading, setCatalogLoading] = useState(true)
	const [testTypes, setTestTypes] = useState<MobileTestType[]>([])
	const [catalogDraft, setCatalogDraft] = useState<Record<number, {
		is_available: boolean
		pricing_model: 'fixed' | 'starting_from' | 'quote_required'
		base_price: string
		price_details: string
	}>>({})

	const updateFormData = <K extends keyof ServicesFormData>(key: K, value: ServicesFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	const handleToggleAvailable = (testTypeId: number, checked: boolean) => {
		setCatalogDraft((prev) => ({
			...prev,
			[testTypeId]: {
				...prev[testTypeId],
				is_available: checked,
			},
		}))
	}

	const handlePricingModelChange = (testTypeId: number, val: 'fixed' | 'starting_from' | 'quote_required') => {
		setCatalogDraft((prev) => ({
			...prev,
			[testTypeId]: {
				...prev[testTypeId],
				pricing_model: val,
				base_price: val === 'quote_required' ? '' : prev[testTypeId].base_price,
			},
		}))
	}

	const handleBasePriceChange = (testTypeId: number, text: string) => {
		setCatalogDraft((prev) => ({
			...prev,
			[testTypeId]: {
				...prev[testTypeId],
				base_price: text,
			},
		}))
	}

	const handlePriceDetailsChange = (testTypeId: number, text: string) => {
		setCatalogDraft((prev) => ({
			...prev,
			[testTypeId]: {
				...prev[testTypeId],
				price_details: text,
			},
		}))
	}

	useEffect(() => {
		const details = profileData?.details
		if (!details) return

		const operatingHours = readOperatingHours(details.operating_hours)
		setFormData({
			openDays: Array.isArray(details.open_days) ? details.open_days.map(String) : [],
			openingTime: operatingHours.openingTime,
			closingTime: operatingHours.closingTime,
			paymentMethods: Array.isArray(details.payment_methods) ? details.payment_methods : [],
		})
	}, [profileData?.details])

	useEffect(() => {
		const loadTestCatalog = async () => {
			try {
				setCatalogLoading(true)
				const [typesRes, testsRes] = await Promise.all([getTestTypes(), getMyTests()])
				if (typesRes.success && testsRes.success) {
					setTestTypes(typesRes.data)

					const draft: typeof catalogDraft = {}
					typesRes.data.forEach((t) => {
						const existing = testsRes.data.find((s) => s.test_type.id === t.id)
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
				console.error('[LaboratoryServicesTab] Failed to load tests catalog:', err)
			} finally {
				setCatalogLoading(false)
			}
		}

		loadTestCatalog()
	}, [])

	const handleSave = async () => {
		if (!formData.openDays.length) {
			Alert.alert('Validation', 'Please select open days.')
			return
		}

		const openDays = formData.openDays.map(Number)
		const operatingHours = buildOperatingHours(
			profileData?.details?.operating_hours,
			formData.openingTime,
			formData.closingTime
		)

		const testsPayload: MobileTestSetupItem[] = []
		testTypes.forEach((t) => {
			const draft = catalogDraft[t.id]
			if (draft?.is_available) {
				const basePriceNum = draft.pricing_model === 'quote_required' ? null : Number(draft.base_price)
				testsPayload.push({
					test_type_id: t.id,
					pricing_model: draft.pricing_model,
					base_price: isNaN(basePriceNum as number) ? null : basePriceNum,
					price_details: draft.price_details || null,
					is_available: true,
				})
			}
		})

		try {
			setIsSaving(true)
			const payload = buildLaboratoryProfileUpdatePayload(profileData ?? null, {
				operating_hours: operatingHours,
				open_days: openDays,
				payment_methods: formData.paymentMethods,
			})
			const [profileRes, testsRes] = await Promise.all([
				updateLaboratoryProfile(payload),
				updateMyTests({ tests: testsPayload }),
			])

			if (profileRes?.success === false) {
				setStatusModal({
					visible: true,
					status: 'error',
					title: 'Error',
					description: profileRes.message || 'Unable to save services right now.',
				})
				return
			}

			onProfileChange?.((current) =>
				profileRes.data ??
				mergeLaboratoryProfileData(current, {
					details: {
						...(current?.details ?? {}),
						operating_hours: operatingHours,
						open_days: openDays,
						payment_methods: formData.paymentMethods,
					},
				})
			)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Services & Tests catalog saved successfully.',
			})
		} catch (error) {
			console.error('[LaboratoryServicesTab] save error:', error)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to save services right now.',
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
		<View style={styles.root}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={[
					styles.contentContainer,
					{ paddingHorizontal: sectionPadding, paddingTop: sectionPadding, paddingBottom: 100 },
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

					<SectionCard title="Tests Offered (Catalog)" icon="magnify">
						{catalogLoading ? (
							<ActivityIndicator size="small" color="#0c7c7c" style={{ padding: 12 }} />
						) : (
							testTypes.map((t, idx) => {
								const draft = catalogDraft[t.id] || {
									is_available: false,
									pricing_model: 'starting_from' as const,
									base_price: '',
									price_details: '',
								}

								return (
									<View key={t.id} style={styles.testItem}>
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
															onChangeText={(text) => handleBasePriceChange(t.id, text.replace(/\D/g, ''))}
															placeholder="e.g. 500"
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
														placeholder="e.g. Includes report within 24 hrs"
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
				</View>
			</ScrollView>

			<AppStickyFooter onPress={handleSave} disabled={isSaving} loading={isSaving}>
				Save
			</AppStickyFooter>

			{statusModal ? (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: '#f8fafc' },
	container: { flex: 1, backgroundColor: '#f8fafc' },
	contentContainer: { flexGrow: 1, alignItems: 'center', backgroundColor: '#f8fafc' },
	contentShell: { width: '100%' },
	sectionCard: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#e4ecef',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		padding: 16,
	},
	sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
	sectionTitle: {
		color: '#253136',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	sectionBody: { gap: 14 },
	testItem: {
		width: '100%',
	},
	pricingConfig: {
		marginTop: 12,
		paddingLeft: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#0c7c7c',
		gap: 8,
	},
	rowDivider: {
		height: 1,
		backgroundColor: '#edf2f4',
		width: '100%',
		marginVertical: 12,
	},
	formRow: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: -10 },
	formRowCompact: { marginHorizontal: -8 },
	formRowStacked: { flexDirection: 'column', marginHorizontal: 0 },
	formCell: { flex: 1, minWidth: 0 },
	formCellLeft: { paddingHorizontal: 10 },
	formCellRight: { paddingHorizontal: 10 },
	formCellStacked: { width: '100%', marginTop: 14 },
	formCellStackedFirst: { marginTop: 0 },
	fieldGroup: { width: '100%' },
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: { color: '#ef5d5d', fontSize: 14, lineHeight: 20, fontWeight: '600' },
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
})
