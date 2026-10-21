import React, { useState } from 'react'
import { ROUTES } from '../../navigation/routes'
import {
	SafeAreaView,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Share,
	Linking,
	StyleSheet,
	Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ArrowIcon from '../../assets/Settings/arrow.svg'
// SVG Icons
import FrameIcon from '../../assets/Settings/Frame.svg'
import StarIcon from '../../assets/Settings/star.svg'
import VectorIcon from '../../assets/Settings/Vector.svg'
import { useAuth } from '../../context/AuthContext'
import { LogoutConfirmModal } from '../../components/common'

const SettingPage = () => {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { clearAuth } = useAuth()
	const [showLogoutModal, setShowLogoutModal] = useState(false)
	// ─── Handlers ─────────────────────────────
	const handleAbout = () => {
		Alert.alert('About Whisper AI', 'Version 1.0.0')
	}

	const handleRateUs = () => {
		Linking.openURL('https://apps.apple.com').catch(() => Alert.alert('Error', 'Unable to open store'))
	}

	const handleShare = async () => {
		await Share.share({
			message: 'Check out Whisper AI!',
		})
	}

	const handleLogout = () => {
		setShowLogoutModal(true)
	}
	const confirmLogout = async () => {
		try {
			setShowLogoutModal(false)
			await clearAuth()
		} catch (error) {
			setShowLogoutModal(false)
		}
	}
	const handleDelete = () => {
		Alert.alert('Delete Account', 'Permanent action!', [
			{ text: 'Cancel' },
			{ text: 'Delete', style: 'destructive' },
		])
	}

	const menuItems = [
		{
			label: 'My Wallet',
			icon: <MaterialCommunityIcons name="wallet-outline" size={22} color="#0c7c7c" />,
			onPress: () => navigation.navigate(ROUTES.STACK.WALLET as any),
			destructive: false,
		},
		{
			label: 'About whisper ai',
			icon: <FrameIcon width={22} height={22} />,
			onPress: handleAbout,
			destructive: false,
		},
		{
			label: 'Rate us on app store',
			icon: <StarIcon width={22} height={22} />,
			onPress: handleRateUs,
			destructive: false,
		},
		{
			label: 'Share the app with family & friends',
			icon: <VectorIcon width={22} height={22} />,
			onPress: handleShare,
			destructive: false,
		},
		{
			label: 'Logout',
			onPress: handleLogout,
			destructive: true,
		},
		{
			label: 'Delete account',
			onPress: handleDelete,
			destructive: true,
		},
	]

	return (
		<SafeAreaView style={styles.container}>
			<View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
				<View style={styles.waveOne} />
				<View style={styles.waveTwo} />

				<View style={styles.headerContent}>
					<TouchableOpacity onPress={() => navigation.goBack()}>
						<ArrowIcon />
					</TouchableOpacity>

					<Text style={styles.headerTitle}>Settings</Text>

					<View style={{ width: 22 }} />
				</View>
			</View>

			<ScrollView showsVerticalScrollIndicator={false}>
				<View style={styles.card}>
					{menuItems.map((item, index) => (
						<TouchableOpacity
							key={index}
							style={[styles.row, index !== menuItems.length - 1 && styles.borderBottom]}
							onPress={item.onPress}
						>
							<View style={styles.left}>
								{item.icon && item.icon}

								<Text style={[styles.text, item.destructive && styles.destructive]}>{item.label}</Text>
							</View>

							<MaterialCommunityIcons
								name="chevron-right"
								size={20}
								color={item.destructive ? '#FF3B30' : '#999'}
							/>
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>
			<LogoutConfirmModal
			visible={showLogoutModal}
			onCancel={() => setShowLogoutModal(false)}
			onConfirm={confirmLogout}
		/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f2f4f5',
	},

	// 🔥 Header
	headerWrapper: {
		backgroundColor: '#1f5f68',
		paddingBottom: 20,
		paddingHorizontal: 16,
		overflow: 'hidden',
	},

	headerContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},

	headerTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '600',
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

	// Card
	card: {
		backgroundColor: '#fff',
		marginHorizontal: 12,
		marginTop: 12,
		borderRadius: 12,
		overflow: 'hidden',
	},

	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 16,
	},

	borderBottom: {
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},

	left: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},

	text: {
		fontSize: 15,
		color: '#333',
	},

	destructive: {
		color: '#FF3B30',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
	},

	modalCard: {
		width: '85%',
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
	},

	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},

	modalDescription: {
		marginTop: 10,
		color: '#666',
		fontSize: 14,
	},

	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 20,
	},

	cancelText: {
		fontSize: 15,
		color: '#666',
		marginRight: 20,
	},

	logoutButton: {
		backgroundColor: '#FF3B30',
		borderRadius: 8,
		paddingHorizontal: 18,
		paddingVertical: 8,
	},

	logoutText: {
		color: '#fff',
		fontWeight: '600',
	},
})

export default SettingPage
