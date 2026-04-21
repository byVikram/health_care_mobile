import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useMemo, useState } from 'react'
import {
	FlatList,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
	useWindowDimensions,
} from 'react-native'

type Hospital = {
	id: string
	name: string
	location: string
	address: string
}

const HOSPITALS_STORAGE_KEY = 'hospitals'
const PRIMARY_STORAGE_KEY = 'primaryId'

export default function MyHospitalsTab() {
	const { width } = useWindowDimensions()
	const isCompact = width < 680

	const [isAdding, setIsAdding] = useState(false)
	const [hospitals, setHospitals] = useState<Hospital[]>([])
	const [form, setForm] = useState<Omit<Hospital, 'id'>>({
		name: '',
		location: '',
		address: '',
	})
	const [selectedPrimaryId, setSelectedPrimaryId] = useState<string | null>(null)
	const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null)
	const [editingId, setEditingId] = useState<string | null>(null)

	useEffect(() => {
		const loadHospitals = async () => {
			try {
				const [storedHospitals, storedPrimaryId] = await Promise.all([
					AsyncStorage.getItem(HOSPITALS_STORAGE_KEY),
					AsyncStorage.getItem(PRIMARY_STORAGE_KEY),
				])

				if (storedHospitals) {
					const parsedHospitals = JSON.parse(storedHospitals) as Hospital[]
					setHospitals(Array.isArray(parsedHospitals) ? parsedHospitals : [])
				}

				if (storedPrimaryId) {
					setSelectedPrimaryId(storedPrimaryId)
				}
			} catch {
				setHospitals([])
				setSelectedPrimaryId(null)
			}
		}

		void loadHospitals()
	}, [])

	useEffect(() => {
		void AsyncStorage.setItem(HOSPITALS_STORAGE_KEY, JSON.stringify(hospitals))
	}, [hospitals])

	useEffect(() => {
		if (selectedPrimaryId) {
			void AsyncStorage.setItem(PRIMARY_STORAGE_KEY, selectedPrimaryId)
			return
		}

		void AsyncStorage.removeItem(PRIMARY_STORAGE_KEY)
	}, [selectedPrimaryId])

	const reversedHospitals = useMemo(() => [...hospitals].reverse(), [hospitals])

	const resetForm = () => {
		setForm({ name: '', location: '', address: '' })
		setEditingId(null)
		setIsAdding(false)
	}

	const handleSave = () => {
		if (!form.name.trim()) {
			return
		}

		const normalizedHospital = {
			name: form.name.trim(),
			location: form.location.trim(),
			address: form.address.trim(),
		}

		if (editingId) {
			setHospitals((currentHospitals) =>
				currentHospitals.map((item) =>
					item.id === editingId ? { ...item, ...normalizedHospital } : item
				)
			)
			resetForm()
			return
		}

		setHospitals((currentHospitals) => [
			...currentHospitals,
			{
				id: Date.now().toString(),
				...normalizedHospital,
			},
		])
		resetForm()
	}

	const handleDelete = (id: string) => {
		setHospitals((currentHospitals) =>
			currentHospitals.filter((hospital) => hospital.id !== id)
		)

		if (selectedPrimaryId === id) {
			setSelectedPrimaryId(null)
		}

		setMenuVisibleId(null)
	}

	const handleEdit = (hospital: Hospital) => {
		setForm({
			name: hospital.name,
			location: hospital.location,
			address: hospital.address,
		})
		setEditingId(hospital.id)
		setIsAdding(true)
		setMenuVisibleId(null)
	}

	const getLocationText = (hospital: Hospital) => {
		const locationParts = [hospital.location.trim(), hospital.address.trim()].filter(Boolean)
		return [...new Set(locationParts)].join(', ')
	}

	if (isAdding) {
		return (
			<View style={styles.formContainer}>
				<Text style={styles.formTitle}>
					{editingId ? 'Edit address' : 'Add new address'}
				</Text>

				<Text style={styles.fieldLabel}>Enter hospital name</Text>
				<TextInput
					style={styles.input}
					value={form.name}
					onChangeText={(name) => setForm((currentForm) => ({ ...currentForm, name }))}
					placeholder="Hospital name"
					placeholderTextColor="#a2aab0"
				/>

				<Text style={styles.fieldLabel}>Location</Text>
				<TextInput
					style={styles.input}
					value={form.location}
					onChangeText={(location) =>
						setForm((currentForm) => ({ ...currentForm, location }))
					}
					placeholder="Area / locality"
					placeholderTextColor="#a2aab0"
				/>

				<Text style={styles.fieldLabel}>Enter full address</Text>
				<TextInput
					style={[styles.input, styles.addressInput]}
					value={form.address}
					onChangeText={(address) =>
						setForm((currentForm) => ({ ...currentForm, address }))
					}
					placeholder="Street, landmark, city, pincode"
					placeholderTextColor="#a2aab0"
					multiline
				/>

				<View style={styles.formActions}>
					<TouchableOpacity
						style={[styles.formActionButton, styles.secondaryButton]}
						onPress={resetForm}
						activeOpacity={0.85}
					>
						<Text style={styles.secondaryButtonText}>Cancel</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.formActionButton, styles.primaryButton]}
						onPress={handleSave}
						activeOpacity={0.85}
					>
						<Text style={styles.primaryButtonText}>Save Address</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	return (
		<TouchableWithoutFeedback onPress={() => setMenuVisibleId(null)}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>My Hospital</Text>

					<TouchableOpacity
						style={styles.addButton}
						onPress={() => {
							setEditingId(null)
							setForm({ name: '', location: '', address: '' })
							setIsAdding(true)
						}}
						activeOpacity={0.9}
					>
						<Ionicons name="add" size={18} color="#ffffff" />
						<Text style={styles.addButtonText}>Add new hospital</Text>
					</TouchableOpacity>
				</View>

				{hospitals.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.emptyStateText}>
							Please add the hospital you wish patients to visit!
						</Text>
					</View>
				) : null}

				<FlatList
					data={reversedHospitals}
					keyExtractor={(item) => item.id}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
					ListFooterComponent={<View style={styles.footerDivider} />}
					renderItem={({ item, index }) => {
						const addressIndex = reversedHospitals.length - index
						const isPrimary = selectedPrimaryId === item.id
						const locationText = getLocationText(item)

						return (
							<View style={styles.addressSection}>
								<Text style={styles.addressLabel}>Address {addressIndex}</Text>

								<View style={[styles.cardRow, isCompact && styles.cardRowCompact]}>
									<View style={[styles.hospitalCard, isPrimary && styles.hospitalCardPrimary]}>
										<View style={styles.cardContent}>
											<View style={styles.hospitalInfo}>
												<View style={styles.hospitalHeadingRow}>
													<Ionicons
														name="business-outline"
														size={14}
														color="#2e7f84"
														style={styles.hospitalIcon}
													/>
													<Text style={styles.hospitalName}>{item.name}</Text>
												</View>

												{locationText ? (
													<Text style={styles.locationText}>{locationText}</Text>
												) : null}
											</View>

											<View style={styles.primarySection}>
												<TouchableOpacity
													style={styles.primaryRow}
													onPress={() => setSelectedPrimaryId(item.id)}
													activeOpacity={0.85}
												>
													<Text style={styles.primaryLabel}>Set as Primary</Text>
													<View style={styles.radioOuter}>
														{isPrimary ? <View style={styles.radioInner} /> : null}
													</View>
												</TouchableOpacity>
											</View>
										</View>
									</View>

									<View style={[styles.menuCard, isCompact && styles.menuCardCompact]}>
										<TouchableOpacity
											style={[styles.menuButton, isCompact && styles.menuButtonCompact]}
											onPress={() =>
												setMenuVisibleId((currentId) =>
													currentId === item.id ? null : item.id
												)
											}
											activeOpacity={0.85}
										>
											<Ionicons
												name="ellipsis-horizontal"
												size={20}
												color="#2e7f84"
											/>
										</TouchableOpacity>

										{menuVisibleId === item.id ? (
											<View style={styles.menu}>
												<TouchableOpacity
													style={styles.menuItemButton}
													onPress={() => handleEdit(item)}
													activeOpacity={0.85}
												>
													<Text style={styles.menuItem}>Edit</Text>
												</TouchableOpacity>

												<TouchableOpacity
													style={styles.menuItemButton}
													onPress={() => handleDelete(item.id)}
													activeOpacity={0.85}
												>
													<Text style={[styles.menuItem, styles.deleteText]}>Delete</Text>
												</TouchableOpacity>
											</View>
										) : null}
									</View>
								</View>
							</View>
						)
					}}
				/>
			</View>
		</TouchableWithoutFeedback>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingHorizontal: 22,
		paddingTop: 10,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	title: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '500',
		color: '#303638',
	},
	addButton: {
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 6,
		backgroundColor: '#2e7f84',
		flexDirection: 'row',
		alignItems: 'center',
	},
	addButtonText: {
		marginLeft: 4,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500',
		color: '#ffffff',
	},
	listContent: {
		paddingBottom: 34,
	},
	addressSection: {
		marginTop: 4,
		marginBottom: 24,
	},
	addressLabel: {
		marginBottom: 10,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500',
		color: '#2e7f84',
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	cardRowCompact: {
		flexDirection: 'column',
	},
	hospitalCard: {
		flex: 1,
		minHeight: 76,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 8,
		backgroundColor: '#ffffff',
	},
	hospitalCardPrimary: {
		borderLeftWidth: 4,
		borderLeftColor: '#2e7f84',
	},
	cardContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	hospitalInfo: {
		flex: 1,
		paddingVertical: 13,
		paddingLeft: 14,
		paddingRight: 14,
	},
	hospitalHeadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	hospitalIcon: {
		marginRight: 6,
	},
	hospitalName: {
		flex: 1,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '500',
		color: '#3a3f41',
	},
	locationText: {
		marginTop: 6,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '400',
		color: '#748188',
	},
	primarySection: {
		width: 132,
		borderLeftWidth: 1,
		borderLeftColor: '#dfe8ea',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 14,
	},
	primaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	primaryLabel: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500',
		color: '#36a9b3',
		marginRight: 8,
	},
	radioOuter: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 1.6,
		borderColor: '#2e7f84',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#2e7f84',
	},
	menuCard: {
		width: 76,
		marginLeft: 0,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 8,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	menuCardCompact: {
		width: '100%',
		marginTop: 8,
	},
	menuButton: {
		width: '100%',
		minHeight: 76,
		alignItems: 'center',
		justifyContent: 'center',
	},
	menuButtonCompact: {
		minHeight: 52,
	},
	menu: {
		position: 'absolute',
		top: 62,
		right: 4,
		width: 120,
		backgroundColor: '#ffffff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		paddingVertical: 6,
		shadowColor: '#09131a',
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
		zIndex: 10,
	},
	menuItemButton: {
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	menuItem: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500',
		color: '#384246',
	},
	deleteText: {
		color: '#cc4b4b',
	},
	emptyState: {
		marginTop: 18,
		paddingHorizontal: 16,
		paddingVertical: 18,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 8,
		backgroundColor: '#f7fbfc',
	},
	emptyStateText: {
		fontSize: 14,
		lineHeight: 20,
		color: '#607279',
		textAlign: 'center',
	},
	footerDivider: {
		marginTop: 28,
		height: 1,
		backgroundColor: '#edf1f3',
	},
	formContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingHorizontal: 22,
		paddingTop: 16,
	},
	formTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '500',
		color: '#303638',
		marginBottom: 16,
	},
	fieldLabel: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500',
		color: '#5f6a70',
		marginBottom: 8,
		marginTop: 10,
	},
	input: {
		minHeight: 46,
		borderWidth: 1,
		borderColor: '#d7e2e5',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f3537',
		backgroundColor: '#ffffff',
	},
	addressInput: {
		minHeight: 96,
		textAlignVertical: 'top',
	},
	formActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 22,
	},
	formActionButton: {
		height: 40,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 10,
	},
	secondaryButton: {
		borderWidth: 1,
		borderColor: '#d7e2e5',
		backgroundColor: '#ffffff',
	},
	secondaryButtonText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500',
		color: '#5f6a70',
	},
	primaryButton: {
		backgroundColor: '#2e7f84',
	},
	primaryButtonText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500',
		color: '#ffffff',
	},
})
