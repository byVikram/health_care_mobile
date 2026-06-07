// src/features/pharmacy/PlacePharmacyOrderPage.tsx
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
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../../context/AuthContext'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import {
	AppButton,
	AppInput,
	AppSelect,
	AppTypography,
	StatusModal,
} from '../../components/common'
import { createPharmacyOrder } from '../profile/pharmacy/pharmacyService'

type RouteProps = RouteProp<AppStackParamList, typeof ROUTES.STACK.PLACE_PHARMACY_ORDER>

export interface PatientAddress {
	id: string
	label: string
	address_line: string
	city: string
	state: string
	pincode: string
	is_default: boolean
}

export interface TreatmentRecord {
	id: string
	appointment_id: number
	vitals?: Record<string, any> | null
	notes?: string | null
	prescription_s3_key?: string | null
	follow_up_date?: string | null
	created_at: string
	doctor_name?: string
	hospital_name?: string
}

const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL || process.env.REACT_APP_S3_BASE_URL || 'https://healthcare-s3-bucket.s3.amazonaws.com'

const buildS3Url = (key?: string | null): string | null => {
	if (!key) return null
	if (key.startsWith('http://') || key.startsWith('https://')) {
		return key
	}
	return `${S3_BASE_URL.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

export default function PlacePharmacyOrderPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProps>()
	const insets = useSafeAreaInsets()
	const { user } = useAuth()
	const { pharmacyId, pharmacyName } = route.params

	// Consultation / Treatment States
	const [treatments, setTreatments] = useState<TreatmentRecord[]>([])
	const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null)
	const [loadingReports, setLoadingReports] = useState(true)

	// Delivery Preferences States
	const [deliveryType, setDeliveryType] = useState<'pickup' | 'home_delivery'>('pickup')
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
	const [loadingAddresses, setLoadingAddresses] = useState(false)

	// Notes & Submit states
	const [notes, setNotes] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// Status Feedback Modal
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// Image Viewer State
	const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)

	// Inline Address Modal States
	const [showAddressModal, setShowAddressModal] = useState(false)
	const [newLabel, setNewLabel] = useState('')
	const [newLine, setNewLine] = useState('')
	const [newCity, setNewCity] = useState('')
	const [newState, setNewState] = useState('')
	const [newPincode, setNewPincode] = useState('')
	const [savingAddress, setSavingAddress] = useState(false)

	// Fetch Treatments History
	useEffect(() => {
		const fetchTreatments = async () => {
			if (!user?.id) {
				setLoadingReports(false)
				return
			}
			try {
				setLoadingReports(true)
				// Fetch using endpoint added to API_ENDPOINTS
				const res = await ApiService.get<{ success: boolean; data: TreatmentRecord[] }>(API_ENDPOINTS.PATIENT.TREATMENT_HISTORY(user.id))
				const data = res.data?.data ?? []
				setTreatments(data)
				if (data.length > 0) {
					setSelectedTreatmentId(data[0].id)
				}
			} catch (err: any) {
				console.error('[PlacePharmacyOrderPage] fetchTreatments error:', err)
				Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load treatments' })
			} finally {
				setLoadingReports(false)
			}
		}
		fetchTreatments()
	}, [user?.id])

	// Fetch Addresses
	const loadAddresses = useCallback(async () => {
		try {
			setLoadingAddresses(true)
			const res = await ApiService.get<{ success: boolean; data: PatientAddress[] }>(API_ENDPOINTS.PATIENT.ADDRESSES)
			const list = res.data?.data ?? []
			setAddresses(list)
			const def = list.find(a => a.is_default)
			if (def) {
				setSelectedAddressId(def.id)
			} else if (list.length > 0) {
				setSelectedAddressId(list[0].id)
			}
		} catch (err: any) {
			console.error('[PlacePharmacyOrderPage] loadAddresses error:', err)
		} finally {
			setLoadingAddresses(false)
		}
	}, [])

	useEffect(() => {
		if (deliveryType === 'home_delivery') {
			loadAddresses()
		}
	}, [deliveryType, loadAddresses])

	const handleAddAddress = async () => {
		if (!newLabel.trim() || !newLine.trim() || !newCity.trim() || !newState.trim() || !newPincode.trim()) {
			Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all fields for the address.' })
			return
		}
		setSavingAddress(true)
		try {
			await ApiService.post(API_ENDPOINTS.PATIENT.ADDRESSES, {
				label: newLabel,
				address_line: newLine,
				city: newCity,
				state: newState,
				pincode: newPincode,
				is_default: addresses.length === 0,
			})
			Toast.show({ type: 'success', text1: 'Success', text2: 'New address added successfully.' })
			setNewLabel('')
			setNewLine('')
			setNewCity('')
			setNewState('')
			setNewPincode('')
			setShowAddressModal(false)
			await loadAddresses()
		} catch (err: any) {
			console.error('[PlacePharmacyOrderPage] handleAddAddress error:', err)
			Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Failed to add address' })
		} finally {
			setSavingAddress(false)
		}
	}

	const handlePlaceOrder = async () => {
		if (!selectedTreatmentId) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a consultation report.' })
			return
		}
		if (deliveryType === 'home_delivery' && !selectedAddressId) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a delivery address.' })
			return
		}

		setSubmitting(true)
		try {
			const payload = {
				pharmacy_public_id: pharmacyId,
				treatment_public_id: selectedTreatmentId,
				delivery_type: deliveryType,
				delivery_address_public_id: deliveryType === 'home_delivery' ? selectedAddressId : null,
				notes: notes.trim() || null,
			}

			await createPharmacyOrder(payload)

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Order Placed!',
				description: `Your medicine booking request has been successfully submitted to ${pharmacyName}.`,
			})
		} catch (err: any) {
			console.error('[PlacePharmacyOrderPage] handlePlaceOrder error:', err)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Booking Failed',
				description: err?.message || 'An error occurred while booking medicines. Please try again.',
			})
		} finally {
			setSubmitting(false)
		}
	}

	// Prepare dropdown options
	const treatmentOptions = treatments.map(t => {
		const dateStr = new Date(t.created_at).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
		const docStr = t.doctor_name ? ` - Dr. ${t.doctor_name}` : ''
		const hospStr = t.hospital_name ? ` (${t.hospital_name})` : ''
		return {
			label: `${dateStr}${docStr}${hospStr}`,
			value: t.id,
		}
	})

	// Find active consultation details
	const selectedTreatment = treatments.find(t => t.id === selectedTreatmentId)

	// Address select options
	const addressOptions = addresses.map(a => ({
		label: `${a.label}: ${a.address_line}, ${a.city} - ${a.pincode}`,
		value: a.id,
	}))

	const activeAddress = addresses.find(a => a.id === selectedAddressId)

	return (
		<View style={styles.safe}>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
				showsVerticalScrollIndicator={false}
			>
				{/* Pharmacy Banner Card */}
				<View style={styles.pharmacyBanner}>
					<MaterialCommunityIcons name="store-plus" size={32} color="#1f5f68" />
					<View style={styles.pharmacyDetails}>
						<AppTypography variant="caption" style={styles.pharmacyLabel}>
							Ordering Medicines From
						</AppTypography>
						<AppTypography variant="h3" style={styles.pharmacyTitle}>
							{pharmacyName}
						</AppTypography>
					</View>
				</View>

				{/* STEP 1: Select Consultation */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>1</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Select Doctor Consultation
						</AppTypography>
					</View>

					{loadingReports ? (
						<View style={styles.spinnerContainer}>
							<ActivityIndicator size="small" color="#1f5f68" />
							<Text style={styles.loadingText}>Fetching consultations...</Text>
						</View>
					) : treatments.length === 0 ? (
						<View style={styles.emptyContainer}>
							<MaterialCommunityIcons name="note-text-outline" size={36} color="#90a4ae" />
							<AppTypography variant="body" style={styles.emptyMessage}>
								No consultation history found for this patient.
							</AppTypography>
						</View>
					) : (
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
								<View style={styles.consultationDetailCard}>
									<View style={styles.detailRow}>
										<AppTypography variant="caption" style={styles.detailLabel}>
											Consultation Date:
										</AppTypography>
										<AppTypography variant="body" style={styles.detailValue}>
											{new Date(selectedTreatment.created_at).toLocaleDateString('en-IN', {
												weekday: 'long',
												day: 'numeric',
												month: 'long',
												year: 'numeric',
											})}
										</AppTypography>
									</View>

									{selectedTreatment.notes ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Diagnosis / Notes:
											</AppTypography>
											<AppTypography variant="body" style={styles.detailNotes}>
												{selectedTreatment.notes}
											</AppTypography>
										</View>
									) : null}

									{selectedTreatment.doctor_name ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Consulting Doctor:
											</AppTypography>
											<AppTypography variant="body" style={styles.detailValue}>
												Dr. {selectedTreatment.doctor_name}
											</AppTypography>
										</View>
									) : null}

									{selectedTreatment.hospital_name ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Clinic / Hospital:
											</AppTypography>
											<AppTypography variant="body" style={styles.detailValue}>
												{selectedTreatment.hospital_name}
											</AppTypography>
										</View>
									) : null}

									{/* S3 Prescription Image Display */}
									{selectedTreatment.prescription_s3_key ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Prescription Document (Tap to view full screen):
											</AppTypography>
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
													<MaterialCommunityIcons name="fullscreen" size={16} color="#1f5f68" />
													<Text style={styles.imageKeyText} numberOfLines={1}>
														Tap to expand prescription document
													</Text>
												</View>
											</TouchableOpacity>
										</View>
									) : null}


								</View>
							)}
						</View>
					)}
				</View>

				{/* STEP 2: Select Delivery Type */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>2</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Delivery Preference
						</AppTypography>
					</View>

					<View style={styles.deliverySelectorRow}>
						<TouchableOpacity
							style={[
								styles.deliverySelectorButton,
								deliveryType === 'pickup' && styles.deliverySelectorButtonActive,
							]}
							onPress={() => setDeliveryType('pickup')}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons
								name="storefront"
								size={22}
								color={deliveryType === 'pickup' ? '#fff' : '#667085'}
							/>
							<Text
								style={[
									styles.deliverySelectorLabel,
									deliveryType === 'pickup' && styles.deliverySelectorLabelActive,
								]}
							>
								Store Pickup
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.deliverySelectorButton,
								deliveryType === 'home_delivery' && styles.deliverySelectorButtonActive,
							]}
							onPress={() => setDeliveryType('home_delivery')}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons
								name="truck-delivery"
								size={22}
								color={deliveryType === 'home_delivery' ? '#fff' : '#667085'}
							/>
							<Text
								style={[
									styles.deliverySelectorLabel,
									deliveryType === 'home_delivery' && styles.deliverySelectorLabelActive,
								]}
							>
								Home Delivery
							</Text>
						</TouchableOpacity>
					</View>

					{/* Step 3 (Conditional based on preference) */}
					{deliveryType === 'pickup' ? (
						<View style={styles.deliveryDetailsPanel}>
							<MaterialCommunityIcons name="information-outline" size={18} color="#1f5f68" style={{ marginTop: 2 }} />
							<View style={{ flex: 1 }}>
								<AppTypography variant="subtitle" style={styles.panelTitle}>
									Collect from Pharmacy Store
								</AppTypography>
								<AppTypography variant="body" style={styles.panelSub}>
									Your prescription details will be verified by the pharmacist at {pharmacyName}. Once packed, you will receive an alert to collect it.
								</AppTypography>
							</View>
						</View>
					) : (
						<View style={styles.deliveryDetailsPanel}>
							<View style={styles.addressSectionHeader}>
								<AppTypography variant="subtitle" style={styles.panelTitle}>
									Select Delivery Address
								</AppTypography>
								<TouchableOpacity
									style={styles.inlineAddAddressBtn}
									onPress={() => setShowAddressModal(true)}
									activeOpacity={0.7}
								>
									<MaterialCommunityIcons name="plus" size={16} color="#1f5f68" />
									<Text style={styles.inlineAddAddressTxt}>Add Address</Text>
								</TouchableOpacity>
							</View>

							{loadingAddresses ? (
								<View style={[styles.spinnerContainer, { paddingVertical: 12 }]}>
									<ActivityIndicator size="small" color="#1f5f68" />
								</View>
							) : addresses.length === 0 ? (
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
							) : (
								<View style={{ marginTop: 8 }}>
									<AppSelect
										placeholder="Choose delivery address"
										options={addressOptions}
										value={selectedAddressId || undefined}
										onSelect={(val) => setSelectedAddressId(val)}
										size="form"
										noMargin
									/>

									{activeAddress && (
										<View style={styles.addressPreviewBox}>
											<View style={styles.addressBadge}>
												<Text style={styles.addressBadgeTxt}>{activeAddress.label}</Text>
											</View>
											<Text style={styles.addressPreviewTxt}>
												{activeAddress.address_line}, {activeAddress.city}, {activeAddress.state} - {activeAddress.pincode}
											</Text>
										</View>
									)}
								</View>
							)}
						</View>
					)}
				</View>

				{/* STEP 3: Additional Notes */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>3</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Delivery / Pharmacist Remarks
						</AppTypography>
					</View>

					<AppInput
						placeholder="Add specific instructions for the pharmacist, e.g., preferred medication brands, specific delivery times, or substitute preferences."
						value={notes}
						onChangeText={setNotes}
						multiline
						numberOfLines={4}
						fieldSize="form"
						noMargin
						style={styles.remarksInput}
					/>
				</View>

				{/* Place Order CTA */}
				<AppButton
					variant="primary"
					onPress={handlePlaceOrder}
					loading={submitting}
					disabled={submitting || loadingReports}
					style={styles.submitBtn}
				>
					Confirm & Book Order
				</AppButton>
			</ScrollView>

			{/* Inline Add Address Modal */}
			<Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
				<View style={styles.modalOverlay}>
					<TouchableOpacity
						style={styles.modalBackdrop}
						onPress={() => {
							if (!savingAddress) setShowAddressModal(false)
						}}
					/>
					<KeyboardAvoidingView
						style={styles.sheetKeyboard}
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					>
						<View style={styles.sheet}>
							<View style={styles.sheetHandle} />
							<View style={styles.sheetHeader}>
								<AppTypography variant="h3" style={styles.sheetTitle}>
									Add New Delivery Address
								</AppTypography>
								<TouchableOpacity
									onPress={() => {
										if (!savingAddress) setShowAddressModal(false)
									}}
									disabled={savingAddress}
									style={styles.sheetCloseBtn}
								>
									<MaterialCommunityIcons name="close" size={22} color="#667085" />
								</TouchableOpacity>
							</View>

							<ScrollView
								contentContainerStyle={styles.sheetBody}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
							>
								<AppInput
									label="Address Label (e.g. Home, Work)"
									placeholder="Enter address label"
									value={newLabel}
									onChangeText={setNewLabel}
									fieldSize="form"
								/>

								<AppInput
									label="Street / Address Line"
									placeholder="Enter street name, building number"
									value={newLine}
									onChangeText={setNewLine}
									fieldSize="form"
								/>

								<AppInput
									label="City"
									placeholder="Enter city"
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
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			{/* Image Viewer Lightbox Modal */}
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
					
					{/* Close Button */}
					<TouchableOpacity
						style={[styles.viewerCloseBtn, { top: Math.max(insets.top, 24) }]}
						onPress={() => setIsImageViewerOpen(false)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="close" size={24} color="#fff" />
					</TouchableOpacity>

					{selectedTreatment && selectedTreatment.prescription_s3_key && (
						<Image
							source={{ uri: buildS3Url(selectedTreatment.prescription_s3_key) || undefined }}
							style={styles.fullScreenImage}
							resizeMode="contain"
						/>
					)}
				</View>
			</Modal>

			{/* Status Feedback Modal */}
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
							navigation.navigate(ROUTES.STACK.ORDER_LIST)
						}
					}}
					onCancel={() => {
						setStatusModal(null)
					}}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: '#F5F7FA',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	pharmacyBanner: {
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
	pharmacyDetails: {
		flex: 1,
	},
	pharmacyLabel: {
		fontSize: 12,
		color: '#1f5f68',
		fontWeight: '600',
		marginBottom: 2,
	},
	pharmacyTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#101828',
	},
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
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
		gap: 10,
	},
	stepBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#1f5f68',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '700',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#101828',
	},
	spinnerContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		gap: 10,
	},
	loadingText: {
		fontSize: 13,
		color: '#667085',
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		paddingHorizontal: 16,
		gap: 10,
	},
	emptyMessage: {
		fontSize: 13,
		color: '#667085',
		textAlign: 'center',
		lineHeight: 18,
	},
	dropdownContainer: {
		marginTop: 4,
	},
	consultationDetailCard: {
		marginTop: 14,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECEF',
		padding: 14,
	},
	detailRow: {
		paddingBottom: 10,
		marginBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#EAECEF',
	},
	detailLabel: {
		fontSize: 12,
		color: '#667085',
		fontWeight: '500',
		marginBottom: 3,
	},
	detailValue: {
		fontSize: 14,
		color: '#101828',
		fontWeight: '600',
	},
	detailNotes: {
		fontSize: 14,
		color: '#475467',
		lineHeight: 20,
	},
	prescriptionImage: {
		width: '100%',
		height: 200,
		backgroundColor: '#f2f4f7',
		borderRadius: 8,
		marginTop: 4,
	},
	imageCard: {
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 8,
		marginTop: 4,
	},
	imageKeyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
		backgroundColor: '#F8F9FA',
		padding: 6,
		borderRadius: 6,
	},
	imageKeyText: {
		fontSize: 11,
		color: '#475467',
		flex: 1,
	},
	prescriptionBox: {
		marginTop: 8,
		paddingTop: 12,
		borderTopWidth: 1.5,
		borderTopColor: '#E2E8F0',
		borderStyle: 'dashed',
	},
	prescriptionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 6,
	},
	prescriptionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1f5f68',
	},
	medCard: {
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 12,
		marginBottom: 10,
	},
	medRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	medName: {
		fontSize: 14,
		fontWeight: '700',
		color: '#101828',
		flex: 1,
	},
	durationBadge: {
		backgroundColor: '#E2F1F1',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	durationText: {
		fontSize: 11,
		color: '#1f5f68',
		fontWeight: '600',
	},
	medMetaRow: {
		marginBottom: 6,
	},
	medMetaText: {
		fontSize: 12,
		color: '#475467',
	},
	medInstructions: {
		fontSize: 12,
		color: '#667085',
		fontStyle: 'italic',
	},
	deliverySelectorRow: {
		flexDirection: 'row',
		backgroundColor: '#F2F4F7',
		borderRadius: 12,
		padding: 4,
		marginBottom: 12,
		gap: 4,
	},
	deliverySelectorButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 10,
		gap: 6,
	},
	deliverySelectorButtonActive: {
		backgroundColor: '#1f5f68',
	},
	deliverySelectorLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#667085',
	},
	deliverySelectorLabelActive: {
		color: '#fff',
	},
	deliveryDetailsPanel: {
		flexDirection: 'row',
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECEF',
		padding: 12,
		gap: 10,
	},
	panelTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#101828',
		marginBottom: 4,
	},
	panelSub: {
		fontSize: 12,
		color: '#475467',
		lineHeight: 18,
	},
	addressSectionHeader: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	inlineAddAddressBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	inlineAddAddressTxt: {
		fontSize: 12,
		color: '#1f5f68',
		fontWeight: '700',
	},
	addressEmptyCard: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		gap: 8,
	},
	addressEmptyMsg: {
		fontSize: 12,
		color: '#667085',
	},
	addAddressPrimaryBtn: {
		backgroundColor: '#E8F5F5',
		borderColor: '#c6e0e0',
		borderWidth: 1,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	addAddressPrimaryBtnTxt: {
		fontSize: 12,
		color: '#1f5f68',
		fontWeight: '600',
	},
	addressPreviewBox: {
		marginTop: 12,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	addressBadge: {
		backgroundColor: '#F2F4F7',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	addressBadgeTxt: {
		fontSize: 11,
		fontWeight: '700',
		color: '#475467',
	},
	addressPreviewTxt: {
		fontSize: 12,
		color: '#475467',
		flex: 1,
		lineHeight: 16,
	},
	remarksInput: {
		fontSize: 13,
		textAlignVertical: 'top',
		minHeight: 100,
	},
	submitBtn: {
		width: '100%',
		marginTop: 8,
		marginBottom: 16,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
	sheetKeyboard: {
		justifyContent: 'flex-end',
		width: '100%',
	},
	sheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '85%',
		overflow: 'hidden',
	},
	sheetHandle: {
		width: 40,
		height: 4,
		backgroundColor: '#E0E0E0',
		borderRadius: 2,
		alignSelf: 'center',
		marginTop: 8,
		marginBottom: 4,
	},
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F2F4F7',
	},
	sheetTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#101828',
	},
	sheetCloseBtn: {
		padding: 4,
	},
	sheetBody: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 32,
	},
	rowFields: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	saveAddressBtn: {
		width: '100%',
		marginTop: 16,
	},
	viewerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.95)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	viewerBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
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
	fullScreenImage: {
		width: '90%',
		height: '80%',
	},
})
