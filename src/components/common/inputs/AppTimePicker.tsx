import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	FlatList,
	Modal,
	NativeScrollEvent,
	NativeSyntheticEvent,
	Pressable,
	StyleProp,
	StyleSheet,
	View,
	ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { AppTypography } from '../display/AppTypography'

export interface AppTimePickerProps {
	value?: string
	onChange: (value: string) => void
	label?: string
	placeholder?: string
	disabled?: boolean
	error?: string
	errorText?: string
	required?: boolean
	style?: StyleProp<ViewStyle>
	noMargin?: boolean
}

type Period = 'AM' | 'PM'

type TimeParts = {
	hour: string
	minute: string
	period: Period
}

type WheelColumnProps = {
	options: string[]
	selectedValue: string
	onSelect: (value: string) => void
	accessibilityLabel: string
	syncKey: number
}

type WheelItem = {
	key: string
	value: string
	spacer?: boolean
}

const ITEM_HEIGHT = 54
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS
const WHEEL_SPACER_COUNT = Math.floor(VISIBLE_ITEMS / 2)
const WHEEL_PADDING = ITEM_HEIGHT * WHEEL_SPACER_COUNT

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
const PERIODS: Period[] = ['AM', 'PM']

const clampIndex = (index: number, max: number) => Math.max(0, Math.min(index, max))

const parseTimeValue = (value?: string): TimeParts => {
	const normalizedValue = (value || '').trim().toUpperCase()

	if (!normalizedValue) {
		return {
			hour: '09',
			minute: '00',
			period: 'AM',
		}
	}

	const periodMatch = normalizedValue.match(/\b(AM|PM)\b/)
	const [rawHours = '9', rawMinutes = '0'] = normalizedValue.replace(/\b(AM|PM)\b/, '').split(':')
	const parsedHours = Number(rawHours) || 0
	const minutes = clampIndex(Number(rawMinutes) || 0, 59)
	const period: Period = periodMatch?.[1] === 'AM' || periodMatch?.[1] === 'PM'
		? periodMatch[1]
		: parsedHours >= 12
			? 'PM'
			: 'AM'
	const hour12 = periodMatch ? clampIndex(parsedHours || 12, 12) || 12 : parsedHours % 12 || 12

	return {
		hour: String(hour12).padStart(2, '0'),
		minute: String(minutes).padStart(2, '0'),
		period,
	}
}

const formatTimeForValue = ({ hour, minute, period }: TimeParts) => {
	const hourNumber = Number(hour)
	const hours24 = period === 'AM' ? hourNumber % 12 : (hourNumber % 12) + 12
	const hours = String(hours24).padStart(2, '0')

	return `${hours}:${minute}`
}

const formatTimeForDisplay = (value?: string) => {
	if (!value) return ''

	const { hour, minute, period } = parseTimeValue(value)
	return `${hour} : ${minute} ${period}`
}

function WheelColumn({ options, selectedValue, onSelect, accessibilityLabel, syncKey }: WheelColumnProps) {
	const listRef = useRef<FlatList<WheelItem>>(null)
	const wheelData = useMemo<WheelItem[]>(
		() => [
			...Array.from({ length: WHEEL_SPACER_COUNT }, (_, index) => ({
				key: `top-spacer-${index}`,
				value: '',
				spacer: true,
			})),
			...options.map((option) => ({ key: option, value: option })),
			...Array.from({ length: WHEEL_SPACER_COUNT }, (_, index) => ({
				key: `bottom-spacer-${index}`,
				value: '',
				spacer: true,
			})),
		],
		[options]
	)
	const selectedIndex = Math.max(0, options.indexOf(selectedValue))
	const selectedIndexRef = useRef(selectedIndex)
	const committedIndexRef = useRef(selectedIndex)
	const lastOffsetRef = useRef(selectedIndex * ITEM_HEIGHT)
	const momentumActiveRef = useRef(false)
	const noMomentumSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const [centeredIndex, setCenteredIndex] = useState(selectedIndex)

	selectedIndexRef.current = selectedIndex

	useEffect(() => {
		const syncIndex = selectedIndexRef.current

		committedIndexRef.current = syncIndex
		lastOffsetRef.current = syncIndex * ITEM_HEIGHT
		setCenteredIndex(syncIndex)

		const frame = requestAnimationFrame(() => {
			listRef.current?.scrollToOffset({ offset: syncIndex * ITEM_HEIGHT, animated: false })
		})

		return () => {
			cancelAnimationFrame(frame)
			if (noMomentumSettleTimeoutRef.current) clearTimeout(noMomentumSettleTimeoutRef.current)
		}
	}, [syncKey])

	const getIndexFromOffset = (offsetY: number) => clampIndex(Math.round(offsetY / ITEM_HEIGHT), options.length - 1)

	const getRowOpacity = (index: number) => {
		const distance = Math.abs(index - centeredIndex)

		if (distance === 0) return 1
		if (distance === 1) return 0.58
		if (distance === 2) return 0.34
		return 0.2
	}

	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		lastOffsetRef.current = event.nativeEvent.contentOffset.y
	}

	const commitCenteredValue = (offsetY: number) => {
		const nextIndex = getIndexFromOffset(offsetY)
		const nextValue = options[nextIndex]

		lastOffsetRef.current = offsetY
		setCenteredIndex(nextIndex)
		if (committedIndexRef.current !== nextIndex) {
			committedIndexRef.current = nextIndex
			onSelect(nextValue)
		}
	}

	const settleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (noMomentumSettleTimeoutRef.current) clearTimeout(noMomentumSettleTimeoutRef.current)
		momentumActiveRef.current = false
		commitCenteredValue(event.nativeEvent.contentOffset.y)
	}

	const settleDragWithoutMomentum = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const velocityY = event.nativeEvent.velocity?.y ?? 0
		const shouldWaitForMomentum = momentumActiveRef.current || Math.abs(velocityY) > 0.01

		if (shouldWaitForMomentum) return
		if (noMomentumSettleTimeoutRef.current) clearTimeout(noMomentumSettleTimeoutRef.current)

		lastOffsetRef.current = event.nativeEvent.contentOffset.y
		noMomentumSettleTimeoutRef.current = setTimeout(() => {
			commitCenteredValue(lastOffsetRef.current)
		}, 80)
	}

	return (
		<View style={styles.wheelColumn}>
			<FlatList
				ref={listRef}
				data={wheelData}
				keyExtractor={(item) => item.key}
				renderItem={({ item, index }) => {
					if (item.spacer) return <View style={styles.wheelItem} />

					const optionIndex = index - WHEEL_SPACER_COUNT
					const selected = optionIndex === centeredIndex

					return (
						<View style={styles.wheelItem}>
							<AppTypography
								variant="body"
								style={[
									styles.wheelItemText,
									{ opacity: getRowOpacity(optionIndex) },
									selected && styles.wheelItemTextSelected,
								]}
							>
								{item.value}
							</AppTypography>
						</View>
					)
				}}
				style={styles.wheelList}
				showsVerticalScrollIndicator={false}
				snapToInterval={ITEM_HEIGHT}
				snapToAlignment="center"
				decelerationRate="normal"
				bounces={false}
				scrollEnabled
				nestedScrollEnabled
				scrollEventThrottle={16}
				onScroll={handleScroll}
				onMomentumScrollBegin={() => {
					if (noMomentumSettleTimeoutRef.current) clearTimeout(noMomentumSettleTimeoutRef.current)
					momentumActiveRef.current = true
				}}
				onMomentumScrollEnd={settleScroll}
				onScrollEndDrag={settleDragWithoutMomentum}
				getItemLayout={(_, index) => ({
					length: ITEM_HEIGHT,
					offset: ITEM_HEIGHT * index,
					index,
				})}
				initialScrollIndex={selectedIndex}
				initialNumToRender={wheelData.length}
				maxToRenderPerBatch={wheelData.length}
				windowSize={5}
				onScrollToIndexFailed={({ index, averageItemLength }) => {
					requestAnimationFrame(() => {
						listRef.current?.scrollToOffset({
							offset: Math.max(0, index * averageItemLength),
							animated: false,
						})
					})
				}}
				accessibilityLabel={accessibilityLabel}
			/>
		</View>
	)
}

export const AppTimePicker = ({
	value,
	onChange,
	label,
	placeholder = 'Select time',
	disabled = false,
	error,
	errorText,
	required = false,
	style,
	noMargin = false,
}: AppTimePickerProps) => {
	const theme = useTheme()
	const [pickerVisible, setPickerVisible] = useState(false)
	const [draftTime, setDraftTime] = useState<TimeParts>(() => parseTimeValue(value))
	const [wheelSyncKey, setWheelSyncKey] = useState(0)
	const previousValueRef = useRef(value)
	const validationText = errorText ?? error
	const displayValue = useMemo(() => formatTimeForDisplay(value), [value])

	useEffect(() => {
		if (previousValueRef.current === value) return

		previousValueRef.current = value
		if (!pickerVisible) return

		setDraftTime(parseTimeValue(value))
		setWheelSyncKey((currentKey) => currentKey + 1)
	}, [pickerVisible, value])

	const openPicker = () => {
		if (disabled) return
		setDraftTime(parseTimeValue(value))
		setWheelSyncKey((currentKey) => currentKey + 1)
		setPickerVisible(true)
	}

	const closePicker = () => setPickerVisible(false)

	const updateDraftTime = (part: keyof TimeParts, nextValue: string) => {
		setDraftTime((current) => ({ ...current, [part]: nextValue }))
	}

	const confirmValue = () => {
		onChange(formatTimeForValue(draftTime))
		closePicker()
	}

	return (
		<View style={[styles.container, noMargin && styles.containerNoMargin, style]}>
			{label ? (
				<AppTypography variant="caption" style={styles.label}>
					{label}
					{required ? (
						<AppTypography variant="caption" style={styles.requiredMark}>
							*
						</AppTypography>
					) : null}
				</AppTypography>
			) : null}

			<Pressable
				style={[
					styles.input,
					validationText && { borderColor: theme.colors.error },
					disabled && styles.inputDisabled,
				]}
				onPress={openPicker}
				accessibilityRole="button"
				accessibilityLabel={label || placeholder}
				disabled={disabled}
			>
				<AppTypography
					variant="body"
					style={[styles.inputText, !displayValue && styles.placeholderText, disabled && styles.disabledText]}
					numberOfLines={1}
				>
					{displayValue || placeholder}
				</AppTypography>
				<MaterialCommunityIcons name="clock-time-four-outline" size={18} color={disabled ? '#a7b2b8' : '#61727b'} />
			</Pressable>

			{validationText ? (
				<AppTypography variant="caption" style={[styles.errorText, { color: theme.colors.error }]}>
					{validationText}
				</AppTypography>
			) : null}

			<Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={closePicker}>
				<Pressable style={styles.modalOverlay} onPress={closePicker}>
					<Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
						<View style={styles.pickerHeader}>
							<Pressable onPress={closePicker} hitSlop={8}>
								<AppTypography variant="body" style={styles.pickerActionText}>
									Cancel
								</AppTypography>
							</Pressable>
							<AppTypography variant="body" style={styles.pickerTitle}>
								{draftTime.hour} : {draftTime.minute} {draftTime.period}
							</AppTypography>
							<Pressable onPress={confirmValue} hitSlop={8}>
								<AppTypography variant="body" style={[styles.pickerActionText, styles.pickerDoneText]}>
									Done
								</AppTypography>
							</Pressable>
						</View>
						<View style={styles.wheelPicker}>
							<View pointerEvents="none" style={styles.selectionFrame} />
							<WheelColumn
								options={HOURS}
								selectedValue={draftTime.hour}
								onSelect={(nextValue) => updateDraftTime('hour', nextValue)}
								accessibilityLabel="Hour"
								syncKey={wheelSyncKey}
							/>
							<AppTypography variant="body" style={styles.timeSeparator}>
								:
							</AppTypography>
							<WheelColumn
								options={MINUTES}
								selectedValue={draftTime.minute}
								onSelect={(nextValue) => updateDraftTime('minute', nextValue)}
								accessibilityLabel="Minute"
								syncKey={wheelSyncKey}
							/>
							<WheelColumn
								options={PERIODS}
								selectedValue={draftTime.period}
								onSelect={(nextValue) => updateDraftTime('period', nextValue as Period)}
								accessibilityLabel="AM or PM"
								syncKey={wheelSyncKey}
							/>
							<View pointerEvents="none" style={styles.topFade}>
								<View style={styles.fadeStrong} />
								<View style={styles.fadeSoft} />
							</View>
							<View pointerEvents="none" style={styles.bottomFade}>
								<View style={styles.fadeSoft} />
								<View style={styles.fadeStrong} />
							</View>
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	)
}

export default AppTimePicker

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		width: '100%',
	},
	containerNoMargin: {
		marginBottom: 0,
	},
	label: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#ef5d5d',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	input: {
		height: 48,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	inputDisabled: {
		backgroundColor: '#f3f6f7',
		borderColor: '#d6e0e3',
	},
	inputText: {
		flex: 1,
		color: '#2f2f2f',
		fontSize: 14,
		lineHeight: 20,
		marginRight: 8,
	},
	placeholderText: {
		color: '#9a9a9a',
	},
	disabledText: {
		color: '#98a5aa',
	},
	errorText: {
		marginTop: 4,
		marginLeft: 4,
		fontSize: 12,
		lineHeight: 16,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'flex-end',
	},
	pickerSheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		paddingBottom: 20,
	},
	pickerHeader: {
		minHeight: 48,
		paddingHorizontal: 18,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#e4ecef',
	},
	pickerActionText: {
		color: '#61727b',
		fontSize: 14,
		fontWeight: '600',
	},
	pickerTitle: {
		color: '#253136',
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
	},
	pickerDoneText: {
		color: '#0c7c7c',
	},
	wheelPicker: {
		height: WHEEL_HEIGHT,
		marginHorizontal: 18,
		marginTop: 12,
		borderWidth: 1,
		borderColor: '#dce6ea',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	selectionFrame: {
		position: 'absolute',
		left: 12,
		right: 12,
		top: WHEEL_PADDING,
		height: ITEM_HEIGHT,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: '#cfe0e8',
		backgroundColor: '#f4f9fb',
		zIndex: 1,
	},
	wheelColumn: {
		width: 72,
		height: WHEEL_HEIGHT,
	},
	wheelList: {
		height: WHEEL_HEIGHT,
		zIndex: 2,
	},
	topFade: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: WHEEL_PADDING,
		zIndex: 3,
	},
	bottomFade: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: WHEEL_PADDING,
		zIndex: 3,
	},
	fadeStrong: {
		flex: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.86)',
	},
	fadeSoft: {
		flex: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.46)',
	},
	wheelItem: {
		height: ITEM_HEIGHT,
		alignItems: 'center',
		justifyContent: 'center',
	},
	wheelItemText: {
		color: '#253136',
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '500',
	},
	wheelItemTextSelected: {
		color: '#1f2b33',
		fontWeight: '800',
	},
	timeSeparator: {
		width: 16,
		color: '#253136',
		textAlign: 'center',
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '700',
		zIndex: 1,
	},
})
