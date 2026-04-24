import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	StatusBar,
	ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { getRoles } from '../auth/authService' // adjust path
import type { AuthScreenProps } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'

type Role = {
	id: string
	label: string
}

type RoleSelectionProps = AuthScreenProps<typeof ROUTES.AUTH.ROLE_SELECTION>

export default function RoleSelectionScreen({ navigation }: RoleSelectionProps) {
	const [roles, setRoles] = useState<Role[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetchRoles()
	}, [])

	const fetchRoles = async () => {
		try {
			const res = await getRoles()

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
		navigation.navigate(ROUTES.AUTH.ONBOARDING, {
			roleId: role.id,
			roleLabel: role.label,
		})
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" />

			<View style={styles.container}>
				<Text style={styles.heading}>Choose Your Role</Text>
				<Text style={styles.subheading}>
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
								style={styles.card}
							>
								<View style={styles.iconCircle}>
									<Ionicons
										name={
											role.label.toLowerCase() === 'doctor'
												? 'medkit-outline'
												: 'person-outline'
										}
										size={28}
										color="#134149"
									/>
								</View>

								<View style={styles.textWrap}>
									<Text style={styles.title}>{role.label}</Text>
								</View>

								<Ionicons
									name="chevron-forward"
									size={20}
									color="#134149"
								/>
							</Pressable>
						))}
					</View>
				)}
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
		paddingHorizontal: 20,
		justifyContent: 'center',
	},

	heading: {
		fontSize: 28,
		fontWeight: '700',
		color: '#fff',
		textAlign: 'center',
		marginBottom: 8,
	},

	subheading: {
		fontSize: 15,
		color: '#d7e7e8',
		textAlign: 'center',
		marginBottom: 30,
	},

	cardsWrapper: {
		gap: 16,
	},

	card: {
		height: 78,
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
})
