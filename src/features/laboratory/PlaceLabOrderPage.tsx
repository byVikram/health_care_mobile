// src/features/Laboratory/screens/PlaceLabOrderPage.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { AppButton, AppBottomSheet, AppInput, AppTypography, StatusModal } from '../../components/common'
import { PatientAddress, getPatientAddresses, createPatientAddress } from '../pharmacy/pharmacyService'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type RouteProps = RouteProp<AppStackParamList, typeof ROUTES.STACK.PLACE_LAB_ORDER>

export interface LabTestType {
	id: string
	name: string
	category: string
	turnaround: string // e.g. "Same Day", "24 hrs", "48 hrs"
}

export interface PlaceLabOrderPayload {
	laboratory_public_id: string
	test_type_ids: string[]
	custom_tests: string // free text
	collection_type: 'walk_in' | 'home_collection'
	collection_address_public_id: string | null
	notes: string | null
}

// ─────────────────────────────────────────────
// Mock data  ← remove once API is ready
// ─────────────────────────────────────────────

const MOCK_TEST_TYPES: LabTestType[] = [
	{ id: 'tt-001', name: 'Complete Blood Count (CBC)', category: 'Haematology', turnaround: 'Same Day' },
	{ id: 'tt-002', name: 'Blood Glucose (Fasting)', category: 'Biochemistry', turnaround: 'Same Day' },
	{ id: 'tt-003', name: 'HbA1c', category: 'Biochemistry', turnaround: '24 hrs' },
	{ id: 'tt-004', name: 'Lipid Profile', category: 'Biochemistry', turnaround: '24 hrs' },
	{ id: 'tt-005', name: 'Liver Function Test (LFT)', category: 'Biochemistry', turnaround: '24 hrs' },
	{ id: 'tt-006', name: 'Kidney Function Test (KFT)', category: 'Biochemistry', turnaround: '24 hrs' },
	{ id: 'tt-007', name: 'Thyroid Profile (T3/T4/TSH)', category: 'Endocrinology', turnaround: '24 hrs' },
	{ id: 'tt-008', name: 'Urine Routine & Microscopy', category: 'Urology', turnaround: 'Same Day' },
	{ id: 'tt-009', name: 'Vitamin D (25-OH)', category: 'Biochemistry', turnaround: '48 hrs' },
	{ id: 'tt-010', name: 'Vitamin B12', category: 'Biochemistry', turnaround: '48 hrs' },
	{ id: 'tt-011', name: 'HIV I & II (ELISA)', category: 'Serology', turnaround: '24 hrs' },
	{ id: 'tt-012', name: 'HBsAg (Hepatitis B)', category: 'Serology', turnaround: '24 hrs' },
	{ id: 'tt-013', name: 'Dengue NS1 Antigen', category: 'Serology', turnaround: 'Same Day' },
	{ id: 'tt-014', name: 'Malaria Antigen Test', category: 'Serology', turnaround: 'Same Day' },
	{ id: 'tt-015', name: 'Chest X-Ray', category: 'Radiology', turnaround: 'Same Day' },
	{ id: 'tt-016', name: 'ECG (12-Lead)', category: 'Cardiology', turnaround: 'Same Day' },
	{ id: 'tt-017', name: 'Stool Routine & Microscopy', category: 'Microbiology', turnaround: '24 hrs' },
	{ id: 'tt-018', name: 'Culture & Sensitivity (Urine)', category: 'Microbiology', turnaround: '48 hrs' },
]

// TODO: replace with real API call
const USE_MOCK = true

const fetchLabTestTypes = async (_labId: string): Promise<LabTestType[]> => {
	if (USE_MOCK) {
		return new Promise((resolve) => setTimeout(() => resolve(MOCK_TEST_TYPES), 600))
	}
	// const res = await ApiService.get(API_ENDPOINTS.LABORATORY.TEST_TYPES(_labId))
	// return res.data?.data ?? []
	return []
}

const createLabOrder = async (payload: PlaceLabOrderPayload): Promise<void> => {
	if (USE_MOCK) {
		return new Promise((resolve) => setTimeout(resolve, 800))
	}
	// await ApiService.post(API_ENDPOINTS.LABORATORY.ORDERS, payload)
}

// ─────────────────────────────────────────────
// Category grouping helper
// ─────────────────────────────────────────────

const groupByCategory = (tests: LabTestType[]) => {
	const map: Record<string, LabTestType[]> = {}
	for (const t of tests) {
		if (!map[t.category]) map[t.category] = []
		map[t.category].push(t)
	}
	return map
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function PlaceLabOrderPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProps>()
	const insets = useSafeAreaInsets()
	const { user } = useAuth()
	const { labId, labName } = route.params

	// Test types
	const [testTypes, setTestTypes] = useState<LabTestType[]>([])
	const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
	const [customTests, setCustomTests] = useState('')
	const [loadingTests, setLoadingTests] = useState(true)

	// Collection type
	const [collectionType, setCollectionType] = useState<'walk_in' | 'home_collection'>('walk_in')

	// Addresses
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
	const [loadingAddresses, setLoadingAddresses] = useState(false)

	// Add address sheet
	const [showAddressModal, setShowAddressModal] = useState(false)
	const [newLabel, setNewLabel] = useState('')
	const [newLine, setNewLine] = useState('')
	const [newCity, setNewCity] = useState('')
	const [newState, setNewState] = useState('')
	const [newPincode, setNewPincode] = useState('')
	const [savingAddress, setSavingAddress] = useState(false)

	// Notes & submit
	const [notes, setNotes] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// Status modal
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// ── Fetch test types ──────────────────────────────────────────────────────

	useEffect(() => {
		const load = async () => {
			try {
				setLoadingTests(true)
				const data = await fetchLabTestTypes(labId)
				setTestTypes(data)
			} catch (err: any) {
				Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load test types' })
			} finally {
				setLoadingTests(false)
			}
		}
		load()
	}, [labId])

	// ── Fetch addresses ───────────────────────────────────────────────────────

	const loadAddresses = useCallback(async () => {
		try {
			setLoadingAddresses(true)
			const list = await getPatientAddresses()
			setAddresses(list)
			const def = list.find((a) => a.is_default)
			setSelectedAddressId(def?.id ?? list[0]?.id ?? null)
		} catch {
			// silent
		} finally {
			setLoadingAddresses(false)
		}
	}, [])

	useEffect(() => {
		if (collectionType === 'home_collection') loadAddresses()
	}, [collectionType, loadAddresses])

	// ── Toggle test selection ─────────────────────────────────────────────────

	const toggleTest = (id: string) => {
		setSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
	}

	// ── Add address ───────────────────────────────────────────────────────────

	const handleAddAddress = async () => {
		if (!newLabel.trim() || !newLine.trim() || !newCity.trim() || !newState.trim() || !newPincode.trim()) {
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

	// ── Place order ───────────────────────────────────────────────────────────

	const handlePlaceOrder = async () => {
		if (selectedTestIds.length === 0 && !customTests.trim()) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select at least one test.' })
			return
		}
		if (collectionType === 'home_collection' && !selectedAddressId) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a collection address.' })
			return
		}

		setSubmitting(true)
		try {
			const payload: PlaceLabOrderPayload = {
				laboratory_public_id: labId,
				test_type_ids: selectedTestIds,
				custom_tests: customTests.trim(),
				collection_type: collectionType,
				collection_address_public_id: collectionType === 'home_collection' ? selectedAddressId : null,
				notes: notes.trim() || null,
			}
			await createLabOrder(payload)
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

	// ── Render helpers ────────────────────────────────────────────────────────

	const grouped = groupByCategory(testTypes)
	const activeAddress = addresses.find((a) => a.id === selectedAddressId)

	const renderTestSelector = () => {
		if (loadingTests) {
			return (
				<View style={styles.spinnerContainer}>
					<ActivityIndicator size="small" color="#1f5f68" />
					<Text style={styles.loadingText}>Loading available tests…</Text>
				</View>
			)
		}
		if (testTypes.length === 0) {
			return (
				<View style={styles.emptyContainer}>
					<MaterialCommunityIcons name="flask-outline" size={36} color="#90a4ae" />
					<Text style={styles.emptyMessage}>No tests available for this laboratory.</Text>
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
										{selected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
									</View>
									<View style={styles.testInfo}>
										<Text style={[styles.testName, selected && styles.testNameSelected]}>
											{test.name}
										</Text>
										<Text style={styles.testMeta}>Result in {test.turnaround}</Text>
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
				))}

				{/* Selected summary chip row */}
				{selectedTestIds.length > 0 && (
					<View style={styles.selectedSummary}>
						<MaterialCommunityIcons name="check-circle-outline" size={16} color="#1f5f68" />
						<Text style={styles.selectedSummaryText}>
							{selectedTestIds.length} test{selectedTestIds.length > 1 ? 's' : ''} selected
						</Text>
						<TouchableOpacity onPress={() => setSelectedTestIds([])}>
							<Text style={styles.clearSelectionText}>Clear</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Free-text custom tests */}
				<View style={styles.customTestBlock}>
					<Text style={styles.customTestLabel}>Other / Custom Tests</Text>
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

	const renderAddressSection = () => {
		if (loadingAddresses) {
			return (
				<View style={[styles.spinnerContainer, { paddingVertical: 12 }]}>
					<ActivityIndicator size="small" color="#1f5f68" />
				</View>
			)
		}
		if (addresses.length === 0) {
			return (
				<View style={styles.addressEmptyCard}>
					<MaterialCommunityIcons name="map-marker-question-outline" size={28} color="#90a4ae" />
					<Text style={styles.addressEmptyMsg}>No addresses saved yet.</Text>
					<TouchableOpacity style={styles.addAddressPrimaryBtn} onPress={() => setShowAddressModal(true)}>
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
				<TouchableOpacity style={styles.inlineAddAddressBtn} onPress={() => setShowAddressModal(true)}>
					<MaterialCommunityIcons name="plus" size={16} color="#1f5f68" />
					<Text style={styles.inlineAddAddressTxt}>Add New Address</Text>
				</TouchableOpacity>
			</>
		)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<View style={styles.safe}>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 100, 120) }]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Lab Banner */}
				<View style={styles.labBanner}>
					<MaterialCommunityIcons name="flask-plus" size={32} color="#1f5f68" />
					<View style={{ flex: 1 }}>
						<AppTypography variant="caption" style={styles.bannerLabel}>
							Booking Lab Tests At
						</AppTypography>
						<AppTypography variant="h3" style={styles.bannerTitle}>
							{labName}
						</AppTypography>
					</View>
				</View>

				{/* STEP 1 — Select Tests */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>1</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Select Tests
						</AppTypography>
					</View>
					{renderTestSelector()}
				</View>

				{/* STEP 2 — Collection Type */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>2</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Collection Preference
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
								color="#1f5f68"
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

				{/* STEP 3 — Notes */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>3</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Additional Remarks
						</AppTypography>
					</View>
					<AppInput
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
			</ScrollView>

			{/* Fixed Bottom Button */}
			<View style={[styles.bottomActionContainer, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
				<AppButton
					variant="primary"
					onPress={handlePlaceOrder}
					loading={submitting}
					disabled={submitting || loadingTests}
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
	bannerLabel: { fontSize: 12, color: '#1f5f68', fontWeight: '600', marginBottom: 2 },
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
		backgroundColor: '#1f5f68',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	sectionTitle: { fontSize: 16, fontWeight: '700', color: '#101828' },

	// Loading / empty
	spinnerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },
	loadingText: { fontSize: 13, color: '#667085' },
	emptyContainer: { alignItems: 'center', paddingVertical: 24, gap: 10 },
	emptyMessage: { fontSize: 13, color: '#667085', textAlign: 'center' },

	// Category + test rows
	categoryBlock: { marginBottom: 12 },
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
		gap: 12,
	},
	testRowSelected: {
		backgroundColor: '#E8F5F5',
		borderColor: '#1f5f68',
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#D0D5DD',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	checkboxSelected: { backgroundColor: '#1f5f68', borderColor: '#1f5f68' },
	testInfo: { flex: 1 },
	testName: { fontSize: 13, fontWeight: '600', color: '#344054' },
	testNameSelected: { color: '#1f5f68' },
	testMeta: { fontSize: 11, color: '#667085', marginTop: 2 },

	// Selected summary
	selectedSummary: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E8F5F5',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 6,
		marginBottom: 12,
	},
	selectedSummaryText: { fontSize: 13, color: '#1f5f68', fontWeight: '600', flex: 1 },
	clearSelectionText: { fontSize: 12, color: '#667085', fontWeight: '600' },

	// Custom tests
	customTestBlock: { marginTop: 4 },
	customTestLabel: { fontSize: 13, fontWeight: '600', color: '#344054', marginBottom: 8 },
	customTestInput: { fontSize: 13, textAlignVertical: 'top', minHeight: 80 },

	// Collection type selector
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
	collectionSelectorBtnActive: { backgroundColor: '#1f5f68' },
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

	// Address section header
	addressSectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},

	// Address cards (radio style)
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
	addressCardSelected: { borderColor: '#1f5f68', backgroundColor: '#E8F5F5' },
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#D0D5DD',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioCircleSelected: { borderColor: '#1f5f68' },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1f5f68' },
	addressLabel: { fontSize: 13, fontWeight: '700', color: '#101828', marginBottom: 2 },
	addressLine: { fontSize: 12, color: '#475467', lineHeight: 16 },
	defaultBadge: {
		backgroundColor: '#E8F5F5',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#1f5f68' },

	// Add address inline button
	inlineAddAddressBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 8,
		alignSelf: 'flex-start',
	},
	inlineAddAddressTxt: { fontSize: 13, color: '#1f5f68', fontWeight: '700' },

	// Empty address
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
	addAddressPrimaryBtnTxt: { fontSize: 12, color: '#1f5f68', fontWeight: '600' },

	// Remarks
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

	// Add address sheet
	sheetBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
	rowFields: { flexDirection: 'row', justifyContent: 'space-between' },
	saveAddressBtn: { width: '100%', marginTop: 16 },
})
