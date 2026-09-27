import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppBottomSheet } from '../../../components/common/layout/AppBottomSheet'
import { AppTypography } from '../../../components/common/display/AppTypography'
import { AppButton } from '../../../components/common/buttons/AppButton'
import AppAvatar from '../../../components/common/display/AppAvatar'
import RatingStars from './RatingStars'
import { AncillaryBooking, AncillaryReviewData } from '../ancillaryService'

interface RateAncillaryReviewModalProps {
	visible: boolean
	onClose: () => void
	booking: AncillaryBooking | null
	existingReview?: AncillaryReviewData | null
	onSubmit: (rating: number, comment: string) => Promise<void> | void
	isSubmitting?: boolean
}

const RATING_LABELS: Record<number, string> = {
	1: '1 — Poor',
	2: '2 — Fair',
	3: '3 — Good',
	4: '4 — Very Good',
	5: '5 — Excellent',
}

const MAX_COMMENT_LENGTH = 500

export default function RateAncillaryReviewModal({
	visible,
	onClose,
	booking,
	existingReview,
	onSubmit,
	isSubmitting = false,
}: RateAncillaryReviewModalProps) {
	const [rating, setRating] = useState<number>(0)
	const [comment, setComment] = useState<string>('')
	const [isEditing, setIsEditing] = useState<boolean>(false)

	useEffect(() => {
		if (visible) {
			if (existingReview) {
				setRating(existingReview.rating)
				setComment(existingReview.comment || '')
				setIsEditing(false)
			} else {
				setRating(0)
				setComment('')
				setIsEditing(true)
			}
		}
	}, [visible, existingReview])

	if (!booking) return null

	const providerName = booking.provider.name || 'Healthcare Professional'
	const designation = booking.provider.designation || 'Registered Nurse'
	const serviceName = booking.serviceName || 'Healthcare Service'
	const completedDate = booking.date || 'Today'

	const handleSubmit = async () => {
		if (rating < 1 || isSubmitting) return
		await onSubmit(rating, comment)
	}

	const isViewMode = !isEditing && !!existingReview

	return (
		<AppBottomSheet
			visible={visible}
			title={isViewMode ? 'Patient Review' : 'Rate & Review'}
			onClose={isSubmitting ? () => {} : onClose}
		>
			<View style={styles.container}>
				{/* 1. Clinician & Service Header Info */}
				<View style={styles.headerInfoCard}>
					<AppAvatar
						uri={booking.provider.avatar}
						name={providerName}
						size={48}
						style={styles.avatar}
					/>
					<View style={styles.headerTextCol}>
						<AppTypography variant="h4" style={styles.providerNameText} numberOfLines={1}>
							{providerName}
						</AppTypography>
						<AppTypography variant="caption" style={styles.designationText} numberOfLines={1}>
							{designation}
						</AppTypography>
						<View style={styles.serviceMetaRow}>
							<Ionicons name="medical-outline" size={13} color="#0C7C7C" />
							<AppTypography variant="caption" style={styles.serviceNameText} numberOfLines={1}>
								{serviceName}
							</AppTypography>
							<AppTypography variant="caption" style={styles.dateDotText}>
								•
							</AppTypography>
							<AppTypography variant="caption" style={styles.completedDateText}>
								{completedDate}
							</AppTypography>
						</View>
					</View>
				</View>

				{isViewMode ? (
					/* ── VIEW MODE: Existing Review Details ── */
					<View style={styles.viewModeContainer}>
						<View style={styles.reviewedBadgeRow}>
							<View style={styles.reviewedTag}>
								<Ionicons name="checkmark-circle" size={14} color="#059669" />
								<AppTypography variant="caption" style={styles.reviewedTagText}>
									Verified Patient Review
								</AppTypography>
							</View>
							{existingReview?.createdAt && (
								<AppTypography variant="caption" style={styles.reviewedDateText}>
									{existingReview.createdAt}
								</AppTypography>
							)}
						</View>

						{/* Star Rating Display */}
						<View style={styles.viewStarRow}>
							<RatingStars rating={existingReview?.rating || 5} size={22} />
							<AppTypography variant="h3" style={styles.viewStarScoreText}>
								{existingReview?.rating}.0 / 5
							</AppTypography>
						</View>

						{/* Review Comment Bubble */}
						{existingReview?.comment ? (
							<View style={styles.commentBubbleBox}>
								<AppTypography variant="body" style={styles.commentBubbleText}>
									"{existingReview.comment}"
								</AppTypography>
							</View>
						) : (
							<View style={styles.emptyCommentBox}>
								<AppTypography variant="caption" style={styles.emptyCommentText}>
									No written feedback was provided.
								</AppTypography>
							</View>
						)}

						{/* Actions */}
						<View style={styles.buttonRow}>
							<AppButton
								variant="outline"
								onPress={() => setIsEditing(true)}
								style={{ flex: 1 }}
							>
								Edit Review
							</AppButton>
							<AppButton
								variant="primary"
								onPress={onClose}
								style={{ flex: 1 }}
							>
								Done
							</AppButton>
						</View>
					</View>
				) : (
					/* ── EDIT / SUBMIT MODE: Rating & Feedback Form ── */
					<View style={styles.formContainer}>
						{/* Rating Question */}
						<AppTypography variant="h4" style={styles.questionTitle}>
							How was your experience with {providerName}?
						</AppTypography>
						<AppTypography variant="caption" style={styles.questionSubtext}>
							Your feedback directly helps us improve home healthcare quality.
						</AppTypography>

						{/* Interactive 5-Star Rating Selector */}
						<View style={styles.interactiveStarsContainer}>
							<View style={styles.starsRow}>
								{[1, 2, 3, 4, 5].map((star) => {
									const isFilled = star <= rating
									return (
										<TouchableOpacity
											key={star}
											onPress={() => setRating(star)}
											disabled={isSubmitting}
											activeOpacity={0.7}
											style={styles.starTouchTarget}
											accessibilityLabel={`Rate ${star} stars`}
										>
											<Ionicons
												name={isFilled ? 'star' : 'star-outline'}
												size={36}
												color={isFilled ? '#F59E0B' : '#CBD5E1'}
											/>
										</TouchableOpacity>
									)
								})}
							</View>

							{/* Rating Label Helper */}
							<AppTypography
								variant="caption"
								style={[
									styles.ratingLabelText,
									rating > 0 && styles.ratingLabelTextSelected,
								]}
							>
								{rating > 0
									? RATING_LABELS[rating] || `${rating} Stars`
									: 'Tap a star to rate (Required)'}
							</AppTypography>
						</View>

						{/* Optional Written Review Input */}
						<View style={styles.inputSection}>
							<View style={styles.inputHeaderRow}>
								<AppTypography variant="body" style={styles.inputSectionLabel}>
									Write a Review
								</AppTypography>
								<AppTypography variant="caption" style={styles.optionalBadgeText}>
									Optional
								</AppTypography>
							</View>

							<TextInput
								style={styles.reviewTextInput}
								placeholder="Share details about punctuality, sterile care, and overall experience..."
								placeholderTextColor="#94A3B8"
								value={comment}
								onChangeText={setComment}
								maxLength={MAX_COMMENT_LENGTH}
								multiline
								numberOfLines={4}
								editable={!isSubmitting}
								textAlignVertical="top"
							/>

							<View style={styles.charCountRow}>
								<AppTypography variant="caption" style={styles.charCountText}>
									{comment.length} / {MAX_COMMENT_LENGTH} characters
								</AppTypography>
							</View>
						</View>

						{/* Action Buttons */}
						<View style={styles.buttonRow}>
							<AppButton
								variant="outline"
								onPress={onClose}
								disabled={isSubmitting}
								style={{ flex: 1 }}
							>
								Cancel
							</AppButton>
							<AppButton
								variant="primary"
								onPress={handleSubmit}
								disabled={rating === 0 || isSubmitting}
								style={{ flex: 1.4 }}
							>
								{isSubmitting ? (
									<View style={styles.loadingRow}>
										<ActivityIndicator size="small" color="#FFFFFF" />
										<AppTypography variant="body" style={styles.submittingText}>
											Submitting...
										</AppTypography>
									</View>
								) : existingReview ? (
									'Update Review'
								) : (
									'Submit Review'
								)}
							</AppButton>
						</View>
					</View>
				)}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	container: {
		gap: 14,
	},

	/* Header Info Card */
	headerInfoCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		padding: 12,
		gap: 12,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: '#E2E8F0',
	},
	headerTextCol: {
		flex: 1,
		minWidth: 0,
	},
	providerNameText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	designationText: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 1,
	},
	serviceMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
	},
	serviceNameText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#0C7C7C',
		flexShrink: 1,
	},
	dateDotText: {
		fontSize: 11,
		color: '#94A3B8',
	},
	completedDateText: {
		fontSize: 11,
		color: '#64748B',
	},

	/* Form Container */
	formContainer: {
		gap: 12,
	},
	questionTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		textAlign: 'center',
	},
	questionSubtext: {
		fontSize: 12,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 16,
		marginTop: -4,
	},

	/* Interactive Stars */
	interactiveStarsContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 14,
		paddingHorizontal: 10,
		gap: 6,
	},
	starsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	starTouchTarget: {
		padding: 4,
	},
	ratingLabelText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#94A3B8',
		marginTop: 2,
	},
	ratingLabelTextSelected: {
		color: '#D97706',
		fontWeight: '700',
		fontSize: 13,
	},

	/* Review Input Section */
	inputSection: {
		gap: 6,
	},
	inputHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	inputSectionLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0F172A',
	},
	optionalBadgeText: {
		fontSize: 11,
		color: '#94A3B8',
		fontWeight: '600',
	},
	reviewTextInput: {
		backgroundColor: '#F8FAFC',
		borderColor: '#CBD5E1',
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 13.5,
		color: '#0F172A',
		minHeight: 88,
		lineHeight: 18,
	},
	charCountRow: {
		alignItems: 'flex-end',
	},
	charCountText: {
		fontSize: 10.5,
		color: '#94A3B8',
	},

	/* Button Actions Row */
	buttonRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: 4,
	},
	loadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	submittingText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},

	/* View Mode Styles */
	viewModeContainer: {
		gap: 12,
	},
	reviewedBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	reviewedTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
	},
	reviewedTagText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#047857',
	},
	reviewedDateText: {
		fontSize: 11,
		color: '#64748B',
	},
	viewStarRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: '#FFFFFF',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		justifyContent: 'center',
	},
	viewStarScoreText: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0F172A',
	},
	commentBubbleBox: {
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 14,
	},
	commentBubbleText: {
		fontSize: 13,
		color: '#334155',
		fontStyle: 'italic',
		lineHeight: 18,
	},
	emptyCommentBox: {
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		alignItems: 'center',
	},
	emptyCommentText: {
		fontSize: 12,
		color: '#94A3B8',
		fontStyle: 'italic',
	},
})
