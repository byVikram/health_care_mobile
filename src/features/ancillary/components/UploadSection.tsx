import React, { useState } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'

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
		<View style={styles.container}>
			{files.length > 0 && (
				<View style={styles.fileList}>
					{files.map((file, index) => (
						<View key={index} style={styles.fileRow}>
							<Ionicons name="document-text-outline" size={18} color="#2B6F71" />
							<AppTypography variant="caption" style={styles.fileName} numberOfLines={1}>
								{file}
							</AppTypography>
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
					<Ionicons name="cloud-upload-outline" size={18} color="#2B6F71" style={styles.uploadIcon} />
				)}
				<AppTypography variant="caption" style={styles.uploadBtnText}>
					{uploading ? 'Uploading attachment...' : 'Upload Clinical Document'}
				</AppTypography>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		gap: 8,
		marginTop: 8,
	},
	fileList: {
		gap: 6,
	},
	fileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 10,
	},
	fileName: {
		flex: 1,
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0F172A',
	},
	removeBtn: {
		padding: 4,
	},
	uploadBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: '#2B6F71',
		borderRadius: 12,
		height: 44,
		gap: 8,
	},
	uploadBtnDisabled: {
		opacity: 0.6,
	},
	uploadIcon: {},
	spinner: {},
	uploadBtnText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2B6F71',
	},
})
