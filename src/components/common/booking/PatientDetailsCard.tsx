import React from 'react'
import { Image, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../display/AppTypography'

interface PatientDetailsCardProps {
	name: string
	age: number | string
	gender: string
	avatarUrl?: string
	/** e.g. "Self" / "Family Member" — rendered as a small chip next to the
	 *  name when provided. Omit to hide it. */
	relationship?: string
	/** Rendered as a phone row with a call icon when provided. Omit to hide
	 *  both the row and the call button. */
	phone?: string
	onCallPress?: () => void
	/** Overrides the default `"{gender} • {age} years"` meta line — e.g. pass
	 *  `"{age} Yrs • {gender}"` to match a different caller's existing copy. */
	metaLine?: string
	/** This component renders content only (avatar + info column), with no
	 *  card chrome (background/border/padding) of its own — wrap it in your
	 *  own container to match your screen's existing card styling. */
	style?: StyleProp<ViewStyle>
}

export default function PatientDetailsCard({
	name,
	age,
	gender,
	avatarUrl,
	relationship,
	phone,
	onCallPress,
	metaLine,
	style,
}: PatientDetailsCardProps) {
	return (
		<View style={[styles.container, style]}>
			<View style={styles.avatarWrap}>
				{avatarUrl ? (
					<Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
				) : (
					<MaterialCommunityIcons name="account" size={22} color="#0C7C7C" />
				)}
			</View>

			<View style={styles.infoCol}>
				<View style={styles.nameRow}>
					<AppTypography variant="h4" style={styles.name}>
						{name}
					</AppTypography>
					{relationship ? (
						<View style={styles.relationChip}>
							<AppTypography variant="caption" style={styles.relationText}>
								{relationship}
							</AppTypography>
						</View>
					) : null}
				</View>

				<AppTypography variant="caption" style={styles.metaText}>
					{metaLine ?? `${gender} • ${age} years`}
				</AppTypography>

				{phone ? (
					<View style={styles.phoneRow}>
						<Ionicons name="phone-portrait-outline" size={16} color="#667B8F" style={styles.phoneIcon} />
						<AppTypography variant="caption" style={styles.phoneText}>
							{phone}
						</AppTypography>
					</View>
				) : null}
			</View>

			{onCallPress && (
				<TouchableOpacity style={styles.callButton} onPress={onCallPress} activeOpacity={0.75}>
					<Ionicons name="call" size={20} color="#2B6F71" />
				</TouchableOpacity>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	avatarWrap: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	avatarImg: {
		width: '100%',
		height: '100%',
	},
	infoCol: {
		flex: 1,
		gap: 2,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	name: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	relationChip: {
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	relationText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	metaText: {
		fontSize: 12,
		color: '#64748B',
	},
	phoneRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	phoneIcon: {
		marginRight: 6,
	},
	phoneText: {
		fontSize: 12,
		color: '#64748B',
	},
	callButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#EAF6F6',
		alignItems: 'center',
		justifyContent: 'center',
	},
})
