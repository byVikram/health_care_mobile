// src/features/laboratory/PlaceLabOrderPage.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import { buildS3Url } from '../../utils/s3Utils'
import {
	AppButton,
	AppBottomSheet,
	AppCalendar,
	AppInput,
	AppSelect,
	AppTypography,
	ProviderDetailsCard,
	StatusModal,
} from '../../components/common'
import {
	PatientAddress,
	TreatmentRecord,
	createPatientAddress,
	getPatientAddresses,
	getPatientTreatmentHistory,
} from '../profile/patient/PatientProfileService'
import { getLabTestTypes, placeLabOrder } from './laboratoryService'
import type { LabTestType, PlaceLabOrderPayload } from './laboratory'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type PlaceLabOrderParams = {
	labId: string
	labName: string
	labAddress?: string
	labCity?: string
	labPhone?: string
	labAvatarKey?: string | null
	labOperatingHours?: { open: string; close: string }
	labIs24x7?: boolean
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Group test types by category for display.
 * Since the API doesn't return a category field, we display them in a single group.
 */
const groupByCategory = (tests: LabTestType[]): Record<string, LabTestType[]> => {
	const map: Record<string, LabTestType[]> = {}
	for (const t of tests) {
		const key = t.category || 'Available Tests'
		if (!map[key]) map[key] = []
		map[key].push(t)
	}
	return map
}

/**
 * Format a price for display on a test row.
 * base_price === 0 means quote_required from the API mapping.
 */
const formatTestPrice = (test: LabTestType): string => {
	if (!test.base_price || test.base_price === 0) return 'Quote on request'
	return `₹${test.base_price.toLocaleString('en-IN')}`
}

// Schedule helpers — mirrors RadiologyBookingPage so the Schedule & Notes step
// behaves identically across both booking flows.
const TIME_SLOTS = [
	{ label: 'Morning', value: 'Morning' },
	{ label: 'Afternoon', value: 'Afternoon' },
	{ label: 'Evening', value: 'Evening' },
]

const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const calendarToApiDate = (dateStr: string): string => {
	if (!dateStr) return ''
	const [day, month, year] = dateStr.split('-')
	return `${year}-${month}-${day}`
}

const formatProviderHours = (hours?: { open?: string; close?: string }) => {
	if (!hours?.open || !hours?.close) return undefined
	return [{ label: 'Daily', value: `${hours.open} - ${hours.close}` }]
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function PlaceLabOrderPage() {
	const navigation = useNavigation<any>()
	const route = useRoute()
	const insets = useSafeAreaInsets()
	const { user } = useAuth()
	const {
		labId,
		labName,
		labAddress,
		labCity,
		labPhone,
		labAvatarKey,
		labOperatingHours,
		labIs24x7,
	} = route.params as PlaceLabOrderParams

	// ── Step 1: Doctor Consultation (referral) ────────────────────────────
	const [treatments, setTreatments] = useState<TreatmentRecord[]>([])
	const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null)
	const [loadingTreatments, setLoadingTreatments] = useState(true)
	const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)

	// ── Step 2: Test types ──────────────────────────────────────────────
	const [testTypes, setTestTypes] = useState<LabTestType[]>([])
	const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
	const [customTests, setCustomTests] = useState('')
	const [loadingTests, setLoadingTests] = useState(true)
	const [testsError, setTestsError] = useState<string | null>(null)

	// ── Step 3: Collection type ─────────────────────────────────────────
	const [collectionType, setCollectionType] = useState<'walk_in' | 'home_collection'>('walk_in')

	// ── Addresses (part of Step 3 when home collection is chosen) ─────────
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
	const [loadingAddresses, setLoadingAddresses] = useState(false)

	// ── Add address sheet ────────────────────────────────────────────────
	const [showAddressModal, setShowAddressModal] = useState(false)
	const [newLabel, setNewLabel] = useState('')
	const [newLine, setNewLine] = useState('')
	const [newCity, setNewCity] = useState('')
	const [newState, setNewState] = useState('')
	const [newPincode, setNewPincode] = useState('')
	const [savingAddress, setSavingAddress] = useState(false)

	// ── Step 4: Schedule & Notes ────────────────────────────────────────
	const [calendarDate, setCalendarDate] = useState('')
	const [bookingTime, setBookingTime] = useState('')
	const [notes, setNotes] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// ── Status modal ─────────────────────────────────────────────────────
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// ── Fetch consultations / treatments (Step 1) ─────────────────────────
	useEffect(() => {
		const fetchTreatments = async () => {
			if (!user?.id) {
				setLoadingTreatments(false)
				return
			}
			try {
				setLoadingTreatments(true)
				const data = await getPatientTreatmentHistory(user.id)
				setTreatments(data)
				if (data.length > 0) {
					setSelectedTreatmentId(data[0].id)
				}
			} catch (err: any) {
				const msg = err?.response?.data?.detail || err?.message || 'Failed to load consultations'
				console.error('[PlaceLabOrderPage] fetchTreatments error:', msg)
				Toast.show({ type: 'error', text1: 'Error', text2: msg })
			} finally {
				setLoadingTreatments(false)
			}
		}
		fetchTreatments()
	}, [user?.id])

	// ── Fetch test types for this lab (Step 2) ────────────────────────────
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			try {
				setLoadingTests(true)
				setTestsError(null)
				const data = await getLabTestTypes(labId)
				if (!cancelled) setTestTypes(data)
			} catch (err: any) {
				if (!cancelled) {
					const msg = err?.message || 'Failed to load test types'
					setTestsError(msg)
					Toast.show({ type: 'error', text1: 'Error', text2: msg })
				}
			} finally {
				if (!cancelled) setLoadingTests(false)
			}
		}
		load()
		return () => { cancelled = true }
	}, [labId])

	// ── Fetch patient addresses when home collection is selected (Step 3) ─
	const loadAddresses = useCallback(async () => {
		try {
			setLoadingAddresses(true)
			const list = await getPatientAddresses()
			setAddresses(list)
			const def = list.find((a) => a.is_default)
			setSelectedAddressId(def?.id ?? list[0]?.id ?? null)
		} catch {
			// silent — user can still add one
		} finally {
			setLoadingAddresses(false)
		}
	}, [])

	useEffect(() => {
		if (collectionType === 'home_collection') loadAddresses()
	}, [collectionType, loadAddresses])

	// ── Toggle test selection ────────────────────────────────────────────
	const toggleTest = (id: string) => {
		setSelectedTestIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		)
	}

	// ── Add address ──────────────────────────────────────────────────────
	const handleAddAddress = async () => {
		if (
			!newLabel.trim() ||
			!newLine.trim() ||
			!newCity.trim() ||
			!newState.trim() ||
			!newPincode.trim()
		) {
			Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all address fields.' })
			return
		}
		setSavingAddress(true)
		try {
			await createPatientAddress({
				label: newLabel,
				address_line: newLine,
				city: newCity,
				state: newState,
				pincode: newPincode,
				is_default: addresses.length === 0,
			})
			Toast.show({ type: 'success', text1: 'Success', text2: 'Address added.' })
			setNewLabel('')
			setNewLine('')
			setNewCity('')
			setNewState('')
			setNewPincode('')
			setShowAddressModal(false)
			await loadAddresses()
		} catch (err: any) {
			Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Failed to add address' })
		} finally {
			setSavingAddress(false)
		}
	}

	// ── Place order ──────────────────────────────────────────────────────
	const handlePlaceOrder = async () => {
		if (!selectedTreatmentId) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a consultation with a diagnosis.' })
			return
		}
		if (selectedTestIds.length === 0) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select at least one test.' })
			return
		}
		if (collectionType === 'home_collection' && !selectedAddressId) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a collection address.' })
			return
		}
		if (!calendarDate) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a preferred booking date.' })
			return
		}
		const apiDate = calendarToApiDate(calendarDate)
		if (!isValidIsoDate(apiDate)) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a valid booking date.' })
			return
		}
		if (!bookingTime) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a preferred time slot.' })
			return
		}

		setSubmitting(true)
		try {
			const payload: PlaceLabOrderPayload = {
				laboratory_public_id: labId,
				test_type_ids: selectedTestIds,
				custom_tests: customTests.trim(),
				collection_type: collectionType,
				collection_address_public_id:
					collectionType === 'home_collection' ? selectedAddressId : null,
				treatment_id: selectedTreatmentId,
				booking_date: apiDate,
				booking_time: bookingTime,
				notes: [notes.trim(), customTests.trim() ? `Custom tests requested: ${customTests.trim()}` : '']
					.filter(Boolean)
					.join('\n') || null,
			}
			await placeLabOrder(payload)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Booking Confirmed!',
				description: `Your lab test booking has been successfully submitted to ${labName}.`,
			})
		} catch (err: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Booking Failed',
				description: err?.message || 'Something went wrong. Please try again.',
			})
		} finally {
			setSubmitting(false)
		}
	}

	// ── Computed values ──────────────────────────────────────────────────
	const selectedTreatment = treatments.find((t) => t.id === selectedTreatmentId)

	const treatmentOptions = treatments.map((t) => {
		const dateStr = new Date(t.created_at).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
		const docStr = t.doctor_name ? ` - ${t.doctor_name}` : ''
		const hospStr = t.hospital_name ? ` (${t.hospital_name})` : ''
		return { label: `${dateStr}${docStr}${hospStr}`, value: t.id }
	})

	const grouped = groupByCategory(testTypes)
	const selectedTests = testTypes.filter((t) => selectedTestIds.includes(t.id))
	const estimatedTotal = selectedTests.reduce((sum, t) => sum + (t.base_price ?? 0), 0)
	const hasQuoteRequired = selectedTests.some((t) => !t.base_price || t.base_price === 0)

	// ── Render: Step 1 — consultation selector ─────────────────────────────
	const renderConsultationSelector = () => {
		if (loadingTreatments) {
			return (
				<View style={styles.spinnerContainer}>
					<ActivityIndicator size="small" color="#2B6F71" />
					<Text style={styles.loadingText}>Fetching consultations...</Text>
				</View>
			)
		}

		if (treatments.length === 0) {
			return (
				<View style={styles.emptyContainer}>
					<MaterialCommunityIcons name="note-text-outline" size={36} color="#90a4ae" />
					<Text style={styles.emptyMessage}>
						No consultation history found. A valid referral diagnosis is required to book a test.
					</Text>
				</View>
			)
		}

		return (
			<View style={styles.dropdownContainer}>
				<AppSelect
					label="Select Consultation"
					placeholder="Choose consultation"
					options={treatmentOptions}
					value={selectedTreatmentId || undefined}
					onSelect={(val) => setSelectedTreatmentId(val)}
					size="form"
					noMargin
				/>

				{selectedTreatment && (
					<View style={styles.detailCard}>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Consultation Date:</Text>
							<Text style={styles.detailValue}>
								{new Date(selectedTreatment.created_at).toLocaleDateString('en-IN', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
									year: 'numeric',
								})}
							</Text>
						</View>

						{selectedTreatment.notes ? (
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Diagnosis / Notes:</Text>
								<Text style={styles.detailNotes}>{selectedTreatment.notes}</Text>
							</View>
						) : null}

						{selectedTreatment.doctor_name ? (
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Referring Doctor:</Text>
								<Text style={styles.detailValue}>{selectedTreatment.doctor_name}</Text>
							</View>
						) : null}

						{selectedTreatment.prescription_s3_key ? (
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Diagnosis Document (Tap to view full screen):</Text>
								<TouchableOpacity
									style={styles.imageCard}
									onPress={() => setIsImageViewerOpen(true)}
									activeOpacity={0.9}
								>
									<Image
										source={{ uri: buildS3Url(selectedTreatment.prescription_s3_key) || undefined }}
										style={styles.prescriptionImage}
										resizeMode="contain"
									/>
									<View style={styles.imageKeyInfo}>
										<MaterialCommunityIcons name="fullscreen" size={16} color="#2B6F71" />
										<Text style={styles.imageKeyText} numberOfLines={1}>
											Tap to expand Diagnosis document
										</Text>
									</View>
								</TouchableOpacity>
							</View>
						) : null}
					</View>
				)}
			</View>
		)
	}

	// ── Render: Step 2 — test selector ────────────────────────────────────
	const renderTestSelector = () => {
		if (loadingTests) {
			return (
				<View style={styles.spinnerContainer}>
					<ActivityIndicator size="small" color="#2B6F71" />
					<Text style={styles.loadingText}>Loading available tests…</Text>
				</View>
			)
		}

		if (testsError) {
			return (
				<View style={styles.emptyContainer}>
					<MaterialCommunityIcons name="alert-circle-outline" size={36} color="#C62828" />
					<Text style={[styles.emptyMessage, { color: '#C62828' }]}>{testsError}</Text>
					<TouchableOpacity
						style={styles.retryBtn}
						onPress={() => {
							setTestsError(null)
							setLoadingTests(true)
							getLabTestTypes(labId)
								.then(setTestTypes)
								.catch((e) => setTestsError(e?.message || 'Failed'))
								.finally(() => setLoadingTests(false))
						}}
					>
						<Text style={styles.retryBtnText}>Retry</Text>
					</TouchableOpacity>
				</View>
			)
		}

		if (testTypes.length === 0) {
			return (
				<View style={styles.emptyContainer}>
					<MaterialCommunityIcons name="flask-outline" size={36} color="#90a4ae" />
					<Text style={styles.emptyMessage}>No tests available for this laboratory.</Text>
					<Text style={styles.emptySubMessage}>You can still enter custom tests below.</Text>
				</View>
			)
		}

		return (
			<>
				{Object.entries(grouped).map(([category, tests]) => (
					<View key={category} style={styles.categoryBlock}>
						<Text style={styles.categoryLabel}>{category}</Text>
						{tests.map((test) => {
							const selected = selectedTestIds.includes(test.id)
							return (
								<TouchableOpacity
									key={test.id}
									style={[styles.testRow, selected && styles.testRowSelected]}
									onPress={() => toggleTest(test.id)}
									activeOpacity={0.8}
								>
									<View style={[styles.checkbox, selected && styles.checkboxSelected]}>
										{selected && (
											<MaterialCommunityIcons name="check" size={14} color="#fff" />
										)}
									</View>
									<View style={styles.testInfo}>
										<Text style={[styles.testName, selected && styles.testNameSelected]}>
											{test.name}
										</Text>
										{test.turnaround ? (
											<Text style={styles.testMeta}>Result in {test.turnaround}</Text>
										) : null}
										{test.description ? (
											<Text style={styles.testDescription} numberOfLines={2}>
												{test.description}
											</Text>
										) : null}
									</View>
									<Text style={[styles.testPrice, selected && { color: '#2B6F71' }]}>
										{formatTestPrice(test)}
									</Text>
								</TouchableOpacity>
							)
						})}
					</View>
				))}

				{selectedTestIds.length > 0 && (
					<View style={styles.selectionSummary}>
						<View style={styles.selectionSummaryLeft}>
							<MaterialCommunityIcons name="check-circle-outline" size={16} color="#2B6F71" />
							<Text style={styles.selectionSummaryText}>
								{selectedTestIds.length} test{selectedTestIds.length > 1 ? 's' : ''} selected
							</Text>
						</View>
						<View style={styles.selectionSummaryRight}>
							{estimatedTotal > 0 && (
								<Text style={styles.selectionTotal}>
									{hasQuoteRequired
										? `₹${estimatedTotal.toLocaleString('en-IN')}+`
										: `₹${estimatedTotal.toLocaleString('en-IN')}`}
								</Text>
							)}
							<TouchableOpacity onPress={() => setSelectedTestIds([])}>
								<Text style={styles.clearSelectionText}>Clear</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* Custom tests input */}
				<View style={styles.customTestBlock}>
					<Text style={styles.customTestLabel}>Other / Custom Tests</Text>
					<Text style={styles.customTestHint}>
						Enter test names not listed above, separated by commas
					</Text>
					<AppInput
						placeholder="e.g. Semen Analysis, ANA Profile…"
						value={customTests}
						onChangeText={setCustomTests}
						multiline
						numberOfLines={3}
						fieldSize="form"
						noMargin
						style={styles.customTestInput}
					/>
				</View>
			</>
		)
	}

	// ── Render: address section (part of Step 3) ───────────────────────────
	const renderAddressSection = () => {
		if (loadingAddresses) {
			return (
				<View style={[styles.spinnerContainer, { paddingVertical: 12 }]}>
					<ActivityIndicator size="small" color="#2B6F71" />
					<Text style={styles.loadingText}>Loading addresses…</Text>
				</View>
			)
		}

		if (addresses.length === 0) {
			return (
				<View style={styles.addressEmptyCard}>
					<MaterialCommunityIcons name="map-marker-question-outline" size={28} color="#90a4ae" />
					<Text style={styles.addressEmptyMsg}>No addresses saved yet.</Text>
					<TouchableOpacity
						style={styles.addAddressPrimaryBtn}
						onPress={() => setShowAddressModal(true)}
					>
						<Text style={styles.addAddressPrimaryBtnTxt}>+ Add Address</Text>
					</TouchableOpacity>
				</View>
			)
		}

		return (
			<>
				{addresses.map((addr) => {
					const isSelected = addr.id === selectedAddressId
					return (
						<TouchableOpacity
							key={addr.id}
							style={[styles.addressCard, isSelected && styles.addressCardSelected]}
							onPress={() => setSelectedAddressId(addr.id)}
							activeOpacity={0.8}
						>
							<View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
								{isSelected && <View style={styles.radioDot} />}
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.addressLabel}>{addr.label}</Text>
								<Text style={styles.addressLine}>
									{addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
								</Text>
							</View>
							{addr.is_default && (
								<View style={styles.defaultBadge}>
									<Text style={styles.defaultBadgeText}>Default</Text>
								</View>
							)}
						</TouchableOpacity>
					)
				})}
				<TouchableOpacity
					style={styles.inlineAddAddressBtn}
					onPress={() => setShowAddressModal(true)}
				>
					<MaterialCommunityIcons name="plus" size={16} color="#2B6F71" />
					<Text style={styles.inlineAddAddressTxt}>Add New Address</Text>
				</TouchableOpacity>
			</>
		)
	}

	// ── Main render ──────────────────────────────────────────────────────
	return (
		<View style={styles.safe}>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: Math.max(insets.bottom + 100, 120) },
				]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<ProviderDetailsCard
					name={labName}
					subtitle="Booking Lab Tests At"
					icon="flask-plus"
					imageUri={buildS3Url(labAvatarKey) || undefined}
					address={labAddress}
					city={labCity}
					phone={labPhone}
					hours={labIs24x7 ? undefined : formatProviderHours(labOperatingHours)}
					is24x7={labIs24x7}
					accentColor="#2B6F71"
				/>

				{/* Select Doctor Consultation */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Select Doctor Consultation
						</AppTypography>
					</View>
					{renderConsultationSelector()}
				</View>

				{/* Step 1: Select Tests */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>1</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Select Test
						</AppTypography>
					</View>
					{renderTestSelector()}
				</View>

				{/* Step 2: Collection Preferences */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>2</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Collection Preferences
						</AppTypography>
					</View>

					<View style={styles.collectionSelectorRow}>
						<TouchableOpacity
							style={[
								styles.collectionSelectorBtn,
								collectionType === 'walk_in' && styles.collectionSelectorBtnActive,
							]}
							onPress={() => setCollectionType('walk_in')}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons
								name="walk"
								size={22}
								color={collectionType === 'walk_in' ? '#fff' : '#667085'}
							/>
							<Text
								style={[
									styles.collectionSelectorLabel,
									collectionType === 'walk_in' && styles.collectionSelectorLabelActive,
								]}
							>
								Walk-in
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.collectionSelectorBtn,
								collectionType === 'home_collection' && styles.collectionSelectorBtnActive,
							]}
							onPress={() => setCollectionType('home_collection')}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons
								name="home-map-marker"
								size={22}
								color={collectionType === 'home_collection' ? '#fff' : '#667085'}
							/>
							<Text
								style={[
									styles.collectionSelectorLabel,
									collectionType === 'home_collection' && styles.collectionSelectorLabelActive,
								]}
							>
								Home Collection
							</Text>
						</TouchableOpacity>
					</View>

					{collectionType === 'walk_in' ? (
						<View style={styles.infoPanel}>
							<MaterialCommunityIcons
								name="information-outline"
								size={18}
								color="#2B6F71"
								style={{ marginTop: 2 }}
							/>
							<View style={{ flex: 1 }}>
								<Text style={styles.infoPanelTitle}>Visit the Lab</Text>
								<Text style={styles.infoPanelSub}>
									Visit {labName} at your convenience. Carry a valid ID and any prior reports if
									needed. Results will be shared digitally.
								</Text>
							</View>
						</View>
					) : (
						<View style={[styles.infoPanel, { flexDirection: 'column', alignItems: 'stretch' }]}>
							<View style={styles.addressSectionHeader}>
								<Text style={styles.infoPanelTitle}>Select Collection Address</Text>
							</View>
							{renderAddressSection()}
						</View>
					)}
				</View>

				{/* Step 3: Schedule Notes */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>3</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Schedule Notes
						</AppTypography>
					</View>

					<View style={styles.bookingFields}>
						<AppCalendar
							label="Preferred Date"
							value={calendarDate}
							onChange={setCalendarDate}
							placeholder="Select Date"
							required
							isMobile
							modalTitle="Select Appointment Date"
							minimumDate={new Date()}
						/>

						<AppSelect
							label="Preferred Time"
							placeholder="Choose a time slot"
							options={TIME_SLOTS}
							value={bookingTime || undefined}
							onSelect={(val) => setBookingTime(val)}
							size="form"
						/>

						<AppInput
							label="Additional Notes / Instructions"
							placeholder="e.g. Fasting required, preferred timing, prior conditions to note…"
							value={notes}
							onChangeText={setNotes}
							multiline
							numberOfLines={4}
							fieldSize="form"
							noMargin
							style={styles.remarksInput}
						/>
					</View>
				</View>
			</ScrollView>

			{/* Fixed bottom action */}
			<View style={[styles.bottomActionContainer, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
				<AppButton
					variant="primary"
					onPress={handlePlaceOrder}
					loading={submitting}
					disabled={submitting || loadingTests || loadingTreatments}
					style={styles.submitBtn}
				>
					Confirm & Book Tests
				</AppButton>
			</View>

			{/* Add Address Bottom Sheet */}
			<AppBottomSheet
				visible={showAddressModal}
				title="Add Collection Address"
				onClose={() => {
					if (!savingAddress) setShowAddressModal(false)
				}}
			>
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
					<ScrollView
						contentContainerStyle={styles.sheetBody}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<AppInput
							label="Label (e.g. Home, Work)"
							placeholder="Address label"
							value={newLabel}
							onChangeText={setNewLabel}
							fieldSize="form"
						/>
						<AppInput
							label="Street / Address Line"
							placeholder="Building, street name"
							value={newLine}
							onChangeText={setNewLine}
							fieldSize="form"
						/>
						<AppInput
							label="City"
							placeholder="City"
							value={newCity}
							onChangeText={setNewCity}
							fieldSize="form"
						/>
						<View style={styles.rowFields}>
							<View style={{ flex: 1, marginRight: 8 }}>
								<AppInput
									label="State"
									placeholder="State"
									value={newState}
									onChangeText={setNewState}
									fieldSize="form"
								/>
							</View>
							<View style={{ flex: 1 }}>
								<AppInput
									label="Pincode"
									placeholder="Pincode"
									value={newPincode}
									onChangeText={(v) => setNewPincode(v.replace(/\D/g, ''))}
									keyboardType="numeric"
									maxLength={6}
									fieldSize="form"
								/>
							</View>
						</View>
						<AppButton
							variant="primary"
							onPress={handleAddAddress}
							loading={savingAddress}
							disabled={savingAddress}
							style={styles.saveAddressBtn}
						>
							Save Address
						</AppButton>
					</ScrollView>
				</KeyboardAvoidingView>
			</AppBottomSheet>

			{/* Diagnosis Document Image Viewer Lightbox */}
			<Modal
				visible={isImageViewerOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsImageViewerOpen(false)}
			>
				<View style={styles.viewerOverlay}>
					<TouchableOpacity
						style={styles.viewerBackdrop}
						onPress={() => setIsImageViewerOpen(false)}
						activeOpacity={1}
					/>
					<TouchableOpacity
						style={[styles.viewerCloseBtn, { top: Math.max(insets.top, 24) }]}
						onPress={() => setIsImageViewerOpen(false)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="close" size={24} color="#fff" />
					</TouchableOpacity>

					{selectedTreatment?.prescription_s3_key && (
						<Image
							source={{ uri: buildS3Url(selectedTreatment.prescription_s3_key) || undefined }}
							style={styles.fullScreenImage}
							resizeMode="contain"
						/>
					)}
				</View>
			</Modal>

			{/* Status Modal */}
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => {
						setStatusModal(null)
						if (statusModal.status === 'success') {
							navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
						}
					}}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#F5F7FA' },
	scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

	// Banner
	labBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E8F5F5',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#c6e0e0',
		padding: 16,
		marginBottom: 16,
		gap: 12,
	},
	bannerLabel: { fontSize: 12, color: '#2B6F71', fontWeight: '600', marginBottom: 2 },
	bannerTitle: { fontSize: 18, fontWeight: '700', color: '#101828' },

	// Section card
	sectionCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 1,
	},
	sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
	stepBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	sectionTitle: { fontSize: 16, fontWeight: '700', color: '#101828' },

	// Loading / empty
	spinnerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },
	loadingText: { fontSize: 13, color: '#667085' },
	emptyContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
	emptyMessage: { fontSize: 13, color: '#667085', textAlign: 'center' },
	emptySubMessage: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
	retryBtn: {
		backgroundColor: '#E8F5F5',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginTop: 4,
	},
	retryBtnText: { fontSize: 13, color: '#2B6F71', fontWeight: '600' },

	// Consultation selector (Step 1)
	dropdownContainer: { marginTop: 4 },
	detailCard: {
		marginTop: 14,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECEF',
		padding: 14,
	},
	detailRow: { paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EAECEF' },
	detailLabel: { fontSize: 12, color: '#667085', fontWeight: '500', marginBottom: 3 },
	detailValue: { fontSize: 14, color: '#101828', fontWeight: '600' },
	detailNotes: { fontSize: 14, color: '#475467', lineHeight: 20 },
	imageCard: {
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 8,
		marginTop: 4,
	},
	prescriptionImage: { width: '100%', height: 200, backgroundColor: '#f2f4f7', borderRadius: 8, marginTop: 4 },
	imageKeyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
		backgroundColor: '#F8F9FA',
		padding: 6,
		borderRadius: 6,
	},
	imageKeyText: { fontSize: 11, color: '#475467', flex: 1 },

	// Test list (Step 2)
	categoryBlock: { marginBottom: 14 },
	categoryLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#64707d',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	testRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8F9FA',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 12,
		marginBottom: 8,
		gap: 10,
	},
	testRowSelected: { backgroundColor: '#E8F5F5', borderColor: '#2B6F71' },
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#D0D5DD',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		flexShrink: 0,
	},
	checkboxSelected: { backgroundColor: '#2B6F71', borderColor: '#2B6F71' },
	testInfo: { flex: 1 },
	testName: { fontSize: 13, fontWeight: '600', color: '#344054' },
	testNameSelected: { color: '#2B6F71' },
	testMeta: { fontSize: 11, color: '#667085', marginTop: 2 },
	testDescription: { fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 16 },
	testPrice: { fontSize: 12, fontWeight: '700', color: '#344054', flexShrink: 0 },

	// Selection summary
	selectionSummary: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#E8F5F5',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginBottom: 12,
	},
	selectionSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	selectionSummaryText: { fontSize: 13, color: '#2B6F71', fontWeight: '600' },
	selectionSummaryRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	selectionTotal: { fontSize: 13, fontWeight: '700', color: '#2B6F71' },
	clearSelectionText: { fontSize: 12, color: '#667085', fontWeight: '600' },

	// Custom tests
	customTestBlock: { marginTop: 4 },
	customTestLabel: { fontSize: 13, fontWeight: '600', color: '#344054', marginBottom: 4 },
	customTestHint: { fontSize: 11, color: '#94A3B8', marginBottom: 8 },
	customTestInput: { fontSize: 13, textAlignVertical: 'top', minHeight: 80 },

	// Collection toggle (Step 3)
	collectionSelectorRow: {
		flexDirection: 'row',
		backgroundColor: '#F2F4F7',
		borderRadius: 12,
		padding: 4,
		marginBottom: 12,
		gap: 4,
	},
	collectionSelectorBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		gap: 6,
	},
	collectionSelectorBtnActive: { backgroundColor: '#2B6F71' },
	collectionSelectorLabel: { fontSize: 14, fontWeight: '600', color: '#667085' },
	collectionSelectorLabelActive: { color: '#fff' },

	// Info panel
	infoPanel: {
		flexDirection: 'row',
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECEF',
		padding: 12,
		gap: 10,
	},
	infoPanelTitle: { fontSize: 14, fontWeight: '700', color: '#101828', marginBottom: 4 },
	infoPanelSub: { fontSize: 12, color: '#475467', lineHeight: 18 },
	addressSectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},

	// Address cards
	addressCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 12,
		marginBottom: 8,
		gap: 10,
	},
	addressCardSelected: { borderColor: '#2B6F71', backgroundColor: '#E8F5F5' },
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#D0D5DD',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	radioCircleSelected: { borderColor: '#2B6F71' },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2B6F71' },
	addressLabel: { fontSize: 13, fontWeight: '700', color: '#101828', marginBottom: 2 },
	addressLine: { fontSize: 12, color: '#475467', lineHeight: 16 },
	defaultBadge: { backgroundColor: '#E8F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
	defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#2B6F71' },
	inlineAddAddressBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 8,
		alignSelf: 'flex-start',
	},
	inlineAddAddressTxt: { fontSize: 13, color: '#2B6F71', fontWeight: '700' },
	addressEmptyCard: { alignItems: 'center', paddingVertical: 16, gap: 8 },
	addressEmptyMsg: { fontSize: 12, color: '#667085' },
	addAddressPrimaryBtn: {
		backgroundColor: '#E8F5F5',
		borderColor: '#c6e0e0',
		borderWidth: 1,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	addAddressPrimaryBtnTxt: { fontSize: 12, color: '#2B6F71', fontWeight: '600' },

	// Schedule & Notes (Step 4)
	bookingFields: { gap: 12 },
	remarksInput: { fontSize: 13, textAlignVertical: 'top', minHeight: 100 },

	// Bottom action
	bottomActionContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#EAECF0',
		paddingHorizontal: 16,
		paddingTop: 12,
		shadowColor: '#101828',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 8,
	},
	submitBtn: { width: '100%' },

	// Address sheet
	sheetBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
	rowFields: { flexDirection: 'row', justifyContent: 'space-between' },
	saveAddressBtn: { width: '100%', marginTop: 16 },

	// Diagnosis document viewer (Step 1)
	viewerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
	viewerBackdrop: { ...StyleSheet.absoluteFill },
	viewerCloseBtn: {
		position: 'absolute',
		right: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 10,
	},
	fullScreenImage: { width: '90%', height: '80%' },
})
