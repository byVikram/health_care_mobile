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
import AccountPage from '../features/auth/AccountPage'
import PatientPayment from '../features/patientPayment/PatientPayment'
import ConsentForm from '../features/doctor/components/ConsentForm'
import SearchPage from '../features/doctor/search/SearchPage'
import WelcomeDoctorPage from '../features/onboarding/WelcomeDoctorPage'
import AllAppointmentList from '../features/appointment/AllAppointmentList'

import PharmacySearchPage from '../features/pharmacy/PharmacySearchPage'
import OrderDetailsScreen from '../features/pharmacy/OrderDetailsScreen'
const AppStack = createNativeStackNavigator<AppStackParamList>()

function AuthenticatedNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={ROUTES.MAIN.TABS}
    >
      <AppStack.Screen
        name={ROUTES.MAIN.TABS}
        component={MainTabNavigator}
        options={{ animation: 'none' }}
      />

      {/* General Search (for patients / doctors) */}
      <AppStack.Screen name={ROUTES.STACK.SEARCH} component={SearchPage} />

      {/* ✅ Pharmacy Search (for pharmacy role) */}
      <AppStack.Screen
        name={ROUTES.STACK.PHARMACY_SEARCH}
        component={PharmacySearchPage}
      />
      <AppStack.Screen name={ROUTES.STACK.ORDER_DETAILS} component={OrderDetailsScreen} />
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

      <AppStack.Screen name={ROUTES.STACK.CONSULTATION} component={ConsultationPage} />

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
        component={WelcomeDoctorPage}
        options={{ animation: 'none' }}
      />

      <AppStack.Screen name={ROUTES.STACK.ACCOUNT} component={AccountPage} />

			<AppStack.Screen name={ROUTES.STACK.APPOINTMENTS} component={AllAppointmentList} />

      <AppStack.Screen
        name={ROUTES.STACK.CONSENT_FORM}
        component={ConsentForm}
        options={{ presentation: 'transparentModal' }}
      />

      <AppStack.Screen name={ROUTES.STACK.PATIENT_PAYMENT} component={PatientPayment} />
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

  return (
    <NavigationContainer ref={navigationRef}>
      {!accessToken ? <AuthNavigator /> : <AuthenticatedNavigator />}
    </NavigationContainer>
  )
}
