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
}: AppBottomSheetProps) {
	const { height } = useWindowDimensions()
	const closedOffset = height
	const maxSheetHeight = height * maxHeightRatio
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

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gestureState) =>
				gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
			onPanResponderMove: (_, gestureState) => {
				if (gestureState.dy <= 0) return
				sheetTranslateY.setValue(gestureState.dy)
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy > DISMISS_DRAG_DISTANCE || gestureState.vy > DISMISS_DRAG_VELOCITY) {
					requestClose()
					return
				}

				resetSheetPosition()
			},
			onPanResponderTerminate: resetSheetPosition,
		})
	).current

	useEffect(() => {
		if (visible) {
			setModalVisible(true)
			requestAnimationFrame(animateSheetOpen)
			return
		}

		if (modalVisible) closeSheet()
	}, [visible])

	return (
		<Modal visible={modalVisible} transparent animationType="fade" onRequestClose={requestClose}>
			<Pressable style={styles.sheetOverlay} onPress={requestClose}>
				<Animated.View
					style={[
						styles.sheet,
						{
							maxHeight: maxSheetHeight,
							transform: [{ translateY: sheetTranslateY }],
						},
					]}
					{...panResponder.panHandlers}
				>
					<Pressable style={styles.sheetBody} onPress={(event) => event.stopPropagation()}>
						<View style={styles.sheetHandleHitArea} {...panResponder.panHandlers}>
							<View style={styles.sheetHandle} />
						</View>
						<View style={styles.sheetHeader}>
							<AppTypography variant="h4" style={styles.sheetTitle}>
								{title}
							</AppTypography>
							<TouchableOpacity style={styles.sheetCloseButton} onPress={requestClose} activeOpacity={0.82}>
								<MaterialCommunityIcons name="close" size={22} color="#64707d" />
							</TouchableOpacity>
						</View>
						<ScrollView
							style={styles.sheetScroll}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.sheetContent}
						>
							{children}
						</ScrollView>
						{/* <View style={styles.sheetContent}>{children}</View> */}
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
		flexShrink: 1,
	},
	sheetContent: {
		flexGrow: 0,
	},
})
