import React, { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface UploadSectionProps {
	files: string[]
	onAddFile: (fileName: string) => void
	onRemoveFile: (index: number) => void
}

export default function UploadSection({ files, onAddFile, onRemoveFile }: UploadSectionProps) {
	const [uploading, setUploading] = useState(false)

	const simulateUpload = () => {
		setUploading(true)
		setTimeout(() => {
			const index = files.length + 1
			onAddFile(`clinical_report_0${index}.pdf`)
			setUploading(false)
		}, 1000)
	}

	return (
		<View style={styles.card}>
			<Text style={styles.title}>Clinical Reports & Attachments</Text>
			<Text style={styles.subtitle}>Upload post-operative notes or visual assessments</Text>

			{files.length > 0 && (
				<View style={styles.fileList}>
					{files.map((file, index) => (
						<View key={index} style={styles.fileRow}>
							<Ionicons name="document-text-outline" size={18} color="#2B6F71" />
							<Text style={styles.fileName} numberOfLines={1}>
								{file}
							</Text>
							<TouchableOpacity onPress={() => onRemoveFile(index)} style={styles.removeBtn}>
								<Ionicons name="trash-outline" size={16} color="#EF4444" />
							</TouchableOpacity>
						</View>
					))}
				</View>
			)}

			<TouchableOpacity
				style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
				onPress={simulateUpload}
				disabled={uploading}
				activeOpacity={0.8}
			>
				{uploading ? (
					<ActivityIndicator size="small" color="#2B6F71" style={styles.spinner} />
				) : (
					<Ionicons name="cloud-upload-outline" size={20} color="#2B6F71" style={styles.uploadIcon} />
				)}
				<Text style={styles.uploadBtnText}>
					{uploading ? 'Uploading attachment...' : 'Upload Clinical Document'}
				</Text>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
		marginBottom: 16,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: '#587087',
		marginBottom: 16,
	},
	fileList: {
		marginBottom: 14,
		gap: 8,
	},
	fileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	fileName: {
		flex: 1,
		fontSize: 13,
		fontWeight: '600',
		color: '#334155',
		marginLeft: 8,
	},
	removeBtn: {
		padding: 4,
	},
	uploadBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1.5,
		borderColor: '#2B6F71',
		borderStyle: 'dashed',
		borderRadius: 12,
		paddingVertical: 14,
		backgroundColor: '#F0F9F9',
	},
	uploadBtnDisabled: {
		opacity: 0.7,
	},
	uploadIcon: {
		marginRight: 8,
	},
	spinner: {
		marginRight: 8,
	},
	uploadBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2B6F71',
	},
})
