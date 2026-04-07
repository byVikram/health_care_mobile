import React, { useEffect, useRef } from "react";
import {
	Animated,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AppSidebarItem {
	id: string;
	label: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
	onPress: () => void;
}

interface AppSidebarProps {
	visible: boolean;
	userName?: string;
	profileCompletion?: number;
	onClose: () => void;
	onLogout: () => void;
	menuItems: AppSidebarItem[];
}

const SIDEBAR_WIDTH = 290;

export default function AppSidebar({
	visible,
	userName = "User",
	profileCompletion,
	onClose,
	onLogout,
	menuItems,
}: AppSidebarProps) {
	const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
	const insets = useSafeAreaInsets();

	useEffect(() => {
		Animated.timing(translateX, {
			toValue: visible ? 0 : -SIDEBAR_WIDTH,
			duration: 220,
			useNativeDriver: true,
		}).start();
	}, [translateX, visible]);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<View style={styles.modalRoot}>
				<Pressable style={styles.backdrop} onPress={onClose} />

				<Animated.View
					style={[
						styles.sidebar,
						{
							paddingTop: insets.top + 8,
							transform: [{ translateX }],
						},
					]}
				>
					<View style={styles.profileSection}>
						<MaterialCommunityIcons
							name="account-circle-outline"
							size={52}
							color="#1f5f68"
						/>
						<View style={{ flex: 1 }}>
							<Text style={styles.nameText}>{userName}</Text>
							<Text style={styles.profileLink}>
								View and edit profile
							</Text>
							{typeof profileCompletion === "number" ? (
								<Text style={styles.profileCompletion}>
									{profileCompletion}% Profile completed
								</Text>
							) : null}
						</View>
					</View>

					<View style={styles.separator} />

					<View style={styles.menuSection}>
						{menuItems.map((item) => (
							<TouchableOpacity
								key={item.id}
								style={styles.menuItem}
								onPress={() => {
									item.onPress();
									onClose();
								}}
								activeOpacity={0.7}
							>
								<MaterialCommunityIcons
									name={item.icon}
									size={20}
									color="#41565c"
								/>
								<Text style={styles.menuLabel}>
									{item.label}
								</Text>
								<MaterialCommunityIcons
									name="chevron-right"
									size={18}
									color="#9aa4a8"
								/>
							</TouchableOpacity>
						))}
					</View>

					<TouchableOpacity
						style={styles.logoutItem}
						onPress={onLogout}
					>
						<MaterialCommunityIcons
							name="logout"
							size={20}
							color="#c63e3e"
						/>
						<Text style={styles.logoutText}>Log out</Text>
					</TouchableOpacity>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalRoot: {
		flex: 1,
		flexDirection: "row",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.35)",
	},
	sidebar: {
		width: SIDEBAR_WIDTH,
		backgroundColor: "#ffffff",
		borderTopRightRadius: 18,
		borderBottomRightRadius: 18,
		paddingHorizontal: 14,
		paddingBottom: 20,
	},
	profileSection: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 12,
	},
	nameText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#142b30",
	},
	profileLink: {
		fontSize: 12,
		color: "#5d6f75",
		marginTop: 2,
	},
	profileCompletion: {
		fontSize: 12,
		color: "#2f8c58",
		marginTop: 2,
	},
	separator: {
		height: 1,
		backgroundColor: "#e9eef0",
	},
	menuSection: {
		paddingTop: 10,
		flex: 1,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f3f4",
	},
	menuLabel: {
		flex: 1,
		fontSize: 14,
		color: "#24373d",
	},
	logoutItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 14,
		borderTopWidth: 1,
		borderTopColor: "#e9eef0",
	},
	logoutText: {
		color: "#c63e3e",
		fontWeight: "700",
		fontSize: 14,
	},
});
