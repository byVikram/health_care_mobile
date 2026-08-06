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
import { AppScreenHeader, LocationSelector, NotificationPermissionPopup } from '../components/common'

import DoctorSearchPage from '../features/doctor/search/DoctorSearchPage'
import DoctorDetailPage from '../features/doctor/detail/DoctorDetailPage'
import ConsultationPage from '../features/consultation/ConsultationPage'
import MyDoctorPage from '../features/patient/MyDoctorPage'
import NotificationPage from '../features/notification/NotificationPage'
import SettingPage from '../features/setting/SettingPage'
// import ScreenCaptureTest from '../features/doctor/search/components/ScreenCaptureTest'
import AccountPage from '../features/auth/AccountPage'
import PatientPayment from '../features/patientPayment/PatientPayment'
import ConsentForm from '../features/doctor/components/ConsentForm'
import SearchPage from '../features/doctor/search/SearchPage'
import WelcomeDoctorPage from '../features/onboarding/WelcomeDoctorPage'
import AppointmentList from '../features/appointment/AppointmentList'
import PharmacySearchPage from '../features/pharmacy/Pharmacysearchpage'
import OrderListPage from '../features/pharmacy/OrderListPage'
import OrderDetailsScreen from '../features/pharmacy/OrderDetailsScreen'
import PlacePharmacyOrderPage from '../features/pharmacy/PlacePharmacyOrderPage'

import LaboratorySearchPage from '../features/laboratory/LaboratorySearchPage'
import LaboratoryOrderPage from '../features/laboratory/Orderlistlaboratorypage'
import LaboratoryBookingDetail from '../features/laboratory/Bookingdetailslaboratorypage'

import PatientHealthQuestionsList from '../features/dashboard/components/PatientHealthQuestionsList'
import PatientHealthQuestionDetail from '../features/dashboard/components/PatientHealthQuestionDetail'
import RadiologyBookingPage from '../features/radiology/RadiologyBookingPage'
import RadiologyBookingDetailsPage from '../features/radiology/RadiologyBookingDetailsPage'
import RadiologySearchPage from '../features/radiology/RadiologySearchPage'
import OrderListRadiologyPage from '../features/radiology/OrderListRadiologyPage'


import AllSpecialitiesPage from '../features/dashboard/components/AllSpecialitiesPage'
import PlaceLabOrderPage from '../features/laboratory/PlaceLabOrderPage'

import TransportationLandingPage from '../features/transportation/TransportationLandingPage'
import BookRidePage from '../features/transportation/BookRidePage'
import RideTrackingPage from '../features/transportation/RideTrackingPage'

import DoctorEventListPage from '../features/doctor/events/DoctorEventListPage'
import DoctorEventFormPage from '../features/doctor/events/DoctorEventFormPage'

import AllEventsPage from '../features/events/AllEventsPage'
import EventDetailsPage from '../features/events/EventDetailsPage'

const AppStack = createNativeStackNavigator<AppStackParamList>()

function AuthenticatedNavigator() {
	return (
		<>
		<AppStack.Navigator
			screenOptions={{
				headerShown: false,
				header: ({ options, route }) => <AppScreenHeader title={options.title || route.name} />,
			}}
			initialRouteName={ROUTES.MAIN.TABS}
		>
			<AppStack.Screen name={ROUTES.MAIN.TABS} component={MainTabNavigator} options={{ animation: 'none' }} />

			<AppStack.Screen
				name={ROUTES.STACK.SEARCH}
				component={SearchPage}
				options={{ headerShown: true, title: 'Find Doctors' }}
			/>


			<AppStack.Screen
				name={ROUTES.STACK.PATIENT_QUESTIONS_LIST as keyof AppStackParamList}
				component={PatientHealthQuestionsList}
				options={{ headerShown: true, title: 'Patient Questions' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.PATIENT_QUESTION_DETAIL as keyof AppStackParamList}
				component={PatientHealthQuestionDetail}
				options={{ headerShown: true, title: 'Question Detail' }}
			/>

			<AppStack.Screen
				name={ROUTES.STACK.PHARMACY_SEARCH_PAGE}
				component={PharmacySearchPage}
				options={{ headerShown: true, title: 'Pharmacies' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.RADIOLOGY_ORDERS as keyof AppStackParamList}
				component={OrderListRadiologyPage}
				options={{ headerShown: true, title: 'Radiology Orders' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.ORDER_LIST}
				component={OrderListPage}
				options={{ headerShown: true, title: 'Medicine Orders' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.ORDER_DETAILS}
				component={OrderDetailsScreen}
				options={{ headerShown: true, title: 'Order Details' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.PLACE_PHARMACY_ORDER}
				component={PlacePharmacyOrderPage}
				options={{ headerShown: true, title: 'Order Medicines' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.RADIOLOGY_LIST as keyof AppStackParamList}
				component={RadiologySearchPage}
				options={{ headerShown: true, title: 'Radiology List' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.PLACE_RADIOLOGY_ORDER}
				component={RadiologyBookingPage}
				options={{ headerShown: true, title: 'Book Radiology Scan' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.RADIOLOGY_ORDER_DETAIL as keyof AppStackParamList}
				component={RadiologyBookingDetailsPage}
				options={{ headerShown: true, title: 'Radiology Detail' }}
			/>

			<AppStack.Screen
				name={ROUTES.STACK.LABORATORY_LIST as keyof AppStackParamList}
				component={LaboratorySearchPage}
				options={{ headerShown: true, title: 'Laboratory list' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.PLACE_LABORATORY_TEST as keyof AppStackParamList}
				component={PlaceLabOrderPage}
				options={{ headerShown: true, title: 'Place Laboratory Test' }}
			/>

			<AppStack.Screen
				name={ROUTES.STACK.LABORATORY_ORDERS as keyof AppStackParamList}
				component={LaboratoryOrderPage}
				options={{ headerShown: true, title: 'laboratory order list' }}
			/>

			<AppStack.Screen
				name={ROUTES.STACK.LABORATORY_ORDER_DETAILS as keyof AppStackParamList}
				component={LaboratoryBookingDetail}
				options={{ headerShown: true, title: 'laboratory detail' }}
			/>

			<AppStack.Screen
				name={ROUTES.STACK.ALL_SPECIALITIES}
				component={AllSpecialitiesPage}
				options={{
					headerShown: true,
					title: 'All Specialities',
				}}
			/>

			<AppStack.Screen
				name={ROUTES.STACK.DOCTOR_SEARCH}
				component={DoctorSearchPage}
				options={{ headerShown: true, title: 'Search Doctors' }}
			/>
			<AppStack.Screen name={ROUTES.STACK.DOCTOR_DETAIL} component={DoctorDetailPage} />
			<AppStack.Screen name={ROUTES.STACK.FAVOURITE_DOCTOR} component={MyDoctorPage} />
			<AppStack.Screen name={ROUTES.STACK.NOTIFICATION} component={NotificationPage} />
			<AppStack.Screen name={ROUTES.STACK.CONSULTATION} component={ConsultationPage} />
			<AppStack.Screen name={ROUTES.STACK.SETTINGS} component={SettingPage} />
			{/* <AppStack.Screen name={ROUTES.STACK.SCREEN_CAPTURE_TEST} component={ScreenCaptureTest} /> */}
			<AppStack.Screen
				name={ROUTES.STACK.DOCTOR_WELCOME}
				component={WelcomeDoctorPage}
				options={{ animation: 'none' }}
			/>
			<AppStack.Screen name={ROUTES.STACK.ACCOUNT} component={AccountPage} />
			<AppStack.Screen
				name={ROUTES.STACK.APPOINTMENTS}
				component={AppointmentList}
				options={{ headerShown: true, title: 'Appointments' }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.CONSENT_FORM}
				component={ConsentForm}
				options={{ presentation: 'transparentModal' }}
			/>
			<AppStack.Screen name={ROUTES.STACK.PATIENT_PAYMENT} component={PatientPayment} />
			<AppStack.Screen
				name={ROUTES.STACK.TRANSPORTATION_LANDING}
				component={TransportationLandingPage}
				options={{ headerShown: false }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.BOOK_RIDE}
				component={BookRidePage}
				options={{ headerShown: false }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.RIDE_TRACKING}
				component={RideTrackingPage}
				options={{ headerShown: false }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.DOCTOR_EVENTS}
				component={DoctorEventListPage}
				options={{ headerShown: false }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.DOCTOR_EVENT_FORM}
				component={DoctorEventFormPage}
				options={{ headerShown: false }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.ALL_EVENTS}
				component={AllEventsPage}
				options={{ headerShown: false }}
			/>
			<AppStack.Screen
				name={ROUTES.STACK.EVENT_DETAILS}
				component={EventDetailsPage}
				options={{ headerShown: false }}
			/>
		</AppStack.Navigator>
		<NotificationPermissionPopup />
		</>
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
