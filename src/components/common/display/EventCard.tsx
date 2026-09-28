import React from 'react'
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography, AppButton } from '../index'

export interface EventItem {
	id: string
	title: string
	category: string
	category_label: string
	event_date: string
	event_time: string
	end_time: string
	location_type?: string
	location?: string
	registration_link?: string
	description: string
	cover_image_url?: string
	status: string
	is_expired?: boolean
}

import type { DimensionValue } from 'react-native'

interface EventCardProps {
	item: EventItem
	cardWidth?: DimensionValue
	imageHeight?: number
	marginRight?: number
	onRegister: () => void
	onViewDetails: () => void
}

const TEAL = '#0c7c7c'
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&h=320&fit=crop'

function formatTime(timeStr?: string) {
	if (!timeStr) return ''
	const [h, m] = timeStr.split(':')
	let hr = parseInt(h, 10)
	const suffix = hr >= 12 ? 'PM' : 'AM'
	hr = hr % 12 || 12
	return `${hr}:${m} ${suffix}`
}

export function formatApiDateForDisplay(dateString?: string) {
	if (!dateString) return ''
	const d = new Date(dateString)
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function EventCard({
	item,
	cardWidth,
	imageHeight = 120,
	marginRight = 0,
	onRegister,
	onViewDetails,
}: EventCardProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const dateStr = formatApiDateForDisplay(item.event_date)
	const timeStr = `${formatTime(item.event_time)} - ${formatTime(item.end_time)}`
	const locationText = item.location_type === 'online' ? 'Online' : item.location || 'Location not provided'
	const hasRegistrationLink = !!item.registration_link

	return (
		<View
			style={[
				styles.card,
				cardWidth ? { width: cardWidth } : { flex: 1 },
				{ marginRight },
			]}
		>
			<Image
				source={{ uri: item.cover_image_url || DEFAULT_COVER_IMAGE }}
				resizeMode="cover"
				style={[styles.image, { height: imageHeight }]}
			/>

			<View style={styles.categoryBadge}>
				<AppTypography variant="caption" style={styles.categoryText}>
					{item.category_label || item.category}
				</AppTypography>
			</View>

			<View style={styles.cardBody}>
				<AppTypography
					variant="body"
					style={[styles.eventTitle, isTablet && styles.eventTitleTablet]}
					numberOfLines={2}
				>
					{item.title}
				</AppTypography>

				<View style={styles.metaRow}>
					<Ionicons name="calendar-outline" size={14} color="#496879" />
					<AppTypography variant="caption" style={styles.metaText} numberOfLines={1}>
						{dateStr} • {timeStr}
					</AppTypography>
				</View>

				<View style={styles.metaRow}>
					{item.location_type === 'online' ? (
						<Ionicons name="videocam-outline" size={14} color="#16a34a" />
					) : (
						<Ionicons name="location-outline" size={14} color="#496879" />
					)}
					<AppTypography
						variant="caption"
						style={[styles.metaText, item.location_type === 'online' && { color: '#16a34a' }]}
						numberOfLines={1}
					>
						{locationText}
					</AppTypography>
				</View>

				<AppTypography variant="caption" style={styles.descriptionText} numberOfLines={2}>
					{item.description}
				</AppTypography>

				<View style={styles.buttonStack}>
					<AppButton
						variant="primary"
						onPress={onRegister}
						disabled={!hasRegistrationLink}
						style={[styles.registerBtn, !hasRegistrationLink && styles.registerBtnDisabled]}
						contentStyle={styles.btnContent}
						labelStyle={styles.registerBtnText}
					>
						Register Now
					</AppButton>

					<AppButton
						variant="outline"
						onPress={onViewDetails}
						style={styles.detailsBtn}
						contentStyle={styles.btnContent}
						labelStyle={styles.detailsBtnText}
					>
						View Details
					</AppButton>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 3,
		position: 'relative',
	},
	image: {
		width: '100%',
		backgroundColor: '#edf4f5',
	},
	categoryBadge: {
		position: 'absolute',
		top: 10,
		left: 10,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	categoryText: {
		fontWeight: '600',
		fontSize: 10,
		color: '#ffffff',
	},
	cardBody: {
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 10,
	},
	eventTitle: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: '#10263A',
		marginBottom: 6,
	},
	eventTitleTablet: {
		fontSize: 16,
		lineHeight: 22,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
		marginBottom: 4,
	},
	metaText: {
		flex: 1,
		color: '#496879',
		fontSize: 11,
		lineHeight: 15,
	},
	descriptionText: {
		marginTop: 4,
		marginBottom: 8,
		color: '#64748b',
		fontSize: 12,
		lineHeight: 16,
	},
	buttonStack: {
		flexDirection: 'column',
		gap: 6,
		marginTop: 'auto',
	},
	btnContent: {
		height: 32,
	},
	registerBtn: {
		borderRadius: 6,
		backgroundColor: TEAL,
	},
	registerBtnDisabled: {
		backgroundColor: '#cbd5e1',
		opacity: 0.8,
	},
	registerBtnText: {
		fontSize: 11,
		fontWeight: '700',
		marginVertical: 0,
	},
	detailsBtn: {
		borderRadius: 6,
		borderColor: '#cbd5e1',
	},
	detailsBtnText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#475569',
		marginVertical: 0,
	},
})
