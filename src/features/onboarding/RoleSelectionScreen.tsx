import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	StatusBar,
	ActivityIndicator,
	useWindowDimensions,
	Image, // ✅ added
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { getRoles } from '../auth/authService'
import type { AuthScreenProps } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import { USER_ROLES } from '../../constants/constants'

type Role = {
	id: string
	label: string
}

type RoleSelectionProps = AuthScreenProps<typeof ROUTES.AUTH.ROLE_SELECTION>

export default function RoleSelectionScreen({ navigation }: RoleSelectionProps) {
	const [roles, setRoles] = useState<Role[]>([])
	const [loading, setLoading] = useState(true)
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const isTablet = width >= 768
	const isLandscape = width > height
	const backButtonOffset = insets.top + (isTablet ? 24 : isLandscape ? 18 : 16)
	const horizontalPadding = isTablet ? 40 : 20
	const contentMaxWidth = isTablet ? 560 : 420
	const cardHeight = isTablet ? 88 : 78
	const iconSize = isTablet ? 58 : 52
	const imageSize = isTablet ? 32 : 28

	useEffect(() => {
		fetchRoles()
	}, [])

	const fetchRoles = async () => {
		try {
			const res = await getRoles()
			console.log(res)

			if (res.success && Array.isArray(res.data)) {
				setRoles(res.data)
			}
		} catch (error) {
			console.error('Error fetching roles:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleRoleSelect = (role: Role) => {
		console.log('Selected role:', role) // Debug log
		let mappedRole: string | null = null
		let mappedRoleId: string | null = "a1b2c3d4-0001-0001-0001-000000000001"

		if (role.label.toLowerCase() === 'doctor') {
			mappedRole = USER_ROLES.DOCTOR
			mappedRoleId = role.id
		} else if (role.label.toLowerCase() === 'patient') {
			mappedRole = USER_ROLES.PATIENT
			mappedRoleId = role.id
		}

		if (!mappedRole) {
			console.warn('Unknown role:', role)
			return
		}

		navigation.navigate(ROUTES.AUTH.ONBOARDING, {
			roleLabel: role.label,
			roleId: mappedRoleId,
		})
	}

	const handleClose = () => {
		navigation.navigate(ROUTES.AUTH.LOGIN)
	}

	// ✅ Image mapping
	const roleImages: Record<string, any> = {
		ancillary: require('../../assets/splash/ancillary.png'),
		laboratory: require('../../assets/splash/laboratory.png'),
		pharmacy: require('../../assets/splash/pharmacy.png'),
		radiology: require('../../assets/splash/radiology.png'),
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />

			<Pressable
				style={[
					styles.backButton,
					{ top: backButtonOffset },
					isTablet && styles.backButtonTablet,
				]}
				onPress={handleClose}
				accessibilityRole="button"
				accessibilityLabel="Go to login"
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<Ionicons name="chevron-back" size={isTablet ? 34 : 30} color="#ffffff" />
			</Pressable>

			<View
				style={[
					styles.container,
					{
						paddingHorizontal: horizontalPadding,
						justifyContent: isLandscape && !isTablet ? 'flex-start' : 'center',
						paddingTop: isLandscape && !isTablet ? 32 : 0,
					},
				]}
			>
				<View style={[styles.content, { maxWidth: contentMaxWidth }]}>
					<Text style={[styles.heading, isTablet && styles.headingTablet]}>Choose Your Role</Text>
					<Text style={[styles.subheading, isTablet && styles.subheadingTablet]}>
						Select how you want to continue
					</Text>

					{loading ? (
						<ActivityIndicator size="large" color="#ffffff" />
					) : (
						<View style={styles.cardsWrapper}>
							{roles.map((role) => (
								<Pressable
									key={role.id}
									onPress={() => handleRoleSelect(role)}
									style={[styles.card, { height: cardHeight }]}
								>
									<View style={[styles.iconCircle, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}>
										<Image
											source={
												roleImages[role.label.toLowerCase()] ||
												require('../../assets/splash/ancillary.png')
											}
											style={{ width: imageSize, height: imageSize }}
											resizeMode="contain"
										/>
									</View>

									<View style={styles.textWrap}>
										<Text style={[styles.title, isTablet && styles.titleTablet]}>{role.label}</Text>
									</View>

									<Ionicons
										name="chevron-forward"
										size={isTablet ? 24 : 20}
										color="#134149"
									/>
								</Pressable>
							))}
						</View>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#134149',
	},

	container: {
		flex: 1,
		alignItems: 'center',
	},

	content: {
		width: '100%',
	},

	backButton: {
		position: 'absolute',
		left: 14,
		zIndex: 10,
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255,255,255,0.10)',
	},

	backButtonTablet: {
		left: 24,
		width: 52,
		height: 52,
		borderRadius: 26,
	},

	heading: {
		fontSize: 28,
		fontWeight: '700',
		color: '#fff',
		textAlign: 'left',
		marginBottom: 8,
	},

	headingTablet: {
		fontSize: 34,
	},

	subheading: {
		fontSize: 15,
		color: '#d7e7e8',
		textAlign: 'left',
		marginBottom: 30,
	},

	subheadingTablet: {
		fontSize: 17,
		marginBottom: 36,
	},

	cardsWrapper: {
		gap: 16,
	},

	card: {
		borderRadius: 16,
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 4,
	},

	iconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#e8f0f0',
		alignItems: 'center',
		justifyContent: 'center',
	},

	textWrap: {
		flex: 1,
		paddingLeft: 14,
	},

	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1d1d1d',
	},

	titleTablet: {
		fontSize: 20,
	},
})
