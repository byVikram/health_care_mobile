import React, { useState, useRef } from 'react'
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	Modal,
	Pressable,
	Animated,
	useWindowDimensions,
	type ImageSourcePropType,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import { navigate as navigateRoot } from '../../../navigation/navigationService'

import EmergencyIcon from '../../../assets/quick-services/emergency.svg'
import AmbulanceIcon from '../../../assets/quick-services/ambulance.svg'
import BloodBankIcon from '../../../assets/quick-services/blood-bank.svg'
import IcuIcon from '../../../assets/quick-services/icu.svg'
import AppointmentsIcon from '../../../assets/quick-services/appointments.svg'
import PharmacyIcon from '../../../assets/quick-services/pharmacy.svg'
import LabIcon from '../../../assets/quick-services/lab.svg'
import RadiologyIcon from '../../../assets/quick-services/radiology.svg'
import AncilaryIcon from '../../../assets/quick-services/ancilary.svg'
import AlliedIcon from '../../../assets/quick-services/allied.png'
import TherapeuticIcon from '../../../assets/quick-services/therapeutic.png'
import ScanTypeSelectorModal from '../../radiology/component/Scantypeselectormodal'
import AncillarySelectorModal from './AncillarySelectorModal'
import AlliedSelectorModal from './AlliedSelcetorModel'
import TherapeuticSelector from './TherapeuticSelector'

type Role = 'doctor' | 'patient' | 'pharmacy' | 'radiology' | 'laboratory' | 'ancillary' | 'nurse' | null
type PopupSvgIconItem = {
	title: string
	type: 'svg'
	Component: React.ComponentType<{ width?: number; height?: number }>
}
type PopupImageIconItem = {
	title: string
	type: 'image'
	source: ImageSourcePropType
}
type PopupIconItem = PopupSvgIconItem | PopupImageIconItem

export default function QuickServicesSection({ role }: { role: Role }) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const isPharmacy = role === 'pharmacy'
	const othersButtonRef = useRef<any>(null)
	const serviceIconSize = isTablet ? 40 : 30
	const othersSquareSize = isTablet ? 17 : 12
	const popupHorizontalPadding = isTablet ? 18 : width < 360 ? 10 : 12
	const popupItemGap = isTablet ? 12 : 8
	const popupMenuWidth = Math.min(width - 24, isTablet ? 440 : 352)
	const popupColumns = 4
	const popupItemWidth = Math.floor(
		(popupMenuWidth - popupHorizontalPadding * 2 - popupItemGap * (popupColumns - 1)) / popupColumns
	)
	const popupIconBoxSize = isTablet ? 44 : 40
	const popupIconSize = isTablet ? 28 : 24
	const [othersAnchor, setOthersAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
	const popupTop = othersAnchor ? othersAnchor.y + othersAnchor.height + 8 : isTablet ? 130 : 96
	const popupLeft = othersAnchor
		? Math.min(
				Math.max(12, othersAnchor.x + othersAnchor.width / 2 - popupMenuWidth / 2),
				width - popupMenuWidth - 12,
			)
		: Math.max(12, (width - popupMenuWidth) / 2)

	const [showScanTypeModal, setShowScanTypeModal] = useState(false)
	const [showAncillaryModal, setShowAncillaryModal] = useState(false)
	const [showAlliedModal, setShowAlliedModal] = useState(false)
	const [showTherapeuticModal, setShowTherapeuticModal] = useState(false)
	const [selectedScanTypeId, setSelectedScanTypeId] = useState<number | undefined>()
	const [selectedScanTypeName, setSelectedScanTypeName] = useState<string | undefined>()

	const [showOthersModal, setShowOthersModal] = useState(false)
	const popupScale = useRef(new Animated.Value(0.7)).current
	const popupOpacity = useRef(new Animated.Value(0)).current
	const popupTranslateY = useRef(new Animated.Value(25)).current

	const openOthersModal = () => {
		const showPopup = () => {
			setShowOthersModal(true)
			popupScale.setValue(0.7)
			popupOpacity.setValue(0)
			popupTranslateY.setValue(14)

			Animated.parallel([
				Animated.spring(popupScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
				Animated.timing(popupOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
				Animated.timing(popupTranslateY, { toValue: 0, duration: 180, useNativeDriver: true }),
			]).start()
		}

		if (othersButtonRef.current?.measureInWindow) {
			othersButtonRef.current.measureInWindow(
				(x: number, y: number, measuredWidth: number, measuredHeight: number) => {
					setOthersAnchor({ x, y, width: measuredWidth, height: measuredHeight })
					showPopup()
				},
			)
			return
		}

		showPopup()
	}

	const closeOthersModal = (afterClose?: () => void) => {
		Animated.parallel([
			Animated.timing(popupScale, { toValue: 0.7, duration: 180, useNativeDriver: true }),
			Animated.timing(popupOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
			Animated.timing(popupTranslateY, { toValue: 25, duration: 180, useNativeDriver: true }),
		]).start(() => {
			setShowOthersModal(false)
			afterClose?.()
		})
	}

	const handleOtherServicePress = (title: string) => {
		if (title === 'Ancillary') {
			closeOthersModal(() => setShowAncillaryModal(true))
			return
		}

		if (title === 'Allied') {
			closeOthersModal(() => setShowAlliedModal(true))
			return
		}

		if (title === 'Therapeutic') {
			closeOthersModal(() => setShowTherapeuticModal(true))
			return
		}

		closeOthersModal()
	}

	const horizontalServices = [
		{ title: 'Appointment', Component: AppointmentsIcon },
		{ title: 'Pharmacy', Component: PharmacyIcon },
		{ title: 'Laboratory', Component: LabIcon },
		{ title: 'Radiology', Component: RadiologyIcon },
		{ title: 'Others', Component: null },
	]

	const othersPopupItems: PopupIconItem[] = [
		{ title: 'Ancillary', type: 'svg', Component: AncilaryIcon },
		{ title: 'Ambulance', type: 'svg', Component: AmbulanceIcon },
		{ title: 'Blood Bank', type: 'svg', Component: BloodBankIcon },
		{ title: 'ICU', type: 'svg', Component: IcuIcon },
		{ title: 'Emergency', type: 'svg', Component: EmergencyIcon },
		{ title: 'Allied', type: 'image', source: AlliedIcon },
		{ title: 'Therapeutic', type: 'image', source: TherapeuticIcon },
	]

	const handleServicePress = (title: string) => {
		if (title === 'Appointment') {
			navigateRoot(ROUTES.STACK.APPOINTMENTS)
		} else if (title === 'Pharmacy') {
			navigateRoot(ROUTES.STACK.PHARMACY_SEARCH_PAGE)
		} else if (title === 'Radiology') {
			setShowScanTypeModal(true)
		} else if (title === 'Laboratory') {
			navigateRoot(ROUTES.STACK.LABORATORY_LIST)
		}
	}

	if (isPharmacy) {
		return null
	}

	return (
		<View style={styles.container}>
			<View style={[styles.horizontalServicesRow, isTablet && styles.horizontalServicesRowTablet]}>
				{horizontalServices.map((s) => {
					if (s.title === 'Others' || !s.Component) {
						return (
							<TouchableOpacity
								ref={othersButtonRef}
								key={s.title}
								style={[styles.hServiceCard, isTablet && styles.hServiceCardTablet]}
								activeOpacity={0.8}
								onPress={openOthersModal}
							>
								<View
									style={[
										styles.othersIconContainer,
										{ width: serviceIconSize, height: serviceIconSize },
									]}
								>
									<View
										style={[
											styles.othersSquare,
											{
												width: othersSquareSize,
												height: othersSquareSize,
												backgroundColor: '#0c7c7c',
											},
										]}
									/>
									<View
										style={[
											styles.othersSquare,
											{
												width: othersSquareSize,
												height: othersSquareSize,
												backgroundColor: '#4264D0',
											},
										]}
									/>
									<View
										style={[
											styles.othersSquare,
											{
												width: othersSquareSize,
												height: othersSquareSize,
												backgroundColor: '#EA7F06',
											},
										]}
									/>
									<View
										style={[
											styles.othersSquare,
											{
												width: othersSquareSize,
												height: othersSquareSize,
												backgroundColor: '#DE3B40',
											},
										]}
									/>
								</View>
								<AppTypography
									style={[styles.hServiceTitle, isTablet && styles.hServiceTitleTablet]}
									numberOfLines={1}
								>
									Others
								</AppTypography>
							</TouchableOpacity>
						)
					}

					const ServiceIcon = s.Component

					return (
						<TouchableOpacity
							key={s.title}
							style={[styles.hServiceCard, isTablet && styles.hServiceCardTablet]}
							activeOpacity={0.8}
							onPress={() => handleServicePress(s.title)}
						>
							<ServiceIcon width={serviceIconSize} height={serviceIconSize} />
							<AppTypography
								style={[styles.hServiceTitle, isTablet && styles.hServiceTitleTablet]}
								numberOfLines={1}
							>
								{s.title}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</View>

			<Modal visible={showOthersModal} transparent animationType="none" onRequestClose={() => closeOthersModal()}>
				<Pressable style={styles.overlay} onPress={() => closeOthersModal()}>
					<Animated.View style={[StyleSheet.absoluteFillObject, { opacity: popupOpacity }]}>
						<BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
					</Animated.View>

					<Animated.View
						style={[
							styles.popupMenu,
							{
								position: 'absolute',
								top: popupTop,
								left: popupLeft,
								width: popupMenuWidth,
								paddingHorizontal: popupHorizontalPadding,
								opacity: popupOpacity,
								transform: [{ scale: popupScale }, { translateY: popupTranslateY }],
							},
						]}
					>
						<Pressable onPress={() => {}}>
							<View style={[styles.popupRow, { gap: popupItemGap }]}>
								{othersPopupItems.map((item) => (
									<TouchableOpacity
										key={item.title}
										style={[styles.popupItem, { width: popupItemWidth }]}
										activeOpacity={0.8}
										onPress={() => handleOtherServicePress(item.title)}
									>
										<View
											style={[
												styles.popupIconCircle,
												{ width: popupIconBoxSize, height: popupIconBoxSize },
											]}
										>
											{item.type === 'svg' ? (
												<item.Component width={popupIconSize} height={popupIconSize} />
											) : (
												<Image
													source={item.source}
													style={{ width: popupIconSize, height: popupIconSize }}
													resizeMode="contain"
												/>
											)}
										</View>
										<AppTypography style={styles.popupText} numberOfLines={3}>
											{item.title}
										</AppTypography>
									</TouchableOpacity>
								))}
							</View>
						</Pressable>
					</Animated.View>
				</Pressable>
			</Modal>

			<ScanTypeSelectorModal
				visible={showScanTypeModal}
				onClose={() => setShowScanTypeModal(false)}
				onSelect={(scanTypeId, scanTypeName) => {
					setSelectedScanTypeId(scanTypeId)
					setSelectedScanTypeName(scanTypeName)
					setShowScanTypeModal(false)
					navigateRoot(ROUTES.STACK.RADIOLOGY_LIST, {
						scanTypeId,
						scanTypeName,
					} as any)
				}}
			/>
			<AncillarySelectorModal
				open={showAncillaryModal}
				onClose={() => setShowAncillaryModal(false)}
			/>
			<AlliedSelectorModal
				open={showAlliedModal}
				onClose={() => setShowAlliedModal(false)}
			/>
			<TherapeuticSelector
				open={showTherapeuticModal}
				onClose={() => setShowTherapeuticModal(false)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
	},
	horizontalServicesRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingTop: 16,
		paddingBottom: 0,
	},
	horizontalServicesRowTablet: {
		gap: 6,
	},
	hServiceCard: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		width: 64,
	},
	hServiceCardTablet: {
		flex: 1,
		width: 'auto',
		minWidth: 0,
	},
	hServiceTitle: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#333',
		textAlign: 'center',
		marginTop: 6,
		minHeight: 28,
		width: '100%',
	},
	hServiceTitleTablet: {
		fontSize: 11,
		lineHeight: 16,
		minHeight: 16,
		marginTop: 8,
	},
	othersIconContainer: {
		width: 30,
		height: 30,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		alignContent: 'space-between',
		padding: 2,
	},
	othersSquare: {
		width: 12,
		height: 12,
		borderRadius: 3,
	},
	overlay: {
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
	popupMenu: {
		backgroundColor: '#fff',
		borderRadius: 14,
		paddingVertical: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.14,
		shadowRadius: 10,
		elevation: 12,
	},
	popupRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'flex-start',
		justifyContent: 'center',
	},
	popupItem: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		minHeight: 76,
		flexShrink: 0,
	},
	popupIconCircle: {
		borderRadius: 10,
		backgroundColor: '#f5f7fb',
		justifyContent: 'center',
		alignItems: 'center',
	},
	popupText: {
		fontSize: 9,
		lineHeight: 12,
		fontWeight: '600',
		color: '#1e2a3a',
		textAlign: 'center',
		marginTop: 6,
		width: '100%',
		minHeight: 36,
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
})
