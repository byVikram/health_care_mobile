import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface PatientInformationCardProps {
	name: string
	age: number
	gender: 'Male' | 'Female' | 'Other'
	phone: string
	avatarUrl?: string
	onCallPress?: () => void
}

export default function PatientInformationCard({
	name,
	age,
	gender,
	phone,
	avatarUrl,
	onCallPress,
}: PatientInformationCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				{avatarUrl ? (
					<Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
				) : (
					<View style={styles.avatarPlaceholder}>
						<Ionicons name="person" size={24} color="#667B8F" />
					</View>
				)	}

				<View style={styles.infoCol}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.details}>
						{gender} • {age} years
					</Text>
				</View>

				{onCallPress && (
					<TouchableOpacity style={styles.callButton} onPress={onCallPress} activeOpacity={0.75}>
						<Ionicons name="call" size={20} color="#2B6F71" />
					</TouchableOpacity>
				)}
			</View>

			<View style={styles.phoneRow}>
				<Ionicons name="phone-portrait-outline" size={16} color="#667B8F" style={styles.phoneIcon} />
				<Text style={styles.phoneText}>{phone}</Text>
			</View>
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
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#F4F8FB',
	},
	avatarPlaceholder: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#F4F8FB',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E6EDF2',
	},
	infoCol: {
		flex: 1,
		marginLeft: 12,
	},
	name: {
		fontSize: 16,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 4,
	},
	details: {
		fontSize: 13,
		color: '#587087',
		fontWeight: '500',
	},
	callButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#EAF6F6',
		justifyContent: 'center',
		alignItems: 'center',
	},
	phoneRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 14,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F0F4F8',
	},
	phoneIcon: {
		marginRight: 6,
	},
	phoneText: {
		fontSize: 13,
		color: '#587087',
		fontWeight: '600',
	},
})
