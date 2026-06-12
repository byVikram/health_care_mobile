import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppButton } from './AppButton'

type StickyFooterProps = Pick<
	React.ComponentProps<typeof AppButton>,
	'onPress' | 'disabled' | 'loading' | 'children'
> & {
	footerStyle?: StyleProp<ViewStyle>
	contentStyle?: StyleProp<ViewStyle>
	buttonStyle?: React.ComponentProps<typeof AppButton>['style']
	horizontalPadding?: number
	contentMaxWidth?: number
	compact?: boolean
	centered?: boolean
	useDefaultButtonStyle?: boolean
}

export function StickyFooter({
	onPress,
	disabled,
	loading,
	children = 'Save',
	footerStyle,
	contentStyle,
	buttonStyle,
	horizontalPadding,
	contentMaxWidth,
	compact = false,
	centered = false,
	useDefaultButtonStyle = true,
}: StickyFooterProps) {
	const button = (
		<AppButton
			variant="primary"
			formAction
			style={[useDefaultButtonStyle && styles.saveButton, buttonStyle]}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
		>
			{children}
		</AppButton>
	)

	return (
		<View
			style={[
				styles.footer,
				compact && styles.compactFooter,
				centered && styles.centeredFooter,
				horizontalPadding !== undefined && { paddingHorizontal: horizontalPadding },
				footerStyle,
			]}
		>
			{contentStyle || contentMaxWidth !== undefined ? (
				<View style={[contentStyle, contentMaxWidth !== undefined && { maxWidth: contentMaxWidth }]}>
					{button}
				</View>
			) : (
				button
			)}
		</View>
	)
}

export function AppStickyFooter(props: StickyFooterProps) {
	return <StickyFooter {...props} />
}

const styles = StyleSheet.create({
	footer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#E5E5E5',
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
	},
	compactFooter: {
		paddingVertical: 4,
	},
	centeredFooter: {
		alignItems: 'center',
	},
})

export default AppStickyFooter
