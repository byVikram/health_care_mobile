import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTypography } from './AppTypography'

interface AppScreenHeaderProps {
	title?: string
	onBack?: () => void
	rightElement?: React.ReactNode
}

export default function AppScreenHeader({ title, onBack, rightElement }: AppScreenHeaderProps) {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()

	const handleBack = () => {
		if (onBack) {
			onBack()
		} else if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate('MainTabs', { screen: 'Portal' })
		}
	}

	return (
		<View style={[styles.header, { paddingTop: insets.top + 16 }]}>
			{/* Background Waves */}
			<View style={styles.waveOne} />
			<View style={styles.waveTwo} />

			<View style={styles.headerContent}>
				<TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
					<MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />
				</TouchableOpacity>
				<View style={styles.headerText}>
					<AppTypography style={styles.title}>{title}</AppTypography>
				</View>
				{rightElement && (
					<View style={styles.rightElementContainer}>
						{rightElement}
					</View>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	header: {
		backgroundColor: '#1f5f68',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		overflow: 'hidden',
		position: 'relative',
	},
	waveOne: {
		position: 'absolute',
		width: 420,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.06)',
		left: -140,
		top: -70,
		transform: [{ rotate: '-4deg' }],
	},
	waveTwo: {
		position: 'absolute',
		width: 430,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.05)',
		left: -95,
		top: -22,
		transform: [{ rotate: '-4deg' }],
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		zIndex: 10,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.15)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.3)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerText: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	title: {
		color: '#ffffff',
		fontSize: 20,
		fontWeight: '600',
	},
	rightElementContainer: {
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
})
