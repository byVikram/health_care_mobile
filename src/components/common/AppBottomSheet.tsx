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
const SCROLL_TOP_THRESHOLD = 2

export function AppBottomSheet({
	visible,
	title,
	onClose,
	children,
	maxHeightRatio = MAX_HEIGHT_RATIO,
	scrollEnabled = true,
	footer,
}: AppBottomSheetProps) {
	const { height } = useWindowDimensions()
	const closedOffset = height
	const maxSheetHeight = height * maxHeightRatio

	const [modalVisible, setModalVisible] = useState(visible)

	const sheetTranslateY = useRef(new Animated.Value(closedOffset)).current

	// Keep this in a ref rather than state so the PanResponder always
	// has access to the latest scroll position without being recreated.
	const scrollOffsetY = useRef(0)

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
	 * Sheet drag responder.
	 *
	 * IMPORTANT:
	 * We only take control of the gesture when the ScrollView is already
	 * at the top and the user is dragging downward.
	 *
	 * This means:
	 * - Scrolling up/down normally remains owned by ScrollView.
	 * - Pulling down from the top moves the entire sheet.
	 * - Releasing after enough distance/velocity closes the sheet.
	 */
	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponderCapture: (_, gestureState) => {
				const isAtTop = scrollOffsetY.current <= SCROLL_TOP_THRESHOLD
				const isDraggingDown = gestureState.dy > 6
				const isMostlyVertical =
					Math.abs(gestureState.dy) > Math.abs(gestureState.dx)

				return isAtTop && isDraggingDown && isMostlyVertical
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
			<Pressable
				style={styles.sheetOverlay}
				onPress={requestClose}
			>
				<Animated.View
					style={[
						styles.sheet,
						{
							maxHeight: maxSheetHeight,
							transform: [{ translateY: sheetTranslateY }],
						},
					]}
				>
					<Pressable
	style={styles.sheetBody}
	onPress={(event) => event.stopPropagation()}
	{...panResponder.panHandlers}
>
						<View style={styles.sheetHandleHitArea}>
							<View style={styles.sheetHandle} />
						</View>

						<View style={styles.sheetHeader}>
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

						{scrollEnabled ? (
							<ScrollView
	style={styles.sheetScroll}
	showsVerticalScrollIndicator={false}
	bounces={false}
	scrollEventThrottle={16}
	onScroll={(event) => {
		scrollOffsetY.current =
			event.nativeEvent.contentOffset.y
	}}
	contentContainerStyle={[
		styles.sheetContent,
		{ paddingHorizontal: 22 },
	]}
>
	{children}
</ScrollView>
						) : (
							<View
								style={[styles.sheetScroll, styles.sheetContent]}
								{...panResponder.panHandlers}
							>
								{children}
							</View>
						)}

						{footer && (
							<View style={styles.sheetFooterContainer}>
								{footer}
							</View>
						)}
					</Pressable>
				</Animated.View>
			</Pressable>
		</Modal>
	)
}

export default AppBottomSheet

const styles = StyleSheet.create({
	sheetOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'flex-end',
	},

	sheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		paddingTop: 10,
		paddingBottom: 20,
		overflow: 'hidden',
	},

	sheetBody: {
		maxHeight: '100%',
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
		marginBottom: 8,
	},

	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 22,
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
		flexGrow: 1,
		flexShrink: 1,
	},

	sheetContent: {
		flexGrow: 0,
		paddingHorizontal: 30,
		paddingBottom: 16,
	},

	sheetFooterContainer: {
		paddingHorizontal: 22,
		paddingTop: 12,
		paddingBottom: 4,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		backgroundColor: '#ffffff',
	},
})
