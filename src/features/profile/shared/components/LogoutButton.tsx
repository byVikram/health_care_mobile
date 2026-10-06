// Hub footer: outlined 48px "Log out" button (danger text, divider border) with the shared logout confirm modal, and the
// "Karolahealth · version x.y.z" line under it.

import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { LogoutConfirmModal } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { useAuth } from '../../../../context/AuthContext'

export function LogoutButton() {
	const { clearAuth } = useAuth()
	const [confirming, setConfirming] = useState(false)
	const version = Constants.expoConfig?.version

	return (
		<View style={styles.wrap}>
			<TouchableOpacity style={styles.button} onPress={() => setConfirming(true)} accessibilityRole="button">
				<MaterialCommunityIcons name="logout" size={20} color={APP_COLORS.danger} />
				<Text style={styles.text}>Log out</Text>
			</TouchableOpacity>
			<Text style={styles.version}>Karolahealth{version ? ` · version ${version}` : ''}</Text>
			<LogoutConfirmModal
				visible={confirming}
				onCancel={() => setConfirming(false)}
				onConfirm={async () => {
					setConfirming(false)
					await clearAuth()
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		marginTop: 8,
		marginHorizontal: 16,
		gap: 10,
	},
	button: {
		height: 48,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	text: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
	version: {
		textAlign: 'center',
		fontSize: 12,
		color: APP_COLORS.inkMuted,
	},
})

export default LogoutButton
