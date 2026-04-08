import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader, AppSidebar } from "../common";
import type { AppSidebarItem } from "../common";
import { useAuth } from "../../context/AuthContext";

interface SidebarLayoutProps {
	children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const navigation = useNavigation<any>();
	const { clearAuth, user } = useAuth();

	const menuItems = useMemo<AppSidebarItem[]>(
		() => [
			{
				id: "home",
				label: "Home",
				icon: "home-outline",
				onPress: () =>
					navigation.navigate("MainTabs", { screen: "Home" }),
			},
			{
				id: "my-doctors",
				label: "My Doctors",
				icon: "stethoscope",
				onPress: () =>
					navigation.navigate("MainTabs", { screen: "Search" }),
			},
			{
				id: "appointments",
				label: "Appointments",
				icon: "calendar-check-outline",
				onPress: () =>
					navigation.navigate("MainTabs", { screen: "Portal" }),
			},
			{
				id: "profile",
				label: "Profile",
				icon: "account-outline",
				onPress: () =>
					navigation.navigate("MainTabs", { screen: "Profile" }),
			},
			{
				id: "help",
				label: "Help Center",
				icon: "help-circle-outline",
				onPress: () =>
					navigation.navigate("MainTabs", { screen: "Profile" }),
			},
		],
		[navigation],
	);

	return (
		<View style={styles.container}>
			<AppSidebar
				visible={isSidebarOpen}
				userName={user?.name || "Nitin"}
				profileCompletion={user?.profileCompletion}
				onClose={() => setIsSidebarOpen(false)}
				onLogout={clearAuth}
				menuItems={menuItems}
			/>

			<AppHeader
				userName={user?.name || "Nitin"}
				location="KR Market"
				avatarUri={user?.avatar}
				onAvatarPress={() => setIsSidebarOpen(true)}
			/>

			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
});
