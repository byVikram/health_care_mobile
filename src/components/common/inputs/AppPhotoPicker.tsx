import React, { useEffect, useRef, useState } from 'react'
import {
	Alert,
	Animated,
	Image,
	ImageSourcePropType,
	Modal,
	PanResponder,
	Pressable,
	StyleProp,
	StyleSheet,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { AppTypography } from '../display/AppTypography'

export type AppPhotoPickerUpload = {
	uri: string
	name: string
	type: string
}

export type AppPhotoPickerChange = {
	uri: string
	upload: AppPhotoPickerUpload | null
	removed: boolean
}

export type AppPhotoPickerProps = {
	imageUri?: string
	fallbackSource: ImageSourcePropType
	onChange: (change: AppPhotoPickerChange) => void
	style?: StyleProp<ViewStyle>
	accessibilityLabel?: string
	fileNamePrefix?: string
	showRemoveOption?: boolean
}

const preparePhotoUpload = (asset: ImagePicker.ImagePickerAsset, fileNamePrefix: string): AppPhotoPickerUpload => {
	const fileName = asset.fileName || asset.uri.split('/').pop() || `${fileNamePrefix}-${Date.now()}.jpg`
	const extension = fileName.split('.').pop()?.toLowerCase()
	const mimeType = asset.mimeType || (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg')

	return {
		uri: asset.uri,
		name: fileName,
		type: mimeType,
	}
}

const SHEET_CLOSED_OFFSET = 360
const DISMISS_DRAG_DISTANCE = 84
const DISMISS_DRAG_VELOCITY = 0.75

export function AppPhotoPicker({
	imageUri,
	fallbackSource,
	onChange,
	style,
	accessibilityLabel = 'Edit profile photo',
	fileNamePrefix = 'profile-photo',
	showRemoveOption = true,
}: AppPhotoPickerProps) {
	const [sheetVisible, setSheetVisible] = useState(false)
	const [imageLoadFailed, setImageLoadFailed] = useState(false)
	const sheetTranslateY = useRef(new Animated.Value(SHEET_CLOSED_OFFSET)).current

	useEffect(() => {
		setImageLoadFailed(false)
	}, [imageUri])

	const animateSheetOpen = () => {
		sheetTranslateY.setValue(SHEET_CLOSED_OFFSET)
		Animated.spring(sheetTranslateY, {
			toValue: 0,
			useNativeDriver: true,
			tension: 80,
			friction: 12,
		}).start()
	}

	const openSheet = () => {
		setSheetVisible(true)
		requestAnimationFrame(animateSheetOpen)
	}

	const closeSheet = () => {
		Animated.timing(sheetTranslateY, {
			toValue: SHEET_CLOSED_OFFSET,
			duration: 180,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (finished) setSheetVisible(false)
		})
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
					closeSheet()
					return
				}

				resetSheetPosition()
			},
			onPanResponderTerminate: resetSheetPosition,
		})
	).current

	const applySelectedPhoto = (asset: ImagePicker.ImagePickerAsset) => {
		onChange({
			uri: asset.uri,
			upload: preparePhotoUpload(asset, fileNamePrefix),
			removed: false,
		})
	}

	const takePhoto = async () => {
		closeSheet()
		const permission = await ImagePicker.requestCameraPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow camera access to take a profile photo.')
			return
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		})

		if (!result.canceled && result.assets.length > 0) {
			applySelectedPhoto(result.assets[0])
		}
	}

	const choosePhoto = async () => {
		closeSheet()
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission needed', 'Please allow photo library access to choose a profile photo.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (!result.canceled && result.assets.length > 0) {
			applySelectedPhoto(result.assets[0])
		}
	}

	const removePhoto = () => {
		closeSheet()
		onChange({
			uri: '',
			upload: null,
			removed: true,
		})
	}

	return (
		<View style={[styles.container, style]}>
			<View style={styles.photoWrapper}>
				<Image
					source={imageUri && !imageLoadFailed ? { uri: imageUri } : fallbackSource}
					onError={() => setImageLoadFailed(true)}
					style={styles.photo}
					resizeMode="cover"
				/>
				<TouchableOpacity
					style={styles.editButton}
					onPress={openSheet}
					activeOpacity={0.85}
					accessibilityRole="button"
					accessibilityLabel={accessibilityLabel}
				>
					<MaterialCommunityIcons name="camera-outline" size={15} color="#0c7c7c" />
				</TouchableOpacity>
			</View>

			<Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={closeSheet}>
				<Pressable style={styles.sheetOverlay} onPress={closeSheet}>
					<Animated.View
						style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
						{...panResponder.panHandlers}
					>
						<Pressable onPress={(event) => event.stopPropagation()}>
							<View style={styles.sheetHandleHitArea}>
								<View style={styles.sheetHandle} />
							</View>
							<TouchableOpacity style={styles.sheetOption} onPress={takePhoto} activeOpacity={0.85}>
								<MaterialCommunityIcons name="camera-outline" size={22} color="#0c7c7c" />
								<AppTypography variant="body" style={styles.sheetOptionText}>
									Take Photo
								</AppTypography>
							</TouchableOpacity>
							<TouchableOpacity style={styles.sheetOption} onPress={choosePhoto} activeOpacity={0.85}>
								<MaterialCommunityIcons name="image-outline" size={22} color="#0c7c7c" />
								<AppTypography variant="body" style={styles.sheetOptionText}>
									Choose from Library
								</AppTypography>
							</TouchableOpacity>
							{showRemoveOption ? (
								<TouchableOpacity style={styles.sheetOption} onPress={removePhoto} activeOpacity={0.85}>
									<MaterialCommunityIcons name="trash-can-outline" size={22} color="#d84545" />
									<AppTypography variant="body" style={[styles.sheetOptionText, styles.sheetDeleteText]}>
										Remove Current Picture
									</AppTypography>
								</TouchableOpacity>
							) : null}
						</Pressable>
					</Animated.View>
				</Pressable>
			</Modal>
		</View>
	)
}

export default AppPhotoPicker

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		marginBottom: 18,
	},
	photoWrapper: {
		width: 92,
		height: 92,
		borderRadius: 46,
		position: 'relative',
	},
	photo: {
		width: 92,
		height: 92,
		borderRadius: 46,
		backgroundColor: '#edf4f5',
	},
	editButton: {
		position: 'absolute',
		right: 2,
		bottom: 4,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#a7d3db',
		alignItems: 'center',
		justifyContent: 'center',
	},
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
	sheetOption: {
		minHeight: 54,
		paddingHorizontal: 22,
		flexDirection: 'row',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
	},
	sheetOptionText: {
		marginLeft: 14,
		color: '#2f2f2f',
		fontWeight: '500',
	},
	sheetDeleteText: {
		color: '#d84545',
	},
})
