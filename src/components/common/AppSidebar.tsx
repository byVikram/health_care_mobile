import React, { useEffect, useRef, useState } from 'react'
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'

import PatientQr from '../../features/patientQr/PatientQr'
import { USER_ROLES } from '../../constants/constants'

// ✅ FIX: use require instead of import for PNG
const ORCode = require('../../assets/icons/QrCode.png')

export default function AppSidebar({
	visible,
	profileCompletion = 22,
	onClose,
	onLogout,
	onEditProfile,
	menuItems,
}: any) {
	const translateX = useRef(new Animated.Value(-290)).current
	const insets = useSafeAreaInsets()

	// ✅ FIX: avoid TypeScript errors safely
	const { user, role } = useAuth() as any

	const [showQR, setShowQR] = useState(false)

	const userName = user?.name ?? user?.full_name ?? user?.username ?? 'User'

	const profileImageUrl = user?.profile_image ?? user?.photo ?? user?.avatar ?? null

	const imageSource = profileImageUrl ? { uri: profileImageUrl } : require('../../assets/Banner/doctor.png')

	const isPatient = role === USER_ROLES.PATIENT || role?.toLowerCase?.() === 'patient'

	useEffect(() => {
		Animated.timing(translateX, {
			toValue: visible ? 0 : -290,
			duration: 220,
			useNativeDriver: true,
		}).start()
	}, [visible])

	return (
		<Modal visible={visible} transparent animationType="none">
			<View style={styles.modalRoot}>
				<Pressable style={styles.backdrop} onPress={onClose} />

				<Animated.View style={[styles.sidebar, { paddingTop: insets.top + 8, transform: [{ translateX }] }]}>
					{/* PROFILE */}
					<View style={styles.profileSection}>
						<View style={styles.avatarWrapper}>
							<Image source={imageSource} style={styles.avatarImage} />
						</View>

						<View style={styles.profileInfo}>
							<Text style={styles.nameText}>{userName}</Text>

							<TouchableOpacity onPress={onEditProfile}>
								<Text style={styles.profileLink}>View and Edit profile</Text>
							</TouchableOpacity>

							{profileCompletion !== undefined && (
								<Text style={styles.profileCompletion}>{profileCompletion}% profile completed</Text>
							)}
						</View>

						{/* QR for patient only */}
						{isPatient && (
							<TouchableOpacity onPress={() => setShowQR(true)}>
								<Image source={ORCode} style={styles.qrRight} />
							</TouchableOpacity>
						)}
					</View>

					{/* QR MODAL */}
					{isPatient && (
						<PatientQr
							visible={showQR}
							onClose={() => setShowQR(false)}
							name={userName}
							patientId="PID1120"
							phone="+91 9876543210"
							email="email@address.com"
							address="KR Market Bengaluru"
							image={imageSource}
						/>
					)}

					<View style={styles.separator} />

					{/* MENU */}
					<ScrollView style={styles.menuSection}>
						{menuItems.map((item: any) => (
							<TouchableOpacity
								key={item.id}
								style={styles.menuItem}
								onPress={() => {
									item.onPress()
									onClose()
								}}
							>
								<Text style={styles.menuLabel}>{item.label}</Text>
								<MaterialCommunityIcons name="chevron-right" size={18} color="#9aa4a8" />
							</TouchableOpacity>
						))}
					</ScrollView>

					{/* LOGOUT */}
					<TouchableOpacity style={styles.logoutItem} onPress={onLogout}>
						<Text style={styles.logoutText}>Log out</Text>
					</TouchableOpacity>
				</Animated.View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	modalRoot: { flex: 1, flexDirection: 'row' },
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.35)',
	},

	sidebar: {
		width: 290,
		backgroundColor: '#fff',
		borderTopRightRadius: 18,
		borderBottomRightRadius: 18,
		paddingHorizontal: 14,
		paddingBottom: 20,
	},

	profileSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
	},

	avatarWrapper: {
		width: 70,
		height: 80,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#e8f0f2',
	},

	avatarImage: { width: '100%', height: '100%' },

	profileInfo: {
		flex: 1,
		marginHorizontal: 8,
	},

	nameText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#142b30',
	},

	profileLink: {
		fontSize: 10.9,
		color: '#1f8c9e',
		marginTop: 2,
	},

	profileCompletion: {
		fontSize: 10,
		color: '#2f8c58',
		marginTop: 3,
	},

	qrRight: {
		width: 65,
		height: 65,
	},

	separator: {
		height: 1,
		backgroundColor: '#e9eef0',
	},

	menuSection: {
		flex: 1,
		paddingTop: 10,
	},

	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f3f4',
	},

	menuLabel: {
		flex: 1,
		fontSize: 14,
		color: '#24373d',
	},

	logoutItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderTopWidth: 1,
		borderTopColor: '#e9eef0',
	},

	logoutText: {
		color: '#c63e3e',
		fontWeight: '700',
		fontSize: 14,
	},
})
