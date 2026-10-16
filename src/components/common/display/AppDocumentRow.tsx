// src/components/common/display/AppDocumentRow.tsx
//
// Document row from the profile designs (government ID, PAN, registration / licence certificate, police
// verification):
//   uploaded — bordered row: 40px sky tile, 12/16 muted label, 14/20 700 file name, status tag
//              (Verified = success, In review = warning).
//   missing  — 1.5px dashed row (danger dash when required, divider when optional): pageBg tile, 14/19 700
//              label, muted description + "No document yet · Photo, max 5 MB", Required / Optional tag, and a
//              36px primary "Upload" button.
// Uploading isn't wired to a backend yet — callers pass `onUpload` (e.g. showComingSoon).

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconTile } from './AppIconTile'
import { AppTag } from './AppTag'
import { APP_COLORS } from '../../../config/theme'

// verified = approved by our team, in_review = waiting for review, rejected = not accepted, reupload = a new file is
// needed, missing = nothing uploaded yet.
export type AppDocumentStatus = 'verified' | 'in_review' | 'rejected' | 'reupload' | 'missing'

/** Maps the API's document status (pending / approved / rejected / reupload) to a row status. */
export function documentRowStatus(apiStatus: string | null | undefined, hasFile: boolean): AppDocumentStatus {
	if (!hasFile) return 'missing'
	switch (apiStatus) {
		case 'approved':
			return 'verified'
		case 'rejected':
			return 'rejected'
		case 'reupload':
			return 'reupload'
		default:
			return 'in_review'
	}
}

const STATUS_TAG: Record<
	Exclude<AppDocumentStatus, 'missing'>,
	{ label: string; tone?: 'confirmed' | 'pending' | 'cancelled'; bg?: string; ink?: string }
> = {
	verified: { label: 'Approved', tone: 'confirmed' },
	in_review: { label: 'In review', tone: 'pending' },
	rejected: { label: 'Rejected', tone: 'cancelled' },
	reupload: { label: 'Re-upload needed', bg: APP_COLORS.warningBg, ink: APP_COLORS.warning },
}

export type AppDocumentRowProps = {
	label: string
	/** e.g. "Aadhaar, passport, voter ID or driving licence". */
	description?: string
	/** Uploaded file name / key; empty = missing. */
	fileName?: string | null
	status: AppDocumentStatus
	optional?: boolean
	onUpload?: () => void
	style?: StyleProp<ViewStyle>
}

// A stored document arrives as a storage key or as a signed link ("…/uuid.pdf?X-Amz-…"): show just the file name.
const fileLabel = (value: string) => value.split('?')[0].split('/').pop() || value

export function AppDocumentRow({
	label,
	description,
	fileName,
	status,
	optional = false,
	onUpload,
	style,
}: AppDocumentRowProps) {
	if (status !== 'missing' && fileName) {
		const tag = STATUS_TAG[status as Exclude<AppDocumentStatus, 'missing'>] ?? STATUS_TAG.in_review
		const needsNewFile = status === 'rejected' || status === 'reupload'
		return (
			<View style={[styles.uploaded, style]}>
				<AppIconTile icon="file-document-outline" tone="sky" size={40} />
				<View style={styles.text}>
					<Text style={styles.smallLabel}>{label}</Text>
					<Text style={styles.fileName} numberOfLines={1}>
						{fileLabel(fileName)}
					</Text>
					<AppTag
						label={tag.label}
						tone={tag.tone}
						bg={tag.bg}
						ink={tag.ink}
						size="xs"
						shape="rounded"
						uppercase={false}
						style={styles.tag}
					/>
				</View>
				{onUpload ? (
					<TouchableOpacity onPress={onUpload} accessibilityRole="button" hitSlop={8}>
						<Text style={needsNewFile ? styles.reupload : styles.replace}>{needsNewFile ? 'Re-upload' : 'Replace'}</Text>
					</TouchableOpacity>
				) : null}
			</View>
		)
	}

	return (
		<View style={[styles.missing, { borderColor: optional ? APP_COLORS.divider : APP_COLORS.danger }, style]}>
			<AppIconTile
				icon="file-upload-outline"
				backgroundColor={APP_COLORS.pageBg}
				iconColor={APP_COLORS.inkMuted}
				size={40}
			/>
			<View style={styles.text}>
				<Text style={styles.label}>{label}</Text>
				<Text style={styles.description}>
					{[description, 'No document yet · Photo, max 5 MB'].filter(Boolean).join(' · ')}
				</Text>
				<AppTag
					label={optional ? 'Optional' : 'Required'}
					bg={optional ? APP_COLORS.pageBg : APP_COLORS.dangerBg}
					ink={optional ? APP_COLORS.inkMuted : APP_COLORS.danger}
					size="xs"
					shape="rounded"
					uppercase={false}
					style={styles.tag}
				/>
			</View>
			{onUpload ? (
				<TouchableOpacity
					style={styles.upload}
					onPress={onUpload}
					accessibilityRole="button"
					accessibilityLabel={`Upload ${label}`}
				>
					<MaterialCommunityIcons name="upload" size={16} color="#FFFFFF" />
					<Text style={styles.uploadText}>Upload</Text>
				</TouchableOpacity>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	uploaded: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 10,
	},
	missing: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	smallLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	fileName: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	label: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	description: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	tag: {
		alignSelf: 'flex-start',
		marginTop: 3,
	},
	replace: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	// a rejected / re-upload-needed document: the action is the thing to do next
	reupload: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
	upload: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	uploadText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFFFFF',
	},
})

export default AppDocumentRow
