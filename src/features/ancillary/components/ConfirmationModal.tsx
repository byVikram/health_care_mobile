import React from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface ConfirmationModalProps {
	visible: boolean
	title: string
	description: string
	confirmText?: string
	cancelText?: string
	onConfirm: () => void
	onCancel: () => void
	iconName?: keyof typeof Ionicons.glyphMap
	iconColor?: string
}

export default function ConfirmationModal({
	visible,
	title,
	description,
	confirmText = 'Proceed',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
	iconName = 'alert-circle',
	iconColor = '#F59E0B',
}: ConfirmationModalProps) {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
			<View style={styles.overlay}>
				<View style={styles.dialog}>
					<View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
						<Ionicons name={iconName} size={36} color={iconColor} />
					</View>

					<Text style={styles.title}>{title}</Text>
					<Text style={styles.desc}>{description}</Text>

					<View style={styles.actions}>
						<TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
							<Text style={styles.cancelBtnText}>{cancelText}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.confirmBtn, { backgroundColor: iconColor }]} onPress={onConfirm}>
							<Text style={styles.confirmBtnText}>{confirmText}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.45)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	dialog: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 20,
		alignItems: 'center',
		width: '100%',
		maxWidth: 340,
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 5,
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#16324A',
		textAlign: 'center',
		marginBottom: 8,
	},
	desc: {
		fontSize: 13,
		color: '#587087',
		textAlign: 'center',
		lineHeight: 18,
		marginBottom: 24,
		paddingHorizontal: 8,
	},
	actions: {
		flexDirection: 'row',
		width: '100%',
		gap: 12,
	},
	cancelBtn: {
		flex: 1,
		height: 46,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#CBD5E1',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
	},
	cancelBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#475569',
	},
	confirmBtn: {
		flex: 1,
		height: 46,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	confirmBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#FFFFFF',
	},
})
