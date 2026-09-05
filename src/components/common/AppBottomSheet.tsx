import React, { useEffect, useRef, useState } from 'react'
import {
	Animated,
	Modal,
	PanResponder,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from './AppTypography'

export type AppBottomSheetProps = {
	visible: boolean
	title: string
	onClose: () => void
	children: React.ReactNode
	maxHeightRatio?: number
	/**
	 * When false the sheet's own ScrollView is replaced with a plain View,
	 * allowing the child to own all scrolling behaviour independently.
	 * Defaults to true.
	 */
	scrollEnabled?: boolean
	footer?: React.ReactNode
}

const DISMISS_DRAG_DISTANCE = 84
const DISMISS_DRAG_VELOCITY = 0.75
const MAX_HEIGHT_RATIO = 0.8

export function AppBottomSheet({
	visible,
	title,
	onClose,
	children,
	maxHeightRatio = MAX_HEIGHT_RATIO,
	scrollEnabled = true,
	footer,
}: AppBottomSheetProps) {
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const closedOffset = height
	const maxSheetHeight = height * maxHeightRatio

	const headerAndHandleHeight = 74
	const footerHeight = footer ? 64 : 0
	const maxScrollHeight = Math.max(
		120,
		maxSheetHeight - headerAndHandleHeight - footerHeight - insets.bottom,
	)

	const [modalVisible, setModalVisible] = useState(visible)

	const sheetTranslateY = useRef(new Animated.Value(closedOffset)).current

	const animateSheetOpen = () => {
		sheetTranslateY.setValue(closedOffset)

		Animated.spring(sheetTranslateY, {
			toValue: 0,
			useNativeDriver: true,
			tension: 80,
			friction: 12,
		}).start()
	}

	const closeSheet = (onFinished?: () => void) => {
		Animated.timing(sheetTranslateY, {
			toValue: closedOffset,
			duration: 180,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (!finished) return

			setModalVisible(false)
			onFinished?.()
		})
	}

	const requestClose = () => {
		closeSheet(onClose)
	}

	const resetSheetPosition = () => {
		Animated.spring(sheetTranslateY, {
			toValue: 0,
			useNativeDriver: true,
			tension: 90,
			friction: 13,
		}).start()
	}

	/**
	 * Dedicated handle & header PanResponder:
	 * Responds ONLY to downward dragging gestures on the handle bar or header area.
	 */
	const handlePanResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, gestureState) => {
				return Math.abs(gestureState.dy) > 4 && gestureState.dy > 0
			},

			onPanResponderGrant: () => {
				sheetTranslateY.stopAnimation()
			},

			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy > 0) {
					sheetTranslateY.setValue(gestureState.dy)
				}
			},

			onPanResponderRelease: (_, gestureState) => {
				const shouldDismiss =
					gestureState.dy > DISMISS_DRAG_DISTANCE ||
					gestureState.vy > DISMISS_DRAG_VELOCITY

				if (shouldDismiss) {
					requestClose()
				} else {
					resetSheetPosition()
				}
			},

			onPanResponderTerminate: resetSheetPosition,
		}),
	).current

	useEffect(() => {
		if (visible) {
			setModalVisible(true)

			requestAnimationFrame(animateSheetOpen)

			return
		}

		if (modalVisible) {
			closeSheet()
		}
	}, [visible])

	return (
		<Modal
			visible={modalVisible}
			transparent
			animationType="fade"
			onRequestClose={requestClose}
		>
			<View
				style={[
					styles.sheetOverlay,
					isTablet && styles.sheetOverlayTablet,
				]}
			>
				{/* Backdrop pressable behind the sheet card */}
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={requestClose}
				/>

				<Animated.View
					style={[
						styles.sheet,
						isTablet && styles.sheetTablet,
						{
							maxHeight: maxSheetHeight,
							transform: [{ translateY: sheetTranslateY }],
						},
					]}
				>
					<View style={[styles.sheetBody, { maxHeight: maxSheetHeight }]}>
						{/* Drag Handle Area */}
						<View
							style={styles.sheetHandleHitArea}
							{...handlePanResponder.panHandlers}
						>
							<View style={styles.sheetHandle} />
						</View>

						{/* Header Area */}
						<View
							style={styles.sheetHeader}
							{...handlePanResponder.panHandlers}
						>
							<AppTypography
								variant="h4"
								style={styles.sheetTitle}
							>
								{title}
							</AppTypography>

							<TouchableOpacity
								style={styles.sheetCloseButton}
								onPress={requestClose}
								activeOpacity={0.82}
							>
								<MaterialCommunityIcons
									name="close"
									size={22}
									color="#64707d"
								/>
							</TouchableOpacity>
						</View>

						{/* Scrollable Content or Custom View */}
						{scrollEnabled ? (
							<ScrollView
								style={[styles.sheetScroll, { maxHeight: maxScrollHeight }]}
								showsVerticalScrollIndicator={false}
								keyboardShouldPersistTaps="handled"
								scrollEventThrottle={16}
								bounces={true}
								overScrollMode="always"
								contentContainerStyle={[
									styles.sheetContent,
									{
										paddingBottom: footer
											? 16
											: Math.max(insets.bottom + 16, 24),
									},
								]}
							>
								{children}
							</ScrollView>
						) : (
							<View
								style={[
									styles.sheetScroll,
									styles.sheetContent,
									{
										maxHeight: maxScrollHeight,
										paddingBottom: footer
											? 16
											: Math.max(insets.bottom + 16, 24),
									},
								]}
							>
								{children}
							</View>
						)}

						{/* Footer Area */}
						{footer && (
							<View
								style={[
									styles.sheetFooterContainer,
									{ paddingBottom: Math.max(insets.bottom, 12) },
								]}
							>
								{footer}
							</View>
						)}
					</View>
				</Animated.View>
			</View>
		</Modal>
	)
}

export default AppBottomSheet

const styles = StyleSheet.create({
	sheetOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.38)',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},

	sheetOverlayTablet: {
		paddingHorizontal: 24,
		paddingBottom: 24,
	},

	sheet: {
		width: '100%',
		maxWidth: 540,
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.12,
		shadowRadius: 16,
		elevation: 10,
		zIndex: 10,
		flexShrink: 1,
	},

	sheetTablet: {
		borderRadius: 22,
		maxWidth: 540,
	},

	sheetBody: {
		width: '100%',
		flexShrink: 1,
	},

	sheetHandle: {
		width: 42,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#d5e4e6',
		alignSelf: 'center',
	},

	sheetHandleHitArea: {
		paddingTop: 10,
		paddingBottom: 8,
		marginBottom: 4,
	},

	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#eef4f5',
	},

	sheetTitle: {
		flex: 1,
		minWidth: 0,
		color: '#172838',
		fontWeight: '700',
	},

	sheetCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 12,
	},

	sheetScroll: {
		flexShrink: 1,
	},

	sheetContent: {
		paddingTop: 12,
		paddingHorizontal: 16,
	},

	sheetFooterContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 12,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		backgroundColor: '#ffffff',
	},
})
