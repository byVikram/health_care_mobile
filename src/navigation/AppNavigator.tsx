import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuth } from '../context/AuthContext'
import { ActivityIndicator, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'

// Screens
import LoginPage from '../features/auth/LoginPage'
import RegisterPage from '../features/auth/RegisterPage'
import OnboardingPage from '../features/onboarding/OnboardingPage'
import WelcomePage from '../features/auth/WelcomePage'
import AccountPage from '../features/auth/AccountPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import DoctorSearchPage from '../features/doctor/search/DoctorSearchPage'
import SearchPage from '../features/doctor/search/SearchPage'
import DoctorDetailPage from '../features/doctor/detail/DoctorDetailPage'
import ConsultationPage from '../features/consultation/ConsultationPage'
import PortalPage from '../features/portal/PortalPage'
import ProfilePage from '../features/profile/ProfilePage'
import PatientProfileLayout from '../features/profile/patient/PatientProfileLayout'
import MyDoctorPage from '../features/patient/MyDoctorPage'
import NotificationPage from '../features/notification/NotificationPage'
import SidebarLayout from '../components/layout/SidebarLayout'
import SettingPage from '../features/setting/SettingPage'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

export const navigationRef = React.createRef<any>()

// ─── Home tab: Dashboard wrapped in the sidebar ───────────────────────────────
function HomeWithSidebar() {
	return (
		<SidebarLayout>
			<DashboardPage />
		</SidebarLayout>
	)
}

// ─── Bottom tab navigator ─────────────────────────────────────────────────────
function MainTabNavigator() {
	const theme = useTheme()
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: 'gray',
				tabBarIcon: ({ color, size }) => {
					let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home'
					if (route.name === 'Home') iconName = 'home'
					else if (route.name === 'Search') iconName = 'magnify'
					else if (route.name === 'Portal') iconName = 'calendar-clock'
					else if (route.name === 'Profile') iconName = 'account'
					return <MaterialCommunityIcons name={iconName} size={size} color={color} />
				},
			})}
		>
			<Tab.Screen name="Home" component={HomeWithSidebar} />
			{/*
        ✅ FIX: The Search tab now points to SearchPage (the input page),
        NOT DoctorSearchPage. DoctorSearchPage is a stack screen reached
        after the user submits a query from SearchPage.
      */}
			<Tab.Screen name="Search" component={SearchPage} />
			<Tab.Screen name="Portal" component={PortalPage} />
			<Tab.Screen name="Profile" component={ProfilePage} />
		</Tab.Navigator>
	)
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
	const { accessToken, isLoading } = useAuth()
	const theme = useTheme()

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		)
	}

	return (
		<NavigationContainer ref={navigationRef}>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{accessToken == null ? (
					// ─── UNAUTHENTICATED ──────────────────────────────────
					<>
						<Stack.Screen name="Onboarding" component={OnboardingPage} options={{ animation: 'none' }} />
						<Stack.Screen name="Login" component={LoginPage} options={{ animation: 'none' }} />
						<Stack.Screen name="Register" component={RegisterPage} />
					</>
				) : (
					// ─── AUTHENTICATED ────────────────────────────────────
					<>
						{/* Main bottom tabs */}
						<Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ animation: 'none' }} />

						{/*
              ✅ FIX: SearchPage and DoctorSearchPage registered here as
              stack screens so navigation.navigate("SearchPage") and
              navigation.navigate("DoctorSearchPage") both work from anywhere.
            */}
						<Stack.Screen name="SearchPage" component={SearchPage} />
						<Stack.Screen name="DoctorSearchPage" component={DoctorSearchPage} />

						{/* Other stack screens */}
						<Stack.Screen name="DoctorDetail" component={DoctorDetailPage} />
						<Stack.Screen name="FavouriteDoctor" component={MyDoctorPage} />
						<Stack.Screen name="Notification" component={NotificationPage} />
						<Stack.Screen name="Consultation" component={ConsultationPage} />
						<Stack.Screen name="HealthProfile" component={PatientProfileLayout} />
						<Stack.Screen name="SettingPage" component={SettingPage} />

						{/* Doctor onboarding flow */}
						<Stack.Screen name="DoctorWelcome" component={WelcomePage} options={{ animation: 'none' }} />
						<Stack.Screen name="AccountPage" component={AccountPage} />
					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	)
}

