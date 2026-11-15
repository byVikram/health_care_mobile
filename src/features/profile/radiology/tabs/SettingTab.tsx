// src/features/profile/radiology/tabs/SettingTab.tsx

import React, { useState } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	useWindowDimensions,
	Linking,
	Share,
} from 'react-native'
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { AppModal, AppToggle, AppTypography } from '../../../../components/common'
import { showStatusModal } from '../../../../services/apiService'

export default function SettingsTab() {
	const [showModal, setShowModal] = useState(false)
	const [notifyNewBooking, setNotifyNewBooking] = useState(true)
	const [notifyBookingCancelled, setNotifyBookingCancelled] = useState(true)
	const [notifyPrescriptionVerified, setNotifyPrescriptionVerified] = useState(true)
	const [notifyReportDelivered, setNotifyReportDelivered] = useState(true)
	const { width } = useWindowDimensions()

	const handleAbout = () => {
		showStatusModal({
			status: 'info',
			title: 'About Whisper ai',
			description: 'Version 1.0.0',
			submitText: 'OK',
		})
	}

	const handleRate = () => {
		Linking.openURL('https://apps.apple.com').catch(() => {
			Toast.show({ type: 'error', text1: 'Unable to open app store' })
		})
	}

	const handleShare = async () => {
		await Share.share({
			message: 'Check out Whisper ai!',
		})
	}

	const notificationItems = [
		{
			label: 'Get notifications when a new booking is requested',
			value: notifyNewBooking,
			onValueChange: setNotifyNewBooking,
		},
		{
			label: 'Get notifications when a booking is cancelled',
			value: notifyBookingCancelled,
			onValueChange: setNotifyBookingCancelled,
		},
		{
			label: 'Get notifications when a patient prescription is uploaded/verified',
			value: notifyPrescriptionVerified,
			onValueChange: setNotifyPrescriptionVerified,
		},
		{
			label: 'Get notifications when a scan report is delivered',
			value: notifyReportDelivered,
			onValueChange: setNotifyReportDelivered,
		},
	]

	const accountItems = [
		{
			label: 'About Whisper ai',
			icon: 'information-circle-outline' as const,
			onPress: handleAbout,
		},
		{
			label: 'Rate us on app store',
			icon: 'star-outline' as const,
			onPress: handleRate,
		},
		{
			label: 'Share the app with family & friends',
			icon: 'share-social-outline' as const,
			onPress: handleShare,
		},
	]

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<AppTypography variant="h4" style={styles.Title}>
				Notification Settings
			</AppTypography>

			<View style={styles.settingsCard}>
				{notificationItems.map((item, index) => (
					<React.Fragment key={item.label}>
						<View style={styles.settingRow}>
							<AppTypography variant="body" style={styles.settingText}>
								{item.label}
							</AppTypography>
							<AppToggle
								value={item.value}
								onValueChange={item.onValueChange}
								showStatusText={false}
								activeColor="#287779"
								inactiveColor="#d8e0ea"
								accessibilityLabel={item.label}
							/>
						</View>
						{index < notificationItems.length - 1 ? <View style={styles.settingDivider} /> : null}
					</React.Fragment>
				))}
			</View>

			<AppTypography variant="h4" style={styles.Title}>
				Account Settings
			</AppTypography>

			<View style={styles.settingsCard}>
				{accountItems.map((item, index) => (
					<React.Fragment key={item.label}>
						<TouchableOpacity style={styles.accountRow} onPress={item.onPress} activeOpacity={0.8}>
							<View style={styles.accountRowLeft}>
								<Ionicons name={item.icon} size={22} color="#287779" />
								<AppTypography variant="body" style={styles.accountText}>
									{item.label}
								</AppTypography>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#9aa4af" />
						</TouchableOpacity>
						{index < accountItems.length - 1 ? <View style={styles.settingDivider} /> : null}
					</React.Fragment>
				))}
			</View>

			<TouchableOpacity style={styles.deleteBtn} onPress={() => setShowModal(true)}>
				<AppTypography variant="body" style={styles.deleteText}>
					Deactivate the Account
				</AppTypography>
				<Ionicons name="trash-outline" size={18} color="#fff" />
			</TouchableOpacity>

			<AppModal visible={showModal} onDismiss={() => setShowModal(false)}>
				<View style={[styles.modalContent, { width: Math.max(width * 0.85 - 40, 240) }]}>
					<AppTypography variant="body" style={styles.modalTitle}>
						Deactivate Account?
					</AppTypography>

					<AppTypography variant="body" style={styles.modalText}>
						All your data will be permanently deactivated.
					</AppTypography>

					<View style={styles.modalActions}>
						<TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
							<AppTypography variant="body" style={styles.cancelText}>
								Cancel
							</AppTypography>
						</TouchableOpacity>

						<TouchableOpacity style={styles.confirmBtn}>
							<AppTypography variant="body" style={styles.confirmText}>
								Deactivate
							</AppTypography>
						</TouchableOpacity>
					</View>
				</View>
			</AppModal>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f7f7',
	},
	contentContainer: {
		flexGrow: 1,
		padding: 16,
		paddingBottom: 24,
	},

	Title: {
		color: '#343434',
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		marginBottom: 16,
	},

	settingsCard: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#e0e6ea',
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 24,
	},

	settingRow: {
		minHeight: 72,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 14,
	},

	settingText: {
		flex: 1,
		minWidth: 0,
		color: '#00172d',
		fontSize: 15,
		lineHeight: 21,
		fontWeight: '400',
	},

	settingDivider: {
		height: 1,
		backgroundColor: '#e0e6ea',
	},

	accountRow: {
		minHeight: 64,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 14,
	},

	accountRowLeft: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},

	accountText: {
		flex: 1,
		minWidth: 0,
		color: '#00172d',
		fontSize: 15,
		lineHeight: 21,
		fontWeight: '400',
	},

	deleteBtn: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#e53935',
		padding: 14,
		paddingBottom: 12,
		borderRadius: 8,
	},

	deleteText: {
		color: '#fff',
		fontSize: 15,
		lineHeight: 21,
		fontWeight: '400',
	},

	modalTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '400',
		marginBottom: 8,
	},

	modalText: {
		color: '#666',
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 16,
	},

	modalContent: {
		maxWidth: 420,
	},

	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},

	cancelBtn: {
		marginRight: 12,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},

	cancelText: {
		color: '#555',
		fontSize: 14,
		lineHeight: 20,
	},

	confirmBtn: {
		backgroundColor: '#e53935',
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 6,
	},

	confirmText: {
		color: '#fff',
		fontSize: 14,
		lineHeight: 20,
	},
})
