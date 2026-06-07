import React from 'react'
import { StyleProp, TextStyle, useWindowDimensions } from 'react-native'
import { Text as PaperText, useTheme } from 'react-native-paper'

export type AppTypographyProps = Omit<React.ComponentProps<typeof PaperText>, 'variant'> & {
	variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'subtitle' | 'caption'
	style?: StyleProp<TextStyle>
	color?: string
	align?: 'auto' | 'left' | 'right' | 'center' | 'justify'
}

export const AppTypography = ({
	variant = 'body',
	style,
	color,
	align = 'left',
	children,
	...props
}: AppTypographyProps) => {
	const theme = useTheme()

	const { width } = useWindowDimensions()

	// Device checks
	const isTablet = width >= 768
	const isLargeTablet = width >= 1024

	// Dynamic font scaling
	const scaleFont = (mobile: number, tablet: number, largeTablet?: number) => {
		if (isLargeTablet && largeTablet) return largeTablet
		if (isTablet) return tablet
		return mobile
	}

	const getVariantStyle = (): TextStyle => {
		switch (variant) {
			case 'h1':
				return {
					fontSize: scaleFont(32, 42, 48),
					lineHeight: scaleFont(40, 52, 58),
					fontWeight: 'bold',
				}

			case 'h2':
				return {
					fontSize: scaleFont(24, 32, 38),
					lineHeight: scaleFont(32, 40, 46),
					fontWeight: 'bold',
				}

			case 'h3':
				return {
					fontSize: scaleFont(20, 28, 32),
					lineHeight: scaleFont(28, 36, 42),
					fontWeight: '600',
				}

			case 'h4':
				return {
					fontSize: scaleFont(18, 24, 28),
					lineHeight: scaleFont(24, 32, 36),
					fontWeight: '600',
				}

			case 'subtitle':
				return {
					fontSize: scaleFont(15, 18, 20),
					lineHeight: scaleFont(22, 28, 32),
					fontWeight: '500',
					color: '#666',
				}

			case 'caption':
				return {
					fontSize: scaleFont(12, 14, 16),
					lineHeight: scaleFont(16, 20, 24),
					color: '#666',
				}

			case 'body':
			default:
				return {
					fontSize: scaleFont(14, 18, 20),
					lineHeight: scaleFont(24, 28, 32),
				}
		}
	}

	return (
		<PaperText
			style={[
				getVariantStyle(),
				{
					color: color || theme.colors.onSurface,
					textAlign: align,
				},
				style,
			]}
			{...props}
		>
			{children}
		</PaperText>
	)
}

