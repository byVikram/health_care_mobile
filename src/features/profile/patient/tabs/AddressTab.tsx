import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
	View,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Modal,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Animated,
	PanResponder,
	Pressable,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppInput, AppButton, AppModal, AppToggle } from '../../../../components/common'
import ApiService from '../../../../services/apiService'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PatientAddress {
	id: string
	label: string
	address_line: string
	city: string
	state: string
	pincode: string
	latitude?: number | null
	longitude?: number | null
	is_default: boolean
	created_at: string
}

interface AddressForm {
	label: string
	address_line: string
	city: string
	state: string
	pincode: string
	is_default: boolean
}

const EMPTY_FORM: AddressForm = {
	label: '',
	address_line: '',
	city: '',
	state: '',
	pincode: '',
	is_default: false,
}

const SHEET_CLOSED_OFFSET = 420
const DISMISS_DRAG_DISTANCE = 90
const DISMISS_DRAG_VELOCITY = 0.8

// ─── API helpers ─────────────────────────────────────────────────────────────

const fetchAddresses = async (): Promise<PatientAddress[]> => {
	const res = await ApiService.get<{ success: boolean; data: PatientAddress[] }>(API_ENDPOINTS.PATIENT.ADDRESSES)
	return res.data?.data ?? []
}

const createAddress = async (form: AddressForm): Promise<void> => {
	await ApiService.post(API_ENDPOINTS.PATIENT.ADDRESSES, form)
}

const updateAddress = async (id: string, form: Partial<AddressForm>): Promise<void> => {
	await ApiService.patch(API_ENDPOINTS.PATIENT.ADDRESS_BY_ID(id), form)
}

const deleteAddress = async (id: string): Promise<void> => {
	await ApiService.delete(API_ENDPOINTS.PATIENT.ADDRESS_BY_ID(id))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AddressTab() {
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [loadingList, setLoadingList] = useState(true)
	const [modalVisible, setModalVisible] = useState(false)
	const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null)
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState<AddressForm>(EMPTY_FORM)
	const [formError, setFormError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const sheetTranslateY = useRef(new Animated.Value(SHEET_CLOSED_OFFSET)).current

	const showFeedback = useCallback((title: string, message: string) => {
		setFeedbackModal({ title, message })
	}, [])

	const loadAddresses = useCallback(async () => {
		try {
			setLoadingList(true)
			const list = await fetchAddresses()
			setAddresses(list)
		} catch {
			showFeedback('Error', 'Could not load addresses.')
		} finally {
			setLoadingList(false)
		}
	}, [showFeedback])

	useEffect(() => {
		loadAddresses()
	}, [loadAddresses])

	const animateSheetOpen = () => {
		sheetTranslateY.setValue(SHEET_CLOSED_OFFSET)
		Animated.spring(sheetTranslateY, {
			toValue: 0,
			useNativeDriver: true,
			tension: 80,
			friction: 12,
		}).start()
	}

	const resetSheetPosition = () => {
		Animated.spring(sheetTranslateY, {
			toValue: 0,
			useNativeDriver: true,
			tension: 90,
			friction: 13,
		}).start()
	}

	const openAddModal = () => {
		setEditingId(null)
		setForm(EMPTY_FORM)
		setFormError(null)
		setModalVisible(true)
		requestAnimationFrame(animateSheetOpen)
	}

	const openEditModal = (address: PatientAddress) => {
		setEditingId(address.id)
		setFormError(null)
		setForm({
			label: address.label,
			address_line: address.address_line,
			city: address.city,
			state: address.state,
			pincode: address.pincode,
			is_default: address.is_default,
		})
		setModalVisible(true)
		requestAnimationFrame(animateSheetOpen)
	}

	const closeModal = useCallback(() => {
		Animated.timing(sheetTranslateY, {
			toValue: SHEET_CLOSED_OFFSET,
			duration: 180,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (!finished) return
			setModalVisible(false)
			setEditingId(null)
			setForm(EMPTY_FORM)
			setFormError(null)
		})
	}, [sheetTranslateY])

	const sheetPanResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gestureState) =>
				gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy <= 0) return
				sheetTranslateY.setValue(gestureState.dy)
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy > DISMISS_DRAG_DISTANCE || gestureState.vy > DISMISS_DRAG_VELOCITY) {
					closeModal()
					return
				}

				resetSheetPosition()
			},
			onPanResponderTerminate: resetSheetPosition,
		})
	).current

	const updateField = (key: keyof AddressForm, value: string | boolean) => {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	const handleSave = async () => {
		setFormError(null)
		if (
			!form.label.trim() ||
			!form.address_line.trim() ||
			!form.city.trim() ||
			!form.state.trim() ||
			!form.pincode.trim()
		) {
			setFormError('Please fill in all required fields.')
			return
		}
		try {
			setSaving(true)
			if (editingId) {
				await updateAddress(editingId, form)
			} else {
				await createAddress(form)
			}
			await loadAddresses()
			closeModal()
		} catch {
			setFormError('Could not save address.')
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = (id: string) => {
		setDeleteConfirmId(id)
	}

	const closeDeleteConfirmation = () => {
		if (deletingId) return
		setDeleteConfirmId(null)
	}

	const confirmDelete = async () => {
		if (!deleteConfirmId) return
		try {
			setDeletingId(deleteConfirmId)
			await deleteAddress(deleteConfirmId)
			setDeleteConfirmId(null)
			await loadAddresses()
		} catch {
			showFeedback('Error', 'Could not delete address.')
		} finally {
			setDeletingId(null)
		}
	}

	const handleSetDefault = async (address: PatientAddress) => {
		if (address.is_default) return
		try {
			await updateAddress(address.id, { is_default: true })
			await loadAddresses()
		} catch {
			showFeedback('Error', 'Could not update default address.')
		}
	}

	const isDeletingSelectedAddress = deleteConfirmId !== null && deletingId === deleteConfirmId

	return (
		<View style={styles.root}>
			{/* Add button */}
			<View style={styles.headerRow}>
				<AppTypography variant="caption" style={styles.sectionCaption}>
					Saved addresses
				</AppTypography>
				<TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
					<MaterialCommunityIcons name="plus" size={16} color="#0c7c7c" />
					<AppTypography variant="caption" style={styles.addBtnTxt}>
						Add
					</AppTypography>
				</TouchableOpacity>
			</View>

			{loadingList ? (
				<View style={styles.centerBox}>
					<ActivityIndicator size="small" color="#0c7c7c" />
				</View>
			) : addresses.length === 0 ? (
				<View style={styles.centerBox}>
					<MaterialCommunityIcons name="map-marker-off-outline" size={40} color="#c8d5d8" />
					<AppTypography variant="body" style={styles.emptyTxt}>
						No addresses saved yet.
					</AppTypography>
					<TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
						<AppTypography variant="caption" style={styles.emptyAddBtnTxt}>
							+ Add your first address
						</AppTypography>
					</TouchableOpacity>
				</View>
			) : (
				<ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
					{addresses.map((addr) => (
						<View key={addr.id} style={[styles.card, addr.is_default && styles.cardDefault]}>
							{/* Label row */}
							<View style={styles.cardTopRow}>
								<View style={styles.labelRow}>
									<MaterialCommunityIcons
										name="map-marker"
										size={16}
										color={addr.is_default ? '#0c7c7c' : '#7a8c91'}
										style={{ marginRight: 4 }}
									/>
									<AppTypography
										variant="subtitle"
										style={[styles.cardLabel, addr.is_default && styles.cardLabelDefault]}
									>
										{addr.label}
									</AppTypography>
									{addr.is_default && (
										<View style={styles.defaultBadge}>
											<AppTypography variant="caption" style={styles.defaultBadgeTxt}>
												Default
											</AppTypography>
										</View>
									)}
								</View>
								<View style={styles.cardActions}>
									<TouchableOpacity onPress={() => openEditModal(addr)} style={styles.iconBtn}>
										<MaterialCommunityIcons name="pencil-outline" size={18} color="#0c7c7c" />
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => handleDelete(addr.id)}
										style={styles.iconBtn}
										disabled={deletingId === addr.id}
									>
										{deletingId === addr.id ? (
											<ActivityIndicator size="small" color="#d84545" />
										) : (
											<MaterialCommunityIcons
												name="trash-can-outline"
												size={18}
												color="#d84545"
											/>
										)}
									</TouchableOpacity>
								</View>
							</View>

							{/* Address text */}
							<AppTypography variant="body" style={styles.cardAddress}>
								{addr.address_line}, {addr.city}, {addr.state} – {addr.pincode}
							</AppTypography>

							{/* Set as default */}
							{!addr.is_default && (
								<TouchableOpacity
									onPress={() => handleSetDefault(addr)}
									style={styles.setDefaultBtn}
									activeOpacity={0.8}
								>
									<AppTypography variant="caption" style={styles.setDefaultTxt}>
										Set as default
									</AppTypography>
								</TouchableOpacity>
							)}
						</View>
					))}
				</ScrollView>
			)}

			{/* Add / Edit Modal */}
			<Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
				<Pressable style={styles.modalOverlay} onPress={closeModal}>
					<KeyboardAvoidingView
						style={styles.sheetKeyboard}
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					>
						<Animated.View
							style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
							{...sheetPanResponder.panHandlers}
						>
							<Pressable onPress={(event) => event.stopPropagation()}>
								<View style={styles.sheetDragArea}>
									<View style={styles.sheetHandle} />
								</View>

								{/* Sheet header */}
								<View style={styles.sheetHeader}>
									<TouchableOpacity onPress={closeModal}>
										<MaterialCommunityIcons name="chevron-left" size={24} color="#0c7c7c" />
									</TouchableOpacity>
									<AppTypography variant="h4" style={styles.sheetTitle}>
										{editingId ? 'Edit Address' : 'Add Address'}
									</AppTypography>
								</View>

								<ScrollView
									style={styles.sheetScroll}
									contentContainerStyle={styles.sheetBody}
									keyboardShouldPersistTaps="handled"
									showsVerticalScrollIndicator={false}
									bounces={false}
								>
									{/* Label */}
									<View style={styles.fieldMargin}>
										<AppTypography variant="caption" style={styles.fieldLabel}>
											Label{' '}
											<AppTypography variant="caption" style={styles.required}>
												*
											</AppTypography>
										</AppTypography>
										<AppInput
											value={form.label}
											onChangeText={(v: string) => updateField('label', v)}
											placeholder="e.g. Home, Work"
											placeholderTextColor="#9a9a9a"
											fieldSize="compact"
											noMargin
											dense
										/>
									</View>

									{/* Address Line */}
									<View style={styles.fieldMargin}>
										<AppTypography variant="caption" style={styles.fieldLabel}>
											Address Line{' '}
											<AppTypography variant="caption" style={styles.required}>
												*
											</AppTypography>
										</AppTypography>
										<AppInput
											value={form.address_line}
											onChangeText={(v: string) => updateField('address_line', v)}
											placeholder="Street, building, area"
											placeholderTextColor="#9a9a9a"
											fieldSize="compact"
											noMargin
											dense
										/>
									</View>

									{/* City */}
									<View style={styles.fieldMargin}>
										<AppTypography variant="caption" style={styles.fieldLabel}>
											City{' '}
											<AppTypography variant="caption" style={styles.required}>
												*
											</AppTypography>
										</AppTypography>
										<AppInput
											value={form.city}
											onChangeText={(v: string) => updateField('city', v)}
											placeholder="City"
											placeholderTextColor="#9a9a9a"
											fieldSize="compact"
											noMargin
											dense
										/>
									</View>

									{/* State */}
									<View style={styles.fieldMargin}>
										<AppTypography variant="caption" style={styles.fieldLabel}>
											State{' '}
											<AppTypography variant="caption" style={styles.required}>
												*
											</AppTypography>
										</AppTypography>
										<AppInput
											value={form.state}
											onChangeText={(v: string) => updateField('state', v)}
											placeholder="State"
											placeholderTextColor="#9a9a9a"
											fieldSize="compact"
											noMargin
											dense
										/>
									</View>

									{/* Pincode */}
									<View style={styles.fieldMargin}>
										<AppTypography variant="caption" style={styles.fieldLabel}>
											Pincode{' '}
											<AppTypography variant="caption" style={styles.required}>
												*
											</AppTypography>
										</AppTypography>
										<AppInput
											value={form.pincode}
											onChangeText={(v: string) => updateField('pincode', v.replace(/\D/g, ''))}
											placeholder="6-digit pincode"
											placeholderTextColor="#9a9a9a"
											keyboardType="numeric"
											maxLength={6}
											fieldSize="compact"
											noMargin
											dense
										/>
									</View>

									<View style={styles.fieldMargin}>
										<AppToggle
											label="Set as default address"
											value={form.is_default}
											onValueChange={(value) => updateField('is_default', value)}
											enabledLabel="Yes"
											disabledLabel="No"
											size="small"
											accessibilityLabel="Set as default address"
										/>
									</View>

									{formError && (
										<View style={styles.formErrorBox}>
											<MaterialCommunityIcons
												name="alert-circle-outline"
												size={16}
												color="#d84545"
											/>
											<AppTypography variant="caption" style={styles.formErrorText}>
												{formError}
											</AppTypography>
										</View>
									)}

									{/* Save button */}
									<AppButton
										variant="primary"
										formAction
										onPress={handleSave}
										loading={saving}
										disabled={saving}
										style={styles.saveBtn}
									>
										{editingId ? 'Update Address' : 'Save Address'}
									</AppButton>
								</ScrollView>
							</Pressable>
						</Animated.View>
					</KeyboardAvoidingView>
				</Pressable>
			</Modal>

			<AppModal
				visible={deleteConfirmId !== null}
				onDismiss={closeDeleteConfirmation}
				title="Delete Address"
				dismissable={!isDeletingSelectedAddress}
			>
				<View style={styles.confirmIconContainer}>
					<MaterialCommunityIcons name="trash-can-outline" size={32} color="#d84545" />
				</View>
				<AppTypography style={styles.confirmMessage}>
					Are you sure you want to delete this address?
				</AppTypography>
				<View style={styles.confirmActions}>
					<AppButton variant="text" onPress={closeDeleteConfirmation} disabled={isDeletingSelectedAddress}>
						Cancel
					</AppButton>
					<AppButton
						variant="text"
						onPress={confirmDelete}
						loading={isDeletingSelectedAddress}
						disabled={isDeletingSelectedAddress}
						textColor="#d84545"
						style={styles.confirmDeleteButton}
					>
						Delete
					</AppButton>
				</View>
			</AppModal>

			<AppModal
				visible={feedbackModal !== null}
				onDismiss={() => setFeedbackModal(null)}
				title={feedbackModal?.title}
			>
				<View style={styles.confirmIconContainer}>
					<MaterialCommunityIcons name="alert-circle-outline" size={32} color="#d84545" />
				</View>
				<AppTypography style={styles.confirmMessage}>{feedbackModal?.message}</AppTypography>
				<View style={styles.confirmActions}>
					<AppButton variant="text" onPress={() => setFeedbackModal(null)}>
						Okay
					</AppButton>
				</View>
			</AppModal>
		</View>
	)
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#fff',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	sectionCaption: {
		fontSize: 13,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	addBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#0c7c7c',
	},
	addBtnTxt: {
		color: '#0c7c7c',
		fontWeight: '600',
		fontSize: 13,
	},
	centerBox: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
		gap: 8,
	},
	emptyTxt: {
		color: '#9aabb0',
		textAlign: 'center',
		marginTop: 4,
	},
	emptyAddBtn: {
		marginTop: 8,
		paddingVertical: 8,
		paddingHorizontal: 20,
		borderRadius: 20,
		backgroundColor: '#f0f7f7',
		borderWidth: 1,
		borderColor: '#c6e0e0',
	},
	emptyAddBtnTxt: {
		color: '#0c7c7c',
		fontWeight: '600',
	},
	list: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		gap: 12,
	},
	card: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e4eaed',
		padding: 14,
	},
	cardDefault: {
		borderColor: '#0c7c7c',
		backgroundColor: '#f0f9f9',
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	cardLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#2c3e50',
	},
	cardLabelDefault: {
		color: '#0c7c7c',
	},
	defaultBadge: {
		marginLeft: 8,
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 10,
		backgroundColor: '#0c7c7c',
	},
	defaultBadgeTxt: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '600',
	},
	cardActions: {
		flexDirection: 'row',
		gap: 4,
	},
	iconBtn: {
		padding: 4,
	},
	cardAddress: {
		fontSize: 13,
		color: '#5a6d74',
		lineHeight: 18,
	},
	setDefaultBtn: {
		marginTop: 10,
		alignSelf: 'flex-start',
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#b2dfdf',
		backgroundColor: '#f0f9f9',
	},
	setDefaultTxt: {
		color: '#0c7c7c',
		fontWeight: '600',
		fontSize: 12,
	},
	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	sheetKeyboard: {
		justifyContent: 'flex-end',
		width: '100%',
	},
	sheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 32,
		// maxHeight: '90%',
		overflow: 'hidden',
	},
	sheetScroll: {
		maxHeight: '100%',
	},
	sheetDragArea: {
		alignItems: 'center',
		paddingTop: 10,
		paddingBottom: 4,
	},
	sheetHandle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#d0dadd',
		alignSelf: 'center',
	},
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderBottomWidth: 0.5,
		borderBottomColor: '#e8ecee',
		gap: 4,
	},
	sheetTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a2226',
	},
	sheetBody: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	fieldMargin: {
		marginBottom: 16,
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	required: {
		color: '#d84545',
		fontWeight: '700',
	},
	saveBtn: {
		width: '100%',
	},
	formErrorBox: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#fff1f1',
		borderWidth: 1,
		borderColor: '#ffd4d4',
	},
	formErrorText: {
		flex: 1,
		marginLeft: 8,
		color: '#d84545',
		fontWeight: '600',
	},
	confirmIconContainer: {
		alignItems: 'center',
		marginBottom: 12,
	},
	confirmMessage: {
		color: '#5a6d74',
		fontSize: 15,
		lineHeight: 21,
		textAlign: 'center',
	},
	confirmActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		marginTop: 20,
	},
	confirmDeleteButton: {
		marginLeft: 8,
	},
})
