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
import LocationScreen from '../components/common/location/LocationScreen'
import { WalletPage } from '../features/wallet/WalletPage'
import { WalletTransactionsPage } from '../features/wallet/WalletTransactionsPage'
import { WalletTransactionDetailPage } from '../features/wallet/WalletTransactionDetailPage'

import DoctorSearchPage from '../features/doctor/search/DoctorSearchPage'
import DoctorDetailPage from '../features/doctor/detail/DoctorDetailPage'
import BookSlotPage from '../features/doctor/book-slot/BookSlotPage'
import ConsultationPage from '../features/consultation/ConsultationPage'
import MyDoctorPage from '../features/patient/MyDoctorPage'
import NotificationPage from '../features/notification/NotificationPage'
import SettingPage from '../features/settings/SettingPage'
// import ScreenCaptureTest from '../features/doctor/search/components/ScreenCaptureTest'
import AccountPage from '../features/auth/AccountPage'
import PatientPayment from '../features/patient-payment/PatientPayment'
import AppointmentConfirmedPage from '../features/patient-payment/AppointmentConfirmedPage'
import ConsentForm from '../features/doctor/components/ConsentForm'
import SearchPage from '../features/doctor/search/SearchPage'
import WelcomeDoctorPage from '../features/onboarding/WelcomeDoctorPage'
import AppointmentList from '../features/appointment/AppointmentList'
import VisitSummaryPage from '../features/appointment/VisitSummaryPage'
import AppointmentDetailsPage from '../features/appointment/AppointmentDetailsPage'
import PharmacySearchPage from '../features/pharmacy/PharmacySearchPage'
import OrderListPage from '../features/pharmacy/OrderListPage'
import PharmacyOrderDetailsPage from '../features/pharmacy/PharmacyOrderDetailsPage'
import PlacePharmacyOrderPage from '../features/pharmacy/PlacePharmacyOrderPage'

import LaboratoryHomeScreen from '../features/laboratory/LaboratoryHomeScreen'
import AllDiagnosticTestsScreen from '../features/laboratory/AllDiagnosticTestsScreen'
import AllHealthPackagesScreen from '../features/laboratory/AllHealthPackagesScreen'
import SampleCollectionScreen from '../features/laboratory/SampleCollectionScreen'
// Lab selection + date/time slot selection are merged into one screen —
// see the doc comment on `LabSelectionScreen.tsx`. The old
// `SlotSelectionScreen` is superseded and intentionally not imported here.
import LabSelectionScreen from '../features/laboratory/LabSelectionScreen'
import BookingSummaryScreen from '../features/laboratory/BookingSummaryScreen'
import LaboratoryPaymentPage from '../features/laboratory/LaboratoryPaymentPage'
import BookingTrackingScreen from '../features/laboratory/BookingTrackingScreen'

import PatientQuestionsListPage from '../features/patient/PatientQuestionsListPage'
import PatientQuestionDetailPage from '../features/patient/PatientQuestionDetailPage'
import RadiologyBookingPage from '../features/radiology/RadiologyBookingPage'
import RadiologyBookingDetailsPage from '../features/radiology/RadiologyBookingDetailsPage'
import RadiologySearchPage from '../features/radiology/RadiologySearchPage'
import OrderListRadiologyPage from '../features/radiology/OrderListRadiologyPage'

import AllSpecialitiesPage from '../features/dashboard/components/AllSpecialitiesPage'

import DoctorEventListPage from '../features/doctor/events/DoctorEventListPage'
import DoctorEventFormPage from '../features/doctor/events/DoctorEventFormPage'

import AllEventsPage from '../features/events/AllEventsPage'
import EventDetailsPage from '../features/events/EventDetailsPage'

import ActiveBookingPage from '../features/ancillary/staff/ActiveBookingPage'
import PatientVerificationPage from '../features/ancillary/staff/PatientVerificationPage'
import ServiceInProgressPage from '../features/ancillary/staff/ServiceInProgressPage'
import CompleteServicePage from '../features/ancillary/staff/CompleteServicePage'
import NurseTodayOverviewPage from '../features/ancillary/staff/NurseTodayOverviewPage'
import NurseBookingHistoryPage from '../features/ancillary/staff/NurseBookingHistoryPage'
import NurseVisitsPage from '../features/ancillary/staff/NurseVisitsPage'
import NurseEarningsPage from '../features/ancillary/staff/NurseEarningsPage'
import NurseHistoryPage from '../features/ancillary/staff/NurseHistoryPage'
import AncillaryServicesPage from '../features/ancillary/patient/AncillaryServicesPage'
import AncillaryProvidersPage from '../features/ancillary/patient/AncillaryProvidersPage'
import BookingCartPage from '../features/ancillary/patient/BookingCartPage'
import BookingSummaryPage from '../features/ancillary/patient/BookingSummaryPage'
import BookingDetailsPage from '../features/ancillary/patient/BookingDetailsPage'
import HomeCareServiceCatalogScreen from '../features/ancillary/patient/HomeCareServiceCatalogScreen'
import CaregiverServicesScreen from '../features/ancillary/patient/CaregiverServicesScreen'
import CaregiverCareTypeOverviewScreen from '../features/ancillary/patient/CaregiverCareTypeOverviewScreen'
import AncillaryPaymentPage from '../features/ancillary/patient/AncillaryPaymentPage'
import PricingReviewPage from '../features/ancillary/staff/PricingReviewPage'
import AncillaryConfirmationPage from '../features/ancillary/patient/AncillaryConfirmationPage'
import AncillaryBookingStatusPage from '../features/ancillary/patient/AncillaryBookingStatusPage'
import TrackAppointmentPage from '../features/ancillary/patient/TrackAppointmentPage'
import MyBookingsPage from '../features/ancillary/patient/MyBookingsPage'
import ServiceMatchingPage from '../features/ancillary/patient/ServiceMatchingPage'

const AppStack = createNativeStackNavigator<AppStackParamList>()

function AuthenticatedNavigator() {
	return (
		<>
			<AppStack.Navigator
				screenOptions={{
					headerShown: false,
					header: ({ options, route }) => (
						<AppScreenHeader
							title={options.title || route.name}
							rightElement={options.headerRight ? options.headerRight({ canGoBack: true }) : undefined}
						/>
					),
				}}
				initialRouteName={ROUTES.MAIN.TABS}
			>
				<AppStack.Screen name={ROUTES.MAIN.TABS} component={MainTabNavigator} options={{ animation: 'none' }} />

				{/* SearchPage renders its own hero header — no navigator header here. */}
				<AppStack.Screen name={ROUTES.STACK.SEARCH} component={SearchPage} options={{ headerShown: false }} />

				<AppStack.Screen
					name={ROUTES.STACK.PATIENT_QUESTIONS_LIST as keyof AppStackParamList}
					component={PatientQuestionsListPage}
					options={{ headerShown: true, title: 'Health Questions' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.PATIENT_QUESTION_DETAIL as keyof AppStackParamList}
					component={PatientQuestionDetailPage}
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
					component={PharmacyOrderDetailsPage}
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
					component={LaboratoryHomeScreen}
					options={{ headerShown: true, title: 'Laboratory' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_ALL_TESTS as keyof AppStackParamList}
					component={AllDiagnosticTestsScreen}
					options={{ headerShown: true, title: 'All Diagnostic Tests' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_ALL_PACKAGES as keyof AppStackParamList}
					component={AllHealthPackagesScreen}
					options={{ headerShown: true, title: 'Health Checkup Packages' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION as keyof AppStackParamList}
					component={SampleCollectionScreen}
					options={{ headerShown: true, title: 'Booking Details' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_SELECT_LAB as keyof AppStackParamList}
					component={LabSelectionScreen}
					options={{ headerShown: true, title: 'Lab & Slot Selection' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_BOOKING_SUMMARY as keyof AppStackParamList}
					component={BookingSummaryScreen}
					options={{ headerShown: true, title: 'Booking Summary' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_PAYMENT as keyof AppStackParamList}
					component={LaboratoryPaymentPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_BOOKING_TRACKING as keyof AppStackParamList}
					component={BookingTrackingScreen}
					options={{ headerShown: true, title: 'Booking Status' }}
				/>

				<AppStack.Screen
					name={ROUTES.STACK.ALL_SPECIALITIES}
					component={AllSpecialitiesPage}
					options={{
						headerShown: true,
						title: 'All Specialities',
					}}
				/>

				{/* DoctorSearchPage renders its own single AppScreenHeader — no navigator header here. */}
				<AppStack.Screen
					name={ROUTES.STACK.DOCTOR_SEARCH}
					component={DoctorSearchPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen name={ROUTES.STACK.DOCTOR_DETAIL} component={DoctorDetailPage} />
				<AppStack.Screen name={ROUTES.STACK.DOCTOR_BOOK_SLOT} component={BookSlotPage} />
				<AppStack.Screen
					name={ROUTES.STACK.FAVOURITE_DOCTOR}
					component={MyDoctorPage}
					options={{
						headerShown: true,
						title: 'Favorite Doctors',
					}}
				/>
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
				<AppStack.Screen name={ROUTES.STACK.APPOINTMENT_CONFIRMED} component={AppointmentConfirmedPage} />
				<AppStack.Screen name={ROUTES.STACK.APPOINTMENT_DETAILS} component={AppointmentDetailsPage} />
				<AppStack.Screen name={ROUTES.STACK.VISIT_SUMMARY} component={VisitSummaryPage} />
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
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_ACTIVE_BOOKING}
					component={ActiveBookingPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_PATIENT_VERIFICATION}
					component={PatientVerificationPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS}
					component={ServiceInProgressPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_COMPLETE_SERVICE}
					component={CompleteServicePage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_TODAY_OVERVIEW}
					component={NurseTodayOverviewPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_VISITS}
					component={NurseVisitsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_EARNINGS}
					component={NurseEarningsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_HISTORY}
					component={NurseHistoryPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_SERVICES}
					component={AncillaryServicesPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_PROVIDERS}
					component={AncillaryProvidersPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_BOOKING_CART}
					component={BookingCartPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_BOOKING_SUMMARY}
					component={BookingSummaryPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_BOOKING_DETAILS}
					component={BookingDetailsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.CAREGIVER_SERVICES}
					component={CaregiverServicesScreen}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.CAREGIVER_TIME_CONFIG}
					component={CaregiverCareTypeOverviewScreen}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.HOME_CARE_CATALOG}
					component={HomeCareServiceCatalogScreen}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_PAYMENT}
					component={AncillaryPaymentPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_PRICING_REVIEW}
					component={PricingReviewPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_CONFIRMATION}
					component={AncillaryConfirmationPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_BOOKING_STATUS}
					component={TrackAppointmentPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT}
					component={TrackAppointmentPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_MY_BOOKINGS}
					component={MyBookingsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_SERVICE_MATCHING as keyof AppStackParamList}
					component={ServiceMatchingPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LOCATION_SELECT as keyof AppStackParamList}
					component={LocationScreen}
					options={{ headerShown: false }}
				/>

				<AppStack.Screen name={ROUTES.STACK.WALLET} component={WalletPage} options={{ headerShown: false }} />
				<AppStack.Screen
					name={ROUTES.STACK.WALLET_TRANSACTIONS}
					component={WalletTransactionsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.WALLET_TRANSACTION_DETAIL}
					component={WalletTransactionDetailPage}
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
