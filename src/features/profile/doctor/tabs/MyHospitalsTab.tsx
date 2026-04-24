import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../../components/common'
import { getDoctorProfile, mapDoctorProfileApi } from '../../../doctor/doctorService'
import { doctorService } from '../../../consultation/ConsultationService'

type HospitalFormData = {
	name: string
	fullAddress: string
	phone_number: string
	video_consultation_fee: string
	offline_consultation_fee: string
}

type HospitalItem = HospitalFormData & {
	id: string
	location: string
	isPrimary: boolean
}

const EMPTY_FORM: HospitalFormData = {
	name: '',
	fullAddress: '',
	phone_number: '',
	video_consultation_fee: '',
	offline_consultation_fee: '',
}

function FieldLabel({ label }: { label: string }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
		</AppTypography>
	)
}

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	multiline = false,
	keyboardType = 'default',
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	multiline?: boolean
	keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} />
			<View style={[styles.inputShell, multiline && styles.inputShellMultiline]}>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9a9a9a"
					style={[styles.textInput, multiline && styles.textInputMultiline]}
					multiline={multiline}
					keyboardType={keyboardType}
					textAlignVertical={multiline ? 'top' : 'center'}
				/>
			</View>
		</View>
	)
}

const getHospitalAddressText = (hospital: HospitalItem) => {
	const fullAddress = hospital.fullAddress.trim()
	const location = hospital.location.trim()

	if (fullAddress && location && fullAddress !== location) {
		return `${fullAddress} ${location}`.trim()
	}

	return fullAddress || location
}

const normalizeHospitals = (rawHospitals: ReturnType<typeof mapDoctorProfileApi>['hospitals']): HospitalItem[] =>
	rawHospitals.map((hospital, index) => ({
		id: hospital.id || `${Date.now()}-${index}`,
		name: hospital.name ?? '',
		fullAddress: hospital.fullAddress ?? hospital.location ?? '',
		location: hospital.location ?? hospital.fullAddress ?? '',
		isPrimary: Boolean(hospital.isPrimary),
		phone_number: hospital.phone_number ?? '',
		video_consultation_fee: hospital.video_consultation_fee ?? '',
		offline_consultation_fee: hospital.offline_consultation_fee ?? '',
	}))

export default function MyHospitalsTab() {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const isLandscape = width > 900

	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState<HospitalFormData>(EMPTY_FORM)
	const [hospitals, setHospitals] = useState<HospitalItem[]>([])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		const loadProfile = async () => {
			try {
				setIsLoading(true)
				const response = await getDoctorProfile()

				if (!response?.success || !response.data) return

				const profile = mapDoctorProfileApi(response.data)
				setHospitals(normalizeHospitals(profile.hospitals))
			} catch (error) {
				console.log('[MyHospitalsTab] failed to load hospitals:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadProfile()
	}, [])

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (isTablet) return 820
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const cardDirection = isMobile ? 'column' : 'row'
	const actionStacked = isMobile || (isTablet && !isLandscape)

	const resetForm = () => {
		setForm(EMPTY_FORM)
		setEditingId(null)
		setShowForm(false)
	}

	const handleSetPrimary = (id: string) => {
		setHospitals((prev) => prev.map((hospital) => ({ ...hospital, isPrimary: hospital.id === id })))
		setMenuVisibleId(null)
	}

	const handleEdit = (hospital: HospitalItem) => {
		setForm({
			name: hospital.name,
			fullAddress: hospital.fullAddress,
			phone_number: hospital.phone_number,
			video_consultation_fee: hospital.video_consultation_fee,
			offline_consultation_fee: hospital.offline_consultation_fee,
		})
		setEditingId(hospital.id)
		setMenuVisibleId(null)
		setShowForm(true)
	}

	const handleDelete = (id: string) => {
		setHospitals((prev) => {
			const updated = prev.filter((hospital) => hospital.id !== id)
			if (updated.length > 0 && !updated.some((hospital) => hospital.isPrimary)) {
				updated[0] = { ...updated[0], isPrimary: true }
			}
			return updated
		})
		setMenuVisibleId(null)
	}

	const handleSaveAddress = () => {
		const trimmedName = form.name.trim()
		const trimmedAddress = form.fullAddress.trim()

		if (!trimmedName) {
			Alert.alert('Validation', 'Hospital name is required.')
			return
		}

		if (!trimmedAddress) {
			Alert.alert('Validation', 'Full address is required.')
			return
		}

		if (editingId) {
			setHospitals((prev) =>
				prev.map((hospital) =>
					hospital.id === editingId
						? {
								...hospital,
								...form,
								location: form.fullAddress.trim(),
							}
						: hospital
				)
			)
		} else {
			const newHospital: HospitalItem = {
				id: `${Date.now()}`,
				...form,
				location: form.fullAddress.trim(),
				isPrimary: hospitals.length === 0,
			}
			setHospitals((prev) => [...prev, newHospital])
		}

		resetForm()
	}

	const handleSave = async () => {
		try {
			setIsSaving(true)
			const normalizedHospitals = hospitals.map((hospital, index) => ({
				id: hospital.id,
				name: hospital.name.trim(),
				full_address: hospital.fullAddress.trim(),
				fullAddress: hospital.fullAddress.trim(),
				location: hospital.fullAddress.trim(),
				phone_number: hospital.phone_number.trim(),
				video_consultation_fee: hospital.video_consultation_fee.trim(),
				offline_consultation_fee: hospital.offline_consultation_fee.trim(),
				is_primary: hospital.isPrimary || (!hospitals.some((item) => item.isPrimary) && index === 0),
			}))

			await doctorService.updateDoctorProfile({ hospitals: normalizedHospitals })
			Alert.alert('Success', 'Hospitals saved successfully.')
		} catch (error) {
			console.log('[MyHospitalsTab] save error:', error)
			Alert.alert('Error', 'Unable to save hospitals right now.')
		} finally {
			setIsSaving(false)
		}
	}

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	if (showForm) {
		return (
			<ScrollView
				style={styles.container}
				contentContainerStyle={[styles.contentContainer, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding }]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<View style={styles.formHeader}>
						<TouchableOpacity
							onPress={resetForm}
							style={styles.backButton}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons name="chevron-left" size={20} color="#5f6b73" />
						</TouchableOpacity>
						<AppTypography variant="h4" style={styles.formTitle}>
							{editingId ? 'Edit address' : 'Add new address'}
						</AppTypography>
					</View>

					<View style={styles.formBody}>
						<InputField
							label="Enter hospital name"
							value={form.name}
							onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
							placeholder="e.g. Arogya Clinic"
						/>
						<InputField
							label="Phone number"
							value={form.phone_number}
							onChangeText={(value) => setForm((prev) => ({ ...prev, phone_number: value }))}
							placeholder="e.g. +91 98765 43210"
							keyboardType="phone-pad"
						/>
						<InputField
							label="Enter Full address"
							value={form.fullAddress}
							onChangeText={(value) => setForm((prev) => ({ ...prev, fullAddress: value }))}
							placeholder="Enter complete address"
							multiline
						/>
						<InputField
							label="Video consultation fee"
							value={form.video_consultation_fee}
							onChangeText={(value) => setForm((prev) => ({ ...prev, video_consultation_fee: value.replace(/[^\d.]/g, '') }))}
							placeholder="e.g. 500"
							keyboardType="numeric"
						/>
						<InputField
							label="Offline consultation fee"
							value={form.offline_consultation_fee}
							onChangeText={(value) => setForm((prev) => ({ ...prev, offline_consultation_fee: value.replace(/[^\d.]/g, '') }))}
							placeholder="e.g. 300"
							keyboardType="numeric"
						/>
					</View>

					<View style={styles.formActions}>
						<TouchableOpacity style={styles.primaryButton} onPress={handleSaveAddress} activeOpacity={0.85}>
							<AppTypography variant="body" style={styles.primaryButtonText}>
								Save Address
							</AppTypography>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		)
	}

	return (
		<Pressable style={styles.container} onPress={() => setMenuVisibleId(null)}>
			<ScrollView
				contentContainerStyle={[styles.contentContainer, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding }]}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<View style={[styles.header, actionStacked && styles.headerStacked]}>
						<AppTypography variant="h3" style={styles.title}>
							My Hospital
						</AppTypography>
						<TouchableOpacity
							style={[styles.addButton, actionStacked && styles.addButtonStacked]}
							onPress={() => setShowForm(true)}
							activeOpacity={0.85}
						>
							<MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
							<AppTypography variant="body" style={styles.addButtonText}>
								Add new hospital
							</AppTypography>
						</TouchableOpacity>
					</View>

					{hospitals.length === 0 ? (
						<View style={styles.emptyState}>
							<MaterialCommunityIcons name="home-outline" size={48} color="rgba(56,72,80,0.28)" />
							<AppTypography variant="body" style={styles.emptyText}>
								No hospitals added yet
							</AppTypography>
						</View>
					) : (
						<View style={styles.listSection}>
							{hospitals.map((hospital, index) => (
								<View key={hospital.id} style={styles.hospitalBlock}>
									<AppTypography variant="caption" style={styles.addressTitle}>
										Address {index + 1}
									</AppTypography>

									<View style={[styles.cardRow, { flexDirection: cardDirection }]}>
										<View
											style={[
												styles.cardMain,
												hospital.isPrimary && styles.cardMainPrimary,
												cardDirection === 'column' && styles.cardMainStacked,
											]}
										>
											<View style={styles.cardMainInner}>
												<MaterialCommunityIcons name="home-outline" size={18} color="#0c7c7c" style={styles.cardIcon} />
												<View style={styles.cardCopy}>
													<AppTypography variant="body" style={styles.hospitalName}>
														{hospital.name}
													</AppTypography>
													<AppTypography variant="caption" style={styles.addressText}>
														{getHospitalAddressText(hospital)}
													</AppTypography>
													{hospital.phone_number ? (
														<AppTypography variant="caption" style={styles.metaText}>
															Phone: {hospital.phone_number}
														</AppTypography>
													) : null}
													{hospital.video_consultation_fee || hospital.offline_consultation_fee ? (
														<AppTypography variant="caption" style={styles.metaText}>
															Video: {hospital.video_consultation_fee || '-'} | Offline: {hospital.offline_consultation_fee || '-'}
														</AppTypography>
													) : null}
												</View>
											</View>
										</View>

										<View style={[styles.actionGroup, actionStacked && styles.actionGroupStacked]}>
											<TouchableOpacity
												style={[styles.primaryToggle, hospital.isPrimary && styles.primaryToggleActive, actionStacked && styles.primaryToggleStacked]}
												onPress={() => handleSetPrimary(hospital.id)}
												activeOpacity={0.85}
											>
												<AppTypography variant="caption" style={styles.primaryText}>
													Set as Primary
												</AppTypography>
												<View style={[styles.radioOuter, hospital.isPrimary && styles.radioOuterActive]}>
													{hospital.isPrimary ? <View style={styles.radioInner} /> : null}
												</View>
											</TouchableOpacity>

											<View style={styles.menuWrapper}>
												<TouchableOpacity
													style={[styles.menuButton, actionStacked && styles.menuButtonStacked]}
													onPress={() => setMenuVisibleId((prev) => (prev === hospital.id ? null : hospital.id))}
													activeOpacity={0.85}
												>
													<MaterialCommunityIcons name="dots-horizontal" size={20} color="#62707a" />
												</TouchableOpacity>

												<Modal
													visible={menuVisibleId === hospital.id}
													transparent
													animationType="fade"
													onRequestClose={() => setMenuVisibleId(null)}
												>
													<Pressable style={styles.modalOverlay} onPress={() => setMenuVisibleId(null)}>
														<View style={[styles.menuCard, isMobile && styles.menuCardMobile]}>
															<TouchableOpacity style={styles.menuItem} onPress={() => handleEdit(hospital)}>
																<AppTypography variant="body" style={styles.menuItemText}>
																	Edit
																</AppTypography>
															</TouchableOpacity>
															<TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(hospital.id)}>
																<AppTypography variant="body" style={styles.menuItemDelete}>
																	Delete
																</AppTypography>
															</TouchableOpacity>
														</View>
													</Pressable>
												</Modal>
											</View>
										</View>
									</View>
								</View>
							))}
						</View>
					)}

					<TouchableOpacity
						style={[styles.primaryButton, styles.saveContinueButton, isSaving && styles.primaryButtonDisabled]}
						onPress={handleSave}
						disabled={isSaving}
						activeOpacity={0.85}
					>
						{isSaving ? (
							<ActivityIndicator size="small" color="#ffffff" />
						) : (
							<AppTypography variant="body" style={styles.primaryButtonText}>
								Save / Continue
							</AppTypography>
						)}
					</TouchableOpacity>
				</View>
			</ScrollView>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	contentContainer: {
		alignItems: 'center',
	},
	contentShell: {
		width: '100%',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 24,
		gap: 14,
	},
	headerStacked: {
		flexDirection: 'column',
		alignItems: 'stretch',
	},
	title: {
		color: '#1f2b33',
		fontSize: 22,
		fontWeight: '700',
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 16,
		paddingVertical: 11,
		borderRadius: 10,
	},
	addButtonStacked: {
		width: '100%',
	},
	addButtonText: {
		color: '#ffffff',
		fontWeight: '600',
		marginLeft: 6,
	},
	emptyState: {
		minHeight: 220,
		borderWidth: 1,
		borderColor: '#e3eaed',
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fafcfc',
		paddingHorizontal: 20,
	},
	emptyText: {
		marginTop: 12,
		color: '#74828b',
	},
	listSection: {
		gap: 18,
	},
	hospitalBlock: {
		width: '100%',
	},
	addressTitle: {
		color: '#0c7c7c',
		fontWeight: '600',
		fontSize: 13,
		marginBottom: 8,
	},
	cardRow: {
		gap: 10,
	},
	cardMain: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		borderLeftWidth: 4,
		borderLeftColor: '#d7e2e5',
		padding: 14,
		backgroundColor: '#ffffff',
	},
	cardMainPrimary: {
		borderColor: '#0c7c7c',
		borderLeftColor: '#0c7c7c',
	},
	cardMainStacked: {
		width: '100%',
	},
	cardMainInner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	cardIcon: {
		marginTop: 2,
		marginRight: 10,
	},
	cardCopy: {
		flex: 1,
	},
	hospitalName: {
		color: '#1f2b33',
		fontWeight: '600',
		marginBottom: 4,
	},
	addressText: {
		color: '#66757f',
		fontSize: 12,
		lineHeight: 18,
	},
	metaText: {
		color: '#66757f',
		fontSize: 12,
		lineHeight: 18,
		marginTop: 4,
	},
	actionGroup: {
		flexDirection: 'row',
		alignItems: 'stretch',
		gap: 10,
	},
	actionGroupStacked: {
		width: '100%',
	},
	primaryToggle: {
		minWidth: 148,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	primaryToggleStacked: {
		flex: 1,
	},
	primaryToggleActive: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12,124,124,0.03)',
	},
	primaryText: {
		color: '#0c7c7c',
		fontWeight: '500',
		fontSize: 13,
		marginRight: 8,
	},
	radioOuter: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioOuterActive: {
		borderColor: '#0c7c7c',
	},
	radioInner: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#0c7c7c',
	},
	menuWrapper: {
		position: 'relative',
	},
	menuButton: {
		width: 46,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	menuButtonStacked: {
		height: 46,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.18)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	menuCard: {
		width: 180,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		paddingVertical: 8,
		shadowColor: '#000000',
		shadowOpacity: 0.1,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 8,
	},
	menuCardMobile: {
		width: '100%',
		maxWidth: 240,
	},
	menuItem: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	menuItemText: {
		color: '#1f2b33',
	},
	menuItemDelete: {
		color: '#d14141',
	},
	formHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	backButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	formTitle: {
		color: '#1f2b33',
		fontWeight: '700',
		fontSize: 16,
	},
	formBody: {
		gap: 18,
	},
	fieldGroup: {
		width: '100%',
	},
	fieldLabel: {
		marginBottom: 8,
		color: '#7b8790',
		fontWeight: '500',
		fontSize: 14,
		lineHeight: 20,
	},
	inputShell: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 10,
		paddingHorizontal: 14,
		backgroundColor: '#ffffff',
	},
	inputShellMultiline: {
		minHeight: 96,
		paddingVertical: 12,
	},
	textInput: {
		minHeight: 48,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f2f2f',
		paddingVertical: 12,
	},
	textInputMultiline: {
		minHeight: 72,
		paddingVertical: 0,
	},
	formActions: {
		alignItems: 'flex-end',
		marginTop: 28,
	},
	primaryButton: {
		minWidth: 160,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: '#0c7c7c',
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButtonDisabled: {
		opacity: 0.7,
	},
	primaryButtonText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	saveContinueButton: {
		marginTop: 28,
		alignSelf: 'flex-start',
	},
})
