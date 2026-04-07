// src/navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

// Screens
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";

import DashboardPage from "../features/dashboard/DashboardPage";
import DoctorSearchPage from "../features/doctor/search/DoctorSearchPage";
import DoctorDetailPage from "../features/doctor/detail/DoctorDetailPage";
import ConsultationPage from "../features/consultation/ConsultationPage";
import PortalPage from "../features/portal/PortalPage";
import ProfilePage from "../features/profile/ProfilePage";
import SidebarLayout from "../components/layout/SidebarLayout";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
	const theme = useTheme();
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: "gray",
				tabBarIcon: ({ color, size }) => {
					let iconName: keyof typeof MaterialCommunityIcons.glyphMap =
						"home";
					if (route.name === "Home") iconName = "home";
					else if (route.name === "Search") iconName = "magnify";
					else if (route.name === "Portal")
						iconName = "calendar-clock";
					else if (route.name === "Profile") iconName = "account";

					return (
						<MaterialCommunityIcons
							name={iconName}
							size={size}
							color={color}
						/>
					);
				},
			})}
		>
			<Tab.Screen name="Home" component={HomeWithSidebar} />
			<Tab.Screen name="Search" component={DoctorSearchPage} />
			<Tab.Screen name="Portal" component={PortalPage} />
			<Tab.Screen name="Profile" component={ProfilePage} />
		</Tab.Navigator>
	);
}

function HomeWithSidebar() {
	return (
		<SidebarLayout>
			<DashboardPage />
		</SidebarLayout>
	);
}

export default function AppNavigator() {
	const { accessToken, isLoading } = useAuth();
	const theme = useTheme();

	if (isLoading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{accessToken == null ? (
					<>
						<Stack.Screen name="Login" component={LoginPage} />
						<Stack.Screen
							name="Register"
							component={RegisterPage}
						/>
					</>
				) : (
					<>
						<Stack.Screen
							name="MainTabs"
							component={MainTabNavigator}
						/>
						<Stack.Screen
							name="DoctorDetail"
							component={DoctorDetailPage}
						/>
						<Stack.Screen
							name="Consultation"
							component={ConsultationPage}
						/>
					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
}
