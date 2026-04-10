import React from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Image,
	TouchableOpacity,
	useWindowDimensions,
} from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

interface ConsultCardProps {
	image: any;
	title: string;
	description: string;
	onConsult?: () => void;
}

function ConsultCard({
	image,
	title,
	description,
	onConsult,
}: ConsultCardProps) {
	const theme = useTheme();

	return (
		<TouchableOpacity
			style={styles.cardContainer}
			onPress={onConsult}
			activeOpacity={0.8}
		>
			<Image source={image} style={styles.cardImage} resizeMode="cover" />
			<View style={styles.cardBody}>
				<Text variant="titleSmall" style={styles.cardTitle}>
					{title}
				</Text>
				<Text
					variant="bodySmall"
					numberOfLines={2}
					style={styles.cardDesc}
				>
					{description}
				</Text>
			</View>
		</TouchableOpacity>
	);
}

const consults = [
	{
		id: 1,
		title: "Dentist",
		description: "Teething troubles? Schedule a dental checkup",
		image: require("../../assets/specialties/dentist.png"),
	},
	{
		id: 2,
		title: "Gynecologist",
		description:
			"Explore for women's health, pregnancy & infertility treatments",
		image: require("../../assets/specialties/gynocologist.png"),
	},
	{
		id: 3,
		title: "Dietitian/Nutrition",
		description:
			"Get guidance on eating right, weight management & sports nutrition",
		image: require("../../assets/specialties/nutrition.png"),
	},
	{
		id: 4,
		title: "Physiotherapist",
		description:
			"Pulled a muscle? Get it treated by a trained physiotherapist",
		image: require("../../assets/specialties/physiotherapist.png"),
	},
];

export default function ConsultSection() {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const navigation = useNavigation<any>();
	const isTablet = width >= 768;
	const isMiniTablet = width >= 600 && width < 768;
	const isWide = isTablet || isMiniTablet;

	const availableWidth = width - 32 - 8 * 5;
	const CARD_WIDTH = isWide ? availableWidth / 6 : 110;
	const BOX_SIZE = isWide ? Math.min(Math.floor(CARD_WIDTH) - 10, 120) : 100;

	return (
		<View style={styles.sectionContainer}>
			<View style={styles.headerRow}>
				<View
					style={[
						styles.titleBorder,
						{ borderLeftColor: theme.colors.primary },
					]}
				>
					<Text
						variant="titleMedium"
						style={[
							styles.mainTitle,
							isTablet && styles.mainTablet,
						]}
					>
						Book an appointment
					</Text>
					<Text variant="bodySmall">
						Find experienced doctors across all specialties
					</Text>
				</View>
				<Button
					mode="outlined"
					style={styles.viewAllBtn}
					labelStyle={{ fontSize: 12 }}
					onPress={() => navigation.navigate("Search")}
				>
					View All
				</Button>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{consults.map((s) => (
					<ConsultCard
						key={s.id}
						title={s.title}
						description={s.description}
						image={s.image}
						onConsult={() => navigation.navigate("Search")}
					/>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	sectionContainer: {
		marginVertical: 16,
		paddingVertical: 16,
		// paddingHorizontal: 0,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		marginBottom: 16,
	},
	titleBorder: {
		borderLeftWidth: 3,
		paddingLeft: 12,
		flex: 1,
		marginRight: 16,
	},
	mainTitle: {
		fontWeight: "bold",
		marginBottom: 2,
	},
	mainTablet: {},
	viewAllBtn: {
		borderRadius: 20,
	},
	scrollContent: {
		paddingHorizontal: 8,
	},
	cardContainer: {
		width: 160,
		marginHorizontal: 8,
		backgroundColor: "#fff",
		borderRadius: 16,
        marginVertical:16,
		overflow: "hidden",
		elevation: 2, // shadow for android
		shadowColor: "#000", // shadow for iOS
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
    
	},
	cardImage: {
		width: "100%",
		height: 120,
		backgroundColor: "#f0f4f8",
	},
	cardBody: {
		padding: 12,
	},
	cardTitle: {
		fontWeight: "bold",
		marginBottom: 4,
	},
	cardDesc: {
		color: "#666",
		lineHeight: 16,
	},
});
