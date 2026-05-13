import React from 'react'
import {
	Image,
	ImageSourcePropType,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { AppTypography } from '../../components/common'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import type { AppStackScreenProps } from '../../navigation/types'
import WelcomeDoctorPage from '../onboarding/WelcomeDoctorPage'

const welcomeDoctorImg = require('../../assets/Banner/welcome-doctor.png')

type PatientFeature = {
	icon: string
	title: string
	description: string
}

const patientConfig: {
	greeting: string
	subtitle: string
	buttonLabel: string
	image: ImageSourcePropType
	features: PatientFeature[]
} = {
	greeting: 'Welcome! 👋',
	subtitle: "Let's get your health journey started on Whisper ai.",
	buttonLabel: 'Set Up My Profile',
	image: welcomeDoctorImg,
	features: [
		{
			icon: 'https://cdn-icons-png.flaticon.com/128/9439/9439123.png',
			title: 'Profile',
			description: 'Complete your health profile so doctors can give you the best care',
		},
		{
			icon: 'https://cdn-icons-png.flaticon.com/128/3063/3063176.png',
			title: 'Book Appointments',
			description: 'Find and book appointments with top doctors near you instantly',
		},
		{
			icon: 'https://cdn-icons-png.flaticon.com/128/15756/15756013.png',
			title: 'Consult Online',
			description: 'Get a consultation from the comfort of your home, anytime',
		},
	],
}

export default function WelcomePage(props: AppStackScreenProps<typeof ROUTES.STACK.DOCTOR_WELCOME>) {
	const { navigation } = props
	const { role } = useAuth()
	const { width, height } = useWindowDimensions()

	if (role === 'doctor') {
		return <WelcomeDoctorPage {...props} />
	}

	const isSmallPhone = width < 380
	const isTablet = width >= 768
	const isLandscape = width > height
	const isCompactHeight = height < 620
	const useSplitLayout = isTablet && isLandscape
	const showIllustration = useSplitLayout

	const horizontalPadding = isTablet ? 48 : isSmallPhone ? 18 : 24
	const verticalPadding = isCompactHeight ? 20 : isTablet ? 48 : 28
	const contentMaxWidth = useSplitLayout ? 1180 : isTablet ? 680 : 520
	const copyMaxWidth = useSplitLayout ? 560 : '100%'
	const logoSize = isTablet ? 60 : isSmallPhone ? 42 : 48
	const iconSize = isSmallPhone ? 40 : 48
	const titleSize = isTablet ? 40 : isSmallPhone ? 28 : 34
	const subtitleSize = isTablet ? 18 : 15
	const bodySize = isTablet ? 16 : 14
	const illustrationWidth = width >= 1180 ? 540 : 420
	const illustrationHeight = width >= 1180 ? 380 : 300

	const handleSetupProfile = () => {
		navigation.reset({
			index: 0,
			routes: [
				{
					name: ROUTES.MAIN.TABS,
					params: { screen: ROUTES.PORTAL.PROFILE },
				},
			],
		})
	}

	return (
		<SafeAreaView style={styles.safe}>
			<StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingHorizontal: horizontalPadding,
						paddingVertical: verticalPadding,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<View
					style={[
						styles.contentContainer,
						{ maxWidth: contentMaxWidth },
						useSplitLayout && styles.contentContainerSplit,
					]}
				>
					<View
						style={[
							styles.leftSection,
							{ maxWidth: copyMaxWidth },
							!useSplitLayout && styles.centerContent,
						]}
					>
						<View
							style={[
								styles.logoRow,
								!useSplitLayout && styles.centerLogoRow,
								{ marginBottom: isCompactHeight ? 22 : isTablet ? 44 : 32 },
							]}
						>
							<Image
								source={require('../../assets/Banner/logo.png')}
								style={[styles.logoImage, { width: logoSize, height: logoSize }]}
								resizeMode="contain"
							/>
							<View>
								<AppTypography variant="h3" style={[styles.logoText, { fontSize: isTablet ? 32 : 25 }]}>
									Whisper ai.
								</AppTypography>
								<AppTypography variant="caption" style={[styles.logoSubText, { fontSize: isTablet ? 15 : 12 }]}>
									Smart Care. Simple Access
								</AppTypography>
							</View>
						</View>

						<AppTypography
							variant="h1"
							style={[
								styles.title,
								{ fontSize: titleSize, lineHeight: titleSize + 8, marginBottom: isCompactHeight ? 8 : 14 },
								!useSplitLayout && styles.centerText,
							]}
						>
							{patientConfig.greeting}
						</AppTypography>

						<AppTypography
							variant="body"
							style={[
								styles.subtitle,
								{
									fontSize: subtitleSize,
									lineHeight: isTablet ? 28 : 22,
									marginBottom: isCompactHeight ? 24 : 36,
								},
								!useSplitLayout && styles.centerText,
							]}
						>
							{patientConfig.subtitle}
						</AppTypography>

						<View style={[styles.section, { gap: isCompactHeight ? 18 : 28 }]}>
							{patientConfig.features.map((feature) => (
								<View key={feature.title} style={styles.row}>
									<View style={[styles.iconWrapper, { width: iconSize + 12, height: iconSize + 12, borderRadius: (iconSize + 12) / 2 }]}>
										<Image source={{ uri: feature.icon }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
									</View>
									<AppTypography
										variant="body"
										style={[styles.text, { fontSize: bodySize, lineHeight: isTablet ? 26 : 22 }]}
									>
										<AppTypography
											variant="body"
											style={[styles.bold, { fontSize: bodySize, lineHeight: isTablet ? 26 : 22 }]}
										>
											{feature.title} -{' '}
										</AppTypography>
										{feature.description}
									</AppTypography>
								</View>
							))}
						</View>

						<TouchableOpacity
							style={[
								styles.button,
								{
									marginTop: isCompactHeight ? 28 : 42,
									maxWidth: useSplitLayout ? 360 : 420,
									alignSelf: useSplitLayout ? 'flex-start' : 'center',
									paddingVertical: isTablet ? 18 : 16,
								},
							]}
							activeOpacity={0.85}
							onPress={handleSetupProfile}
						>
							<AppTypography variant="body" style={styles.buttonText}>
								{patientConfig.buttonLabel}
							</AppTypography>
						</TouchableOpacity>
					</View>

					{showIllustration ? (
						<View style={[styles.imageSection, !useSplitLayout && styles.imageSectionStacked]}>
							<Image
								source={patientConfig.image}
								style={{ width: illustrationWidth, height: illustrationHeight }}
								resizeMode="contain"
							/>
						</View>
					) : null}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	contentContainer: {
		flexGrow: 1,
		width: '100%',
		alignSelf: 'center',
		justifyContent: 'center',
	},
	contentContainerSplit: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 56,
	},
	leftSection: {
		width: '100%',
		alignSelf: 'center',
	},
	centerContent: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	centerLogoRow: {
		justifyContent: 'center',
	},
	centerText: {
		textAlign: 'center',
	},
	logoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	logoImage: {
		flexShrink: 0,
	},
	logoText: {
		fontWeight: '400',
		color: '#00897f',
	},
	logoSubText: {
		color: '#00897f',
		marginTop: 2,
	},
	title: {
		fontWeight: '800',
		color: '#1f2f3f',
	},
	subtitle: {
		color: '#3f4854',
		maxWidth: 620,
	},
	section: {
		width: '100%',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 16,
	},
	iconWrapper: {
		backgroundColor: '#e6f8f6',
		justifyContent: 'center',
		alignItems: 'center',
		flexShrink: 0,
	},
	text: {
		flex: 1,
		color: '#111827',
		paddingTop: 4,
	},
	bold: {
		fontWeight: '700',
		color: '#111827',
	},
	button: {
		width: '100%',
		backgroundColor: '#2d7c7a',
		borderRadius: 12,
		elevation: 4,
		shadowColor: '#000000',
		shadowOpacity: 0.12,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	buttonText: {
		textAlign: 'center',
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 18,
		lineHeight: 24,
	},
	imageSection: {
		flex: 1,
		minWidth: 320,
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageSectionStacked: {
		marginTop: 32,
		minWidth: 0,
	},
})
