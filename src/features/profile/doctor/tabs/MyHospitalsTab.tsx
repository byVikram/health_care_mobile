import React, { useState, useEffect } from 'react'
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	FlatList,
	TouchableWithoutFeedback,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'

export default function MyHospitalsTab() {
	const [isAdding, setIsAdding] = useState(false)
	const [hospitals, setHospitals] = useState([])
	const [form, setForm] = useState({ name: '', location: '', address: '' })
	const [selectedPrimaryId, setSelectedPrimaryId] = useState(null)
	const [menuVisibleId, setMenuVisibleId] = useState(null)
	const [editingId, setEditingId] = useState(null)

	// LOAD
	useEffect(() => {
		loadHospitals()
	}, [])

	const loadHospitals = async () => {
		const data = await AsyncStorage.getItem('hospitals')
		const primary = await AsyncStorage.getItem('primaryId')

		if (data) setHospitals(JSON.parse(data))
		if (primary) setSelectedPrimaryId(primary)
	}

	// SAVE STORAGE
	useEffect(() => {
		AsyncStorage.setItem('hospitals', JSON.stringify(hospitals))
	}, [hospitals])

	useEffect(() => {
		if (selectedPrimaryId) {
			AsyncStorage.setItem('primaryId', selectedPrimaryId)
		}
	}, [selectedPrimaryId])

	// SAVE
	const handleSave = () => {
		if (!form.name) return

		if (editingId) {
			const updated = hospitals.map((item) =>
				item.id === editingId ? { ...item, ...form } : item
			)
			setHospitals(updated)
			setEditingId(null)
		} else {
			const newHospital = {
				id: Date.now().toString(),
				...form,
			}
			setHospitals([...hospitals, newHospital])
		}

		setForm({ name: '', location: '', address: '' })
		setIsAdding(false)
	}

	// DELETE
	const handleDelete = (id) => {
		const filtered = hospitals.filter((h) => h.id !== id)
		setHospitals(filtered)

		if (selectedPrimaryId === id) {
			setSelectedPrimaryId(null)
		}
	}

	// EDIT
	const handleEdit = (item) => {
		setForm(item)
		setEditingId(item.id)
		setIsAdding(true)
		setMenuVisibleId(null)
	}

	// FORM UI
	if (isAdding) {
		return (
			<View style={styles.container}>
				<Text style={styles.formTitle}>
					{editingId ? 'Edit address' : 'Add new address'}
				</Text>

				<Text style={styles.label}>Hospital name</Text>
				<TextInput
					style={styles.input}
					value={form.name}
					onChangeText={(t) => setForm({ ...form, name: t })}
				/>

				<Text style={styles.label}>Location</Text>
				<TextInput
					style={styles.input}
					value={form.location}
					onChangeText={(t) => setForm({ ...form, location: t })}
				/>

				<Text style={styles.label}>Full address</Text>
				<TextInput
					style={styles.input}
					value={form.address}
					onChangeText={(t) => setForm({ ...form, address: t })}
				/>

				<TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
					<Text style={styles.saveText}>Save Address</Text>
				</TouchableOpacity>
			</View>
		)
	}

	// LIST UI
	const reversedData = [...hospitals].reverse()

	return (
		<TouchableWithoutFeedback onPress={() => setMenuVisibleId(null)}>
			<View style={styles.container}>
				{/* HEADER */}
				<View style={styles.header}>
					<Text style={styles.title}>My Hospital</Text>

					<TouchableOpacity
						style={styles.addButton}
						onPress={() => setIsAdding(true)}
					>
						<Ionicons name="add" size={18} color="#fff" />
						<Text style={styles.addButtonText}>
							Add new hospital
						</Text>
					</TouchableOpacity>
				</View>

				<FlatList
					data={reversedData}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingBottom: 100 }}
					renderItem={({ item, index }) => (
						<View style={styles.cardWrapper}>
							<Text style={styles.addressTitle}>
								Address {reversedData.length - index}
							</Text>

							{/* CARD */}
							<View style={styles.cardRow}>

								{/* LEFT */}
								<View style={styles.leftSection}>
									<Text style={styles.hospitalName}>
										{item.name}
									</Text>

									<Text style={styles.addressText}>
										{item.address}
									</Text>
								</View>

								{/* MIDDLE */}
								<View style={styles.middleSection}>
									<TouchableOpacity
										style={styles.primaryRow}
										onPress={() =>
											setSelectedPrimaryId(item.id)
										}
									>
										<Text style={styles.primaryText}>
											Set as Primary
										</Text>

										<View style={styles.radioOuter}>
											{selectedPrimaryId === item.id && (
												<View style={styles.radioInner} />
											)}
										</View>
									</TouchableOpacity>
								</View>

								{/* RIGHT */}
								<TouchableOpacity
									style={styles.menuBox}
									onPress={(e) => {
										e.stopPropagation()
										setMenuVisibleId(
											menuVisibleId === item.id
												? null
												: item.id
										)
									}}
								>
									<Text style={styles.menuDots}>⋮</Text>
								</TouchableOpacity>

								{/* MENU */}
								{menuVisibleId === item.id && (
									<View style={styles.menu}>
										<TouchableOpacity onPress={() => handleEdit(item)}>
											<Text style={styles.menuItem}>Edit</Text>
										</TouchableOpacity>

										<TouchableOpacity onPress={() => handleDelete(item.id)}>
											<Text style={[styles.menuItem, { color: 'red' }]}>
												Delete
											</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</View>
					)}
				/>
			</View>
		</TouchableWithoutFeedback>
	)
}

// STYLES
const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: '#f5f7f7',
	},

	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},

	title: {
		fontSize: 20,
		fontWeight: '600',
	},

	addButton: {
		flexDirection: 'row',
		backgroundColor: '#2f7d77',
		padding: 10,
		borderRadius: 8,
	},

	addButtonText: {
		color: '#fff',
		marginLeft: 6,
	},

	formTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
	},

	label: {
		marginTop: 10,
	},

	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 6,
		marginTop: 5,
	},

	saveBtn: {
		marginTop: 20,
		backgroundColor: '#2f7d77',
		padding: 12,
		borderRadius: 6,
		alignItems: 'center',
	},

	saveText: {
		color: '#fff',
	},

	cardWrapper: {
		marginTop: 15,
	},

	addressTitle: {
		marginBottom: 6,
		color: '#666',
	},

	cardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 10,
		backgroundColor: '#fff',
		overflow: 'hidden',
	},

	leftSection: {
		flex: 1,
		padding: 12,
	},

	hospitalName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4,
	},

	addressText: {
		fontSize: 12,
		color: '#777',
		lineHeight: 18,
	},

	middleSection: {
		borderLeftWidth: 1,
		borderColor: '#eee',
		paddingHorizontal: 12,
		justifyContent: 'center',
	},

	primaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	primaryText: {
		color: '#2f7d77',
		fontSize: 13,
		marginRight: 6,
	},

	radioOuter: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#2f7d77',
		justifyContent: 'center',
		alignItems: 'center',
	},

	radioInner: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2f7d77',
	},

	menuBox: {
		width: 60,
		height: '100%',
		borderLeftWidth: 1,
		borderColor: '#eee',
		justifyContent: 'center',
		alignItems: 'center',
	},

	menuDots: {
		fontSize: 18,
	},

	menu: {
		position: 'absolute',
		top: 50,
		right: 10,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 8,
		zIndex: 999,
		elevation: 10,
	},

	menuItem: {
		paddingVertical: 6,
		paddingHorizontal: 10,
	},
})