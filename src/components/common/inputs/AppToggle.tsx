import React from 'react'
import { Insets, Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import { AppTypography } from '../display/AppTypography'

type AppToggleSize = 'small' | 'medium'

interface AppToggleProps {
	value: boolean
	onValueChange: (value: boolean) => void
	label?: string
	enabledLabel?: string
	disabledLabel?: string
	showStatusText?: boolean
	disabled?: boolean
	size?: AppToggleSize
	style?: StyleProp<ViewStyle>
	switchStyle?: StyleProp<ViewStyle>
	labelStyle?: TextStyle | TextStyle[]
	statusStyle?: TextStyle | TextStyle[]
	activeColor?: string
	inactiveColor?: string
	thumbColor?: string
	accessibilityLabel?: string
	/** Extra touch area around the track (for the compact sizes). */
	hitSlop?: Insets | number
}

const SIZE_CONFIG = {
	small: {
		trackWidth: 48,
		trackHeight: 26,
		thumbSize: 20,
		padding: 3,
		gap: 8,
		statusFontSize: 12,
		statusLineHeight: 16,
	},
	medium: {
		trackWidth: 72,
		trackHeight: 38,
		thumbSize: 30,
		padding: 4,
		gap: 12,
		statusFontSize: 14,
		statusLineHeight: 20,
	},
}

export default function AppToggle({
	value,
	onValueChange,
	label,
	enabledLabel = 'Enabled',
	disabledLabel = 'Disabled',
	showStatusText = true,
	disabled = false,
	size = 'small',
	style,
	switchStyle,
	labelStyle,
	statusStyle,
	activeColor = '#2c7f82',
	inactiveColor = '#cbd5e1',
	thumbColor = '#ffffff',
	accessibilityLabel,
	hitSlop,
}: AppToggleProps) {
	const config = SIZE_CONFIG[size]
	const labelTextStyle: TextStyle | TextStyle[] = labelStyle
		? Array.isArray(labelStyle)
			? [styles.label, ...labelStyle]
			: [styles.label, labelStyle]
		: styles.label
	const statusBaseStyle: TextStyle = {
		fontSize: config.statusFontSize,
		lineHeight: config.statusLineHeight,
		color: value ? '#0b6570' : '#66757f',
	}
	const statusTextStyle: TextStyle | TextStyle[] = statusStyle
		? Array.isArray(statusStyle)
			? [styles.statusText, statusBaseStyle, ...statusStyle]
			: [styles.statusText, statusBaseStyle, statusStyle]
		: [styles.statusText, statusBaseStyle]

	const handlePress = () => {
		if (disabled) return
		onValueChange(!value)
	}

	return (
		<View style={[styles.container, { gap: config.gap }, disabled && styles.disabled, style]}>
			{label ? (
				<AppTypography variant="body" style={labelTextStyle}>
					{label}
				</AppTypography>
			) : null}

			<View style={[styles.controlRow, { gap: config.gap }]}>
				<Pressable
					style={[
						styles.switchTrack,
						{
							width: config.trackWidth,
							height: config.trackHeight,
							borderRadius: config.trackHeight / 2,
							padding: config.padding,
							backgroundColor: value ? activeColor : inactiveColor,
							alignItems: value ? 'flex-end' : 'flex-start',
						},
						switchStyle,
					]}
					onPress={handlePress}
					hitSlop={hitSlop}
					disabled={disabled}
					accessibilityRole="switch"
					accessibilityState={{ checked: value, disabled }}
					accessibilityLabel={accessibilityLabel || label}
				>
					<View
						style={[
							styles.thumb,
							{
								width: config.thumbSize,
								height: config.thumbSize,
								borderRadius: config.thumbSize / 2,
								backgroundColor: thumbColor,
							},
						]}
					/>
				</Pressable>

				{showStatusText ? (
					<AppTypography variant="body" style={statusTextStyle}>
						{value ? enabledLabel : disabledLabel}
					</AppTypography>
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'flex-start',
	},
	controlRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	label: {
		color: '#1f2b33',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500',
	},
	switchTrack: {
		justifyContent: 'center',
		flexShrink: 0,
	},
	thumb: {
		shadowColor: '#000000',
		shadowOpacity: 0.12,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
		elevation: 2,
	},
	statusText: {
		fontWeight: '700',
		flexShrink: 1,
	},
	disabled: {
		opacity: 0.6,
	},
})

export type { AppToggleProps }
