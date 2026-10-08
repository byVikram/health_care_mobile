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
import { usePushNotifications } from '../services/pushNotificationService'
import MainTabNavigator from './MainTabNavigator'
import { AppScreenHeader, LocationSelector, NotificationPermissionPopup } from '../components/common'
import { useFirstLaunchPermissions } from '../features/onboarding/useFirstLaunchPermissions'
import LocationScreen from '../components/common/location/LocationScreen'
import { WalletPage } from '../features/wallet/WalletPage'
import { WalletTransactionsPage } from '../features/wallet/WalletTransactionsPage'
import { WalletTransactionDetailPage } from '../features/wallet/WalletTransactionDetailPage'

import DoctorSearchPage from '../features/doctor/search/DoctorSearchPage'
import DoctorDetailPage from '../features/doctor/detail/DoctorDetailPage'
import BookSlotPage from '../features/doctor/book-slot/BookSlotPage'
import ConsultationPage from '../features/consultation/ConsultationPage'
import VerifyAccessPage from '../features/doctor/verify-access/VerifyAccessPage'
import MyDoctorPage from '../features/patient/MyDoctorPage'
import NotificationPage from '../features/notification/NotificationPage'
import SettingPage from '../features/settings/SettingPage'
// import ScreenCaptureTest from '../features/doctor/search/components/ScreenCaptureTest'
import AccountPage from '../features/auth/AccountPage'
import PatientPayment from '../features/patient-payment/PatientPayment'
import AppointmentConfirmedPage from '../features/patient-payment/AppointmentConfirmedPage'
import ConsentForm from '../features/doctor/components/ConsentForm'
import SearchPage from '../features/doctor/search/SearchPage'
import LegalPage from '../features/auth/LegalPage'
import WelcomeDoctorPage from '../features/onboarding/WelcomeDoctorPage'
import AppointmentList from '../features/appointment/AppointmentList'
import VisitSummaryPage from '../features/appointment/VisitSummaryPage'
import AppointmentDetailsPage from '../features/appointment/AppointmentDetailsPage'
import PharmacySearchPage from '../features/pharmacy/PharmacySearchPage'
import OrderListPage from '../features/pharmacy/OrderListPage'
import PharmacyOrderDetailsPage from '../features/pharmacy/PharmacyOrderDetailsPage'
import PlacePharmacyOrderPage from '../features/pharmacy/PlacePharmacyOrderPage'

import LabCatalogPage from '../features/laboratory/LabCatalogPage'
import LabCartPage from '../features/laboratory/LabCartPage'
import LabCentersPage from '../features/laboratory/LabCentersPage'
import LabReviewPage from '../features/laboratory/LabReviewPage'
import LabPaymentPage from '../features/laboratory/LabPaymentPage'
import LabSuccessPage from '../features/laboratory/LabSuccessPage'
import LabOrderPage from '../features/laboratory/LabOrderPage'
import LabReportPage from '../features/laboratory/LabReportPage'
import OrderListLaboratoryPage from '../features/laboratory_duplicated/OrderListLaboratoryPage'
import BookingDetailsLaboratoryPage from '../features/laboratory_duplicated/BookingDetailsLaboratoryPage'

import HealthReadsPage from '../features/health-feed/HealthReadsPage'
import ReadArticlePage from '../features/health-feed/ReadArticlePage'
import HealthQuestionsPage from '../features/health-feed/HealthQuestionsPage'
import QuestionThreadPage from '../features/health-feed/QuestionThreadPage'
import RadiologyBookingPage from '../features/radiology/RadiologyBookingPage'
import RadiologyBookingDetailsPage from '../features/radiology/RadiologyBookingDetailsPage'
import RadiologySearchPage from '../features/radiology/RadiologySearchPage'
import OrderListRadiologyPage from '../features/radiology/OrderListRadiologyPage'

import AllSpecialitiesPage from '../features/dashboard/components/AllSpecialitiesPage'

import DoctorEventListPage from '../features/doctor/events/DoctorEventListPage'
import DoctorEventFormPage from '../features/doctor/events/DoctorEventFormPage'

import AllEventsPage from '../features/events/AllEventsPage'
import EventDetailsPage from '../features/events/EventDetailsPage'

import ProviderVisitDetailsPage from '../features/ancillary/staff/visit/ProviderVisitDetailsPage'
import ProviderVisitInProgressPage from '../features/ancillary/staff/visit/ProviderVisitInProgressPage'
import ProviderCompleteVisitPage from '../features/ancillary/staff/visit/ProviderCompleteVisitPage'
import NurseEarningsPage from '../features/ancillary/staff/NurseEarningsPage'
import AncillaryServicesPage from '../features/ancillary/patient/AncillaryServicesPage'
import HomeCareServiceCatalogScreen from '../features/ancillary/patient/HomeCareServiceCatalogScreen'
import CaregiverServicesScreen from '../features/ancillary/patient/CaregiverServicesScreen'
import CaregiverCareTypeOverviewScreen from '../features/ancillary/patient/CaregiverCareTypeOverviewScreen'
import PricingReviewPage from '../features/ancillary/staff/PricingReviewPage'
import AncillaryConfirmationPage from '../features/ancillary/patient/AncillaryConfirmationPage'
import AncillaryBookingStatusPage from '../features/ancillary/patient/AncillaryBookingStatusPage'
import TrackAppointmentPage from '../features/ancillary/patient/TrackAppointmentPage'
import MyBookingsPage from '../features/ancillary/patient/MyBookingsPage'
import ServiceMatchingPage from '../features/ancillary/patient/ServiceMatchingPage'
import AncillaryBookVisitPage from '../features/ancillary/patient/AncillaryBookVisitPage'
import AncillaryReviewPayPage from '../features/ancillary/patient/AncillaryReviewPayPage'
import AncillaryBookNowReviewPage from '../features/ancillary/patient/AncillaryBookNowReviewPage'
import AncillaryScheduledDetailsPage from '../features/ancillary/patient/AncillaryScheduledDetailsPage'

// Profile redesign (patient / doctor / ancillary) -- see features/profile/ProfileHubPage
import PersonalDetailsPage from '../features/profile/shared/PersonalDetailsPage'
import ProfileSettingsPage from '../features/profile/shared/SettingsPage'
import LoginSecurityPage from '../features/profile/shared/LoginSecurityPage'
import AvailabilityPage from '../features/profile/availability/AvailabilityPage'
import GoOnlinePermissionsPage from '../features/ancillary/staff/availability/GoOnlinePermissionsPage'
import HealthDetailsPage from '../features/profile/patient/HealthDetailsPage'
import LifestylePage from '../features/profile/patient/LifestylePage'
import FamilyMembersPage from '../features/profile/patient/FamilyMembersPage'
import FamilyMemberPage from '../features/profile/patient/FamilyMemberPage'
import SavedAddressesPage from '../features/profile/patient/SavedAddressesPage'
import AddressFormPage from '../features/profile/patient/AddressFormPage'
import ProfessionalDetailsPage from '../features/profile/doctor/ProfessionalDetailsPage'
import HospitalsPage from '../features/profile/doctor/HospitalsPage'
import AchievementsPage from '../features/profile/doctor/AchievementsPage'
import FavouriteDoctorsPage from '../features/profile/doctor/FavouriteDoctorsPage'
import WorkDocumentsPage from '../features/profile/ancillary/WorkDocumentsPage'

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

				{/* Health feed screens render their own headers. */}
				<AppStack.Screen name={ROUTES.STACK.BLOG_LIST as keyof AppStackParamList} component={HealthReadsPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.BLOG_ARTICLE as keyof AppStackParamList} component={ReadArticlePage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_QUESTIONS_LIST as keyof AppStackParamList} component={HealthQuestionsPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_QUESTION_DETAIL as keyof AppStackParamList} component={QuestionThreadPage} options={{ headerShown: false }} />

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

				{/* Lab Tests Ordering flow: every screen renders its own header. */}
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_LIST as keyof AppStackParamList} component={LabCatalogPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION as keyof AppStackParamList} component={LabCartPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_SELECT_LAB as keyof AppStackParamList} component={LabCentersPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_BOOKING_SUMMARY as keyof AppStackParamList} component={LabReviewPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_PAYMENT as keyof AppStackParamList} component={LabPaymentPage} options={{ headerShown: false }} />
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_PAYMENT_SUCCESS as keyof AppStackParamList}
					component={LabSuccessPage}
					options={{ headerShown: false, gestureEnabled: false }}
				/>
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_BOOKING_TRACKING as keyof AppStackParamList} component={LabOrderPage} options={{ headerShown: false }} />
				<AppStack.Screen name={ROUTES.STACK.LABORATORY_REPORT as keyof AppStackParamList} component={LabReportPage} options={{ headerShown: false }} />
				{/* Lab orders list + booking details (opened from the Bookings tab, the side drawer and AppHeader). */}
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_ORDERS}
					component={OrderListLaboratoryPage}
					options={{ headerShown: true, title: 'Lab Orders' }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.LABORATORY_ORDER_DETAILS}
					component={BookingDetailsLaboratoryPage}
					options={{ headerShown: true, title: 'Lab Booking Details' }}
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
				<AppStack.Screen name={ROUTES.STACK.VERIFY_ACCESS} component={VerifyAccessPage} />
				<AppStack.Screen name={ROUTES.STACK.CONSULTATION} component={ConsultationPage} />
				<AppStack.Screen name={ROUTES.STACK.SETTINGS} component={SettingPage} />
				{/* <AppStack.Screen name={ROUTES.STACK.SCREEN_CAPTURE_TEST} component={ScreenCaptureTest} /> */}
				<AppStack.Screen
					name={ROUTES.STACK.DOCTOR_WELCOME}
					component={WelcomeDoctorPage}
					options={{ animation: 'none' }}
				/>
				<AppStack.Screen name={ROUTES.STACK.ACCOUNT} component={AccountPage} />
				<AppStack.Screen name={ROUTES.STACK.LEGAL} component={LegalPage} />
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
					name={ROUTES.STACK.PROVIDER_VISIT_DETAILS}
					component={ProviderVisitDetailsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS}
					component={ProviderVisitInProgressPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.PROVIDER_VISIT_COMPLETE}
					component={ProviderCompleteVisitPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.NURSE_EARNINGS}
					component={NurseEarningsPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_SERVICES}
					component={AncillaryServicesPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_BOOK_VISIT}
					component={AncillaryBookVisitPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_REVIEW_PAY}
					component={AncillaryReviewPayPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_BOOK_NOW_REVIEW}
					component={AncillaryBookNowReviewPage}
					options={{ headerShown: false }}
				/>
				<AppStack.Screen
					name={ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS}
					component={AncillaryScheduledDetailsPage}
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

				{/* Profile sub-screens: each draws its own header (ProfileScreen). */}
				<AppStack.Screen name={ROUTES.STACK.PROFILE_PERSONAL} component={PersonalDetailsPage} />
				<AppStack.Screen name={ROUTES.STACK.PROFILE_SETTINGS} component={ProfileSettingsPage} />
				<AppStack.Screen name={ROUTES.STACK.PROFILE_SECURITY} component={LoginSecurityPage} />
				<AppStack.Screen name={ROUTES.STACK.PROFILE_AVAILABILITY} component={AvailabilityPage} />
				<AppStack.Screen name={ROUTES.STACK.GO_ONLINE_PERMISSIONS} component={GoOnlinePermissionsPage} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_HEALTH} component={HealthDetailsPage} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_LIFESTYLE} component={LifestylePage} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_FAMILY} component={FamilyMembersPage} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_FAMILY_MEMBER} component={FamilyMemberPage} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_ADDRESSES} component={SavedAddressesPage} />
				<AppStack.Screen name={ROUTES.STACK.PATIENT_ADDRESS_FORM} component={AddressFormPage} />
				<AppStack.Screen name={ROUTES.STACK.DOCTOR_PROFESSIONAL} component={ProfessionalDetailsPage} />
				<AppStack.Screen name={ROUTES.STACK.DOCTOR_HOSPITALS} component={HospitalsPage} />
				<AppStack.Screen name={ROUTES.STACK.DOCTOR_ACHIEVEMENTS} component={AchievementsPage} />
				<AppStack.Screen name={ROUTES.STACK.DOCTOR_FAVOURITES} component={FavouriteDoctorsPage} />
				<AppStack.Screen name={ROUTES.STACK.PROVIDER_WORK} component={WorkDocumentsPage} />

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

export default function AppNavigator({ askPermissions = true }: { askPermissions?: boolean }) {
	const { accessToken, isLoading } = useAuth()
	const theme = useTheme()
	usePushNotifications(!!accessToken)
	// Fresh install: the Android system dialogs for Location, Notifications and Camera, once the app is ready.
	useFirstLaunchPermissions(askPermissions && !isLoading)

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
