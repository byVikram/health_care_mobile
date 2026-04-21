import React, { useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	Pressable,
	useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function SettingsTab() {
	const [showModal, setShowModal] = useState(false)
	const { width } = useWindowDimensions()

	return (
		<View style={styles.container}>

			{/* TITLE */}
			<Text style={styles.title}>Account Settings</Text>

			{/* PASSWORD SECTION */}
			<Text style={styles.label}>Set Password</Text>

			<TouchableOpacity style={styles.inputBox}>
				<Text style={styles.placeholder}>Type to set password</Text>

				<Ionicons name="chevron-forward" size={18} color="#7aaeb0" />
			</TouchableOpacity>

			{/* DELETE BUTTON */}
			<TouchableOpacity
				style={styles.deleteBtn}
				onPress={() => setShowModal(true)}
			>
				<Text style={styles.deleteText}>Delete Account</Text>
				<Ionicons name="trash-outline" size={18} color="#fff" />
			</TouchableOpacity>

			{/* MODAL */}
			<Modal
				transparent
				visible={showModal}
				animationType="fade"
			>
				{/* BACKDROP */}
				<Pressable
					style={styles.overlay}
					onPress={() => setShowModal(false)}
				>

					{/* POPUP CARD */}
					<Pressable
						style={[
							styles.modalCard,
							{ width: width * 0.85 },
						]}
						onPress={(e) => e.stopPropagation()}
					>
						<Text style={styles.modalTitle}>
							Delete Account?
						</Text>

						<Text style={styles.modalText}>
							All your data will be permanently deleted.
						</Text>

						<View style={styles.modalActions}>
							<TouchableOpacity
								style={styles.cancelBtn}
								onPress={() => setShowModal(false)}
							>
								<Text style={styles.cancelText}>Cancel</Text>
							</TouchableOpacity>

							<TouchableOpacity style={styles.confirmBtn}>
								<Text style={styles.confirmText}>Delete</Text>
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: '#f5f7f7',
	},

	title: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
	},

	label: {
		color: '#777',
		marginBottom: 6,
		fontSize: 13,
	},

	inputBox: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#7aaeb0',
		backgroundColor: '#e6f1f2',
		padding: 12,
		borderRadius: 8,
		marginBottom: 20,
	},

	placeholder: {
		color: '#666',
	},

	deleteBtn: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#e53935',
		padding: 14,
		borderRadius: 8,
	},

	deleteText: {
		color: '#fff',
		fontWeight: '600',
	},

	// MODAL
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)', // dim background
		justifyContent: 'center',
		alignItems: 'center',
	},

	modalCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
	},

	modalTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
	},

	modalText: {
		color: '#666',
		marginBottom: 16,
	},

	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},

	cancelBtn: {
		marginRight: 12,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},

	cancelText: {
		color: '#555',
	},

	confirmBtn: {
		backgroundColor: '#e53935',
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 6,
	},

	confirmText: {
		color: '#fff',
	},
})