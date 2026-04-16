import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	ActivityIndicator,
	Dimensions,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../../config/theme"; // ← adjust to your actual import

const { width, height } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Timing constants (ms) – easy to tweak in one place
// ---------------------------------------------------------------------------
const LOGO_DURATION = 700;
const LOGO_DELAY = 100;
const TAGLINE_DELAY = 500;
const TAGLINE_DURATION = 500;

interface SplashScreenProps {
	onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
	// const theme = theme();
	const colors = theme.colors;

	// -- Animation refs -------------------------------------------------------
	const logoOpacity = useRef(new Animated.Value(0)).current;
	const logoScale = useRef(new Animated.Value(0.82)).current;
	const taglineOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.parallel([
			// Logo: fade + scale
			Animated.timing(logoOpacity, {
				toValue: 1,
				duration: LOGO_DURATION,
				delay: LOGO_DELAY,
				useNativeDriver: true,
			}),
			Animated.spring(logoScale, {
				toValue: 1,
				speed: 12,
				bounciness: 4,
				delay: LOGO_DELAY,
				useNativeDriver: true,
			}),
			// Tagline: fade in slightly later
			Animated.timing(taglineOpacity, {
				toValue: 1,
				duration: TAGLINE_DURATION,
				delay: TAGLINE_DELAY,
				useNativeDriver: true,
			}),
		]).start(() => {
			// Call onFinish after animations complete
			setTimeout(() => {
				onFinish();
			}, 500); // Small delay after animations
		});
	}, []);

	const gradientTop = colors.primary;
	const gradientBottom = colors.secondary;

	const styles = makeStyles(colors);

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: gradientTop }]}
			edges={["top", "bottom"]}
		>
			{/* ── Simulated gradient background ── */}
			<View
				style={[
					StyleSheet.absoluteFillObject,
					{ backgroundColor: gradientTop },
				]}
			/>
			<View
				style={[
					styles.gradientOverlay,
					{ backgroundColor: gradientBottom },
				]}
			/>

			{/* ── Subtle circle decorations (depth / atmosphere) ── */}
			<View style={[styles.decorCircle, styles.decorCircleLarge]} />
			<View style={[styles.decorCircle, styles.decorCircleSmall]} />

			{/* ── Main content ── */}
			<View style={styles.content}>
				{/* Logo card */}
				<Animated.View
					style={[
						styles.logoCard,
						{
							opacity: logoOpacity,
							transform: [{ scale: logoScale }],
						},
					]}
				>
					<View style={styles.logoPlaceholder}>
						{/* Example SVG-free cross icon built from two Views */}
						<View
							style={[
								styles.crossBar,
								styles.crossBarH,
								{ backgroundColor: colors.primary },
							]}
						/>
						<View
							style={[
								styles.crossBar,
								styles.crossBarV,
								{ backgroundColor: colors.primary },
							]}
						/>
					</View>
				</Animated.View>

				{/* App name */}
				<Animated.Text
					style={[styles.appName, { opacity: logoOpacity }]}
				>
					Karola Health
				</Animated.Text>

				{/* Tagline */}
				<Animated.Text
					style={[styles.tagline, { opacity: taglineOpacity }]}
				>
					Book Doctor Appointments
				</Animated.Text>
			</View>

			{/* ── Loading indicator ── */}
			<View style={styles.loaderContainer}>
				<ActivityIndicator
					size="small"
					color={colors.onPrimary ?? "#FFFFFF"}
					style={styles.loader}
				/>
				<Animated.Text
					style={[styles.loadingText, { opacity: taglineOpacity }]}
				>
					Loading…
				</Animated.Text>
			</View>
		</SafeAreaView>
	);
};

// ---------------------------------------------------------------------------
// Styles – everything driven by theme tokens passed in as closure args
// ---------------------------------------------------------------------------
const makeStyles = (colors: typeof theme.colors) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
		},

		// Gradient simulation (bottom half slightly lighter)
		gradientOverlay: {
			...StyleSheet.absoluteFillObject,
			top: height * 0.45,
			opacity: 0.55,
			borderTopLeftRadius: width,
			borderTopRightRadius: width,
		},

		// Atmospheric circle decorations
		decorCircle: {
			position: "absolute",
			borderRadius: 9999,
			opacity: 0.07,
			backgroundColor: colors.onPrimary ?? "#FFFFFF",
		},
		decorCircleLarge: {
			width: width * 1.2,
			height: width * 1.2,
			top: -width * 0.35,
			left: -width * 0.1,
		},
		decorCircleSmall: {
			width: width * 0.7,
			height: width * 0.7,
			bottom: -width * 0.2,
			right: -width * 0.15,
		},

		// Main flex zone
		content: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 32,
		},

		// Glass-effect logo card
		logoCard: {
			width: 112,
			height: 112,
			borderRadius: 32,
			backgroundColor: "rgba(255, 255, 255, 0.14)",
			borderWidth: 1,
			borderColor: "rgba(255, 255, 255, 0.25)",
			alignItems: "center",
			justifyContent: "center",
			marginBottom: 28,
			// Elevation / shadow
			...Platform.select({
				ios: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 12 },
					shadowOpacity: 0.22,
					shadowRadius: 20,
				},
				android: {
					elevation: 16,
				},
			}),
		},

		// Placeholder cross-icon (remove when you add a real logo)
		logoPlaceholder: {
			width: 52,
			height: 52,
			alignItems: "center",
			justifyContent: "center",
		},
		crossBar: {
			position: "absolute",
			borderRadius: 4,
			backgroundColor: "#FFFFFF",
		},
		crossBarH: {
			width: 44,
			height: 12,
		},
		crossBarV: {
			width: 12,
			height: 44,
		},

		// Typography
		appName: {
			fontSize: 34,
			fontWeight: "700",
			letterSpacing: 0.5,
			color: colors.onPrimary ?? "#FFFFFF",
			marginBottom: 8,
			textAlign: "center",
		},
		tagline: {
			fontSize: 15,
			fontWeight: "400",
			letterSpacing: 0.3,
			color: colors.onPrimary
				? `${colors.onPrimary}B3` // 70% opacity via hex alpha
				: "rgba(255,255,255,0.7)",
			textAlign: "center",
		},

		// Footer loader
		loaderContainer: {
			paddingBottom: 36,
			alignItems: "center",
			gap: 8,
		},
		loader: {
			marginBottom: 4,
		},
		loadingText: {
			fontSize: 12,
			letterSpacing: 0.6,
			color: colors.onPrimary
				? `${colors.onPrimary}80`
				: "rgba(255,255,255,0.5)",
		},
	});

export default SplashScreen;
