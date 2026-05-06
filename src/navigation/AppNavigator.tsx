import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from 'react-native-paper'

import { useAuth } from '../context/AuthContext'
import { navigationRef } from './navigationService'
import { ROUTES } from './routes'
import type { AppStackParamList } from './types'
import AuthNavigator from './AuthNavigator'
import MainTabNavigator from './MainTabNavigator'

import DoctorSearchPage from '../features/doctor/search/DoctorSearchPage'
import DoctorDetailPage from '../features/doctor/detail/DoctorDetailPage'
import ConsultationPage from '../features/consultation/ConsultationPage'
import PatientProfileLayout from '../features/profile/patient/PatientProfileLayout'
import MyDoctorPage from '../features/patient/MyDoctorPage'
import NotificationPage from '../features/notification/NotificationPage'
import SettingPage from '../features/setting/SettingPage'
import WelcomePage from '../features/auth/WelcomePage'
import AccountPage from '../features/auth/AccountPage'
import PatientPayment from '../features/patientPayment/PatientPayment'
import SearchPage from '../features/doctor/search/SearchPage'
const AppStack = createNativeStackNavigator<AppStackParamList>()

const PaymentStack = createNativeStackNavigator()

function AuthenticatedNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      
      <AppStack.Screen
        name={ROUTES.MAIN.TABS}
        component={MainTabNavigator}
        options={{ animation: 'none' }}
      />

      {/* ✅ ADD THIS SCREEN */}
      <AppStack.Screen
        name={ROUTES.STACK.SEARCH}
        component={SearchPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.DOCTOR_SEARCH}
        component={DoctorSearchPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.DOCTOR_DETAIL}
        component={DoctorDetailPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.FAVOURITE_DOCTOR}
        component={MyDoctorPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.NOTIFICATION}
        component={NotificationPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.CONSULTATION}
        component={ConsultationPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.HEALTH_PROFILE}
        component={PatientProfileLayout}
      />

      <AppStack.Screen
        name={ROUTES.STACK.SETTINGS}
        component={SettingPage}
      />

      <AppStack.Screen
        name={ROUTES.STACK.DOCTOR_WELCOME}
        component={WelcomePage}
        options={{ animation: 'none' }}
      />

      <AppStack.Screen
        name={ROUTES.STACK.ACCOUNT}
        component={AccountPage}
      />

      <AppStack.Screen
        name="PatientPayment"
        component={PatientPayment}
      />
    </AppStack.Navigator>
  )
}
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

	return <NavigationContainer ref={navigationRef}>{accessToken == null ? <AuthNavigator /> : <AuthenticatedNavigator />}</NavigationContainer>
}
