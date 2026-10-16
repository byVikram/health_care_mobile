const envUrl = process.env.EXPO_PUBLIC_API_ENDPOINT?.trim()

if (!envUrl) {
	throw new Error('EXPO_PUBLIC_API_ENDPOINT is not configured')
}

// Cleartext http:// (and the ws:// derived from it below) is fine against a dev
// machine, but a release build that ships it would send tokens and PHI unencrypted.
const allowInsecureHttp = process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP?.trim() === 'true'

if (!__DEV__ && !/^https:\/\//i.test(envUrl)) {
	if (!allowInsecureHttp) {
		throw new Error('EXPO_PUBLIC_API_ENDPOINT must use https:// in release builds')
	}

	console.warn('Insecure http:// API endpoint allowed by EXPO_PUBLIC_ALLOW_INSECURE_HTTP -- test builds only.')
}

export const BASE_URL = envUrl.replace(/\/+$/, '')

export const API_ENDPOINTS = {
	AUTH: {
		SEND_OTP: `${BASE_URL}/api/auth/send-otp`,
		VERIFY_OTP: `${BASE_URL}/api/auth/verify-otp`,
		REFRESH: `${BASE_URL}/api/auth/refresh`,
		LOGOUT: `${BASE_URL}/api/auth/logout`,
		GET_ROLES: `${BASE_URL}/api/auth/get-roles`,
		CREATE_USER: `${BASE_URL}/api/auth/create-user`,
		SESSIONS: `${BASE_URL}/api/auth/sessions`,
		SESSION_LOGOUT: (publicId: string) => `${BASE_URL}/api/auth/sessions/${publicId}`,
		SESSIONS_OTHERS: `${BASE_URL}/api/auth/sessions/others`,
		SESSION_ACKNOWLEDGE: (publicId: string) => `${BASE_URL}/api/auth/sessions/${publicId}/acknowledge`,
		// Soft delete of the signed-in account (any role).
		DELETE_ACCOUNT: `${BASE_URL}/api/auth/me`,
	},
	DOCTORS: {
		SEARCH: `${BASE_URL}/api/doctors`,
		DETAIL: (id: string) => `${BASE_URL}/api/doctors/${id}`,
		AVAILABILITY: `${BASE_URL}/api/doctors/availability`,
		OVERRIDES: `${BASE_URL}/api/doctors/availability/overrides`,
		OVERRIDE_BY_ID: (id: string | number) => `${BASE_URL}/api/doctors/availability/overrides/${id}`,
		HOSPITALS: `${BASE_URL}/api/doctors/hospitals`,
		/** The signed-in doctor's clinics with today's hours + patient counts (clinic switcher). */
		CLINICS: `${BASE_URL}/api/doctors/clinics`,
	},
	DOCTORS_FAVOURITES: {
		GET: `${BASE_URL}/api/doctors/favourites`,
		TOGGLE: (publicId: string) => `${BASE_URL}/api/doctors/favourites/${publicId}`,
	},
	DOCTOR_PROFILE: {
		STATUS: `${BASE_URL}/api/doctors/me/status`,
		DETAILS: `${BASE_URL}/api/doctors/details`,
		PERSONAL_DETAILS: `${BASE_URL}/api/doctors/personal-details`,
		PROFESSIONAL_DETAILS: `${BASE_URL}/api/doctors/professional-details`,
		ADDITIONAL_DETAILS: `${BASE_URL}/api/doctors/profile/additional-details`,
		HOSPITALS: `${BASE_URL}/api/doctors/hospitals`,
		// Accepts the hospital's public id or the doctor-hospital link id.
		HOSPITAL_BY_ID: (id: string) => `${BASE_URL}/api/doctors/hospitals/${id}`,
		ACHIEVEMENTS: `${BASE_URL}/api/doctors/achievements`,
		ACHIEVEMENT_BY_ID: (id: string) => `${BASE_URL}/api/doctors/achievements/${id}`,
		DELETE_ACCOUNT: `${BASE_URL}/api/doctors/profile`,
	},
	SPECIALITIES: {
		LIST: `${BASE_URL}/api/specialities`,
		SYMPTOMS: `${BASE_URL}/api/specialities/symptoms`,
	},
	AREA_OF_EXPERTISE: {
		LIST: `${BASE_URL}/api/area-of-expertise`,
	},
	TREATMENTS_OFFERING: {
		LIST: `${BASE_URL}/api/treatments-offering`,
	},
	USERS: {
		GET: `${BASE_URL}/api/users`,
		CREATE: `${BASE_URL}/api/users`,
		UPDATE: (id: string | number) => `${BASE_URL}/api/users/${id}`,
		DELETE: (id: string | number) => `${BASE_URL}/api/users/${id}`,
	},
	// APPOINTMENTS: {
	//   GET: `${BASE_URL}/api/appointments`,
	//   CREATE: `${BASE_URL}/api/appointments`,
	//   GET_BY_ID: (id: number) => `${BASE_URL}/api/appointments/${id}`,

	//   UPDATE: `${BASE_URL}/api/appointments/update-status`,
	// },
	APPOINTMENTS: {
		GET: `${BASE_URL}/api/appointments`,
		CREATE: `${BASE_URL}/api/appointments`,
		GET_BY_ID: (id: string) => `${BASE_URL}/api/appointments/${id}`, // Add this
		PRE_INTAKE: (id: string) => `${BASE_URL}/api/appointments/${id}/pre-intake`,
		UPDATE: `${BASE_URL}/api/appointments/update-status`,
		RESCHEDULE: `${BASE_URL}/api/appointments/reschedule`,
		ACTIVE_CONSENT: `${BASE_URL}/api/appointments/active/consent`,
		STATUSES: `${BASE_URL}/api/appointments/statuses`,
		// Doctor-only: not_arrived -> checked_in when the patient physically arrives.
		CHECK_IN: (id: string) => `${BASE_URL}/api/appointments/${id}/check-in`,
		// Unauthenticated by design (external scheduler only) -- see backend's process-not-arrived
		// docstring. Not called from the mobile app.
		PROCESS_NOT_ARRIVED: `${BASE_URL}/api/appointments/process-not-arrived`,
		// Doctor-side "Verify access" gate before opening a patient's file. `start-consultation`
		// (doctorService.startConsultation) is what (re)generates the code — the backend returns it
		// directly in that response rather than SMS-ing the patient (see VerifyAccessPage.tsx for why
		// that matters).
		VERIFY_ACCESS_OTP: (id: string) => `${BASE_URL}/api/appointments/${id}/verify-otp`,
	},
	REVIEWS: {
		CREATE: `${BASE_URL}/api/reviews`,
		BY_DOCTOR: (doctorId: string | number) => `${BASE_URL}/api/reviews/doctor/${doctorId}`,
		BY_APPOINTMENT: (appointmentId: string | number) => `${BASE_URL}/api/reviews/appointment/${appointmentId}`,
	},
	REFERRALS: {
		CREATE: `${BASE_URL}/api/referrals`,
		SENT: `${BASE_URL}/api/referrals/sent`,
		RECEIVED: `${BASE_URL}/api/referrals/received`,
		DETAIL: (id: string) => `${BASE_URL}/api/referrals/${id}`,
		SHARE: `${BASE_URL}/api/referrals/share`,
	},
	NOTIFICATIONS: {
		LIST: `${BASE_URL}/api/notifications`,
		MARK_READ: (id: string) => `${BASE_URL}/api/notifications/${id}/read`,
		UNREAD_COUNT: `${BASE_URL}/api/notifications/unread-count`,
		READ_ALL: `${BASE_URL}/api/notifications/read-all`,
	},
	ADS: {
		ACTIVE: `${BASE_URL}/api/ads/active`,
		TRACK: (publicId: string) => `${BASE_URL}/api/ads/${publicId}/track`,
	},
	APP_CONFIG: `${BASE_URL}/api/app-config`,
	// The signed-in user's sidebar + bottom tabs, by role
	NAVIGATION: `${BASE_URL}/api/lookup/navigation`,
	// constants/apiUrls.ts  — add inside API_ENDPOINTS

	// Profile photo for every role (multipart PUT to set, DELETE to remove)
	UPLOADS: {
		AVATAR: `${BASE_URL}/api/uploads/avatar`,
	},

	PATIENT: {
		ME: `${BASE_URL}/api/patients/me`,
		APPOINTMENT_HOSPITALS: `${BASE_URL}/api/patients/appointments/hospitals`,
		DETAILS: `${BASE_URL}/api/patients/me/details`,
		GET_BY_PUBLIC_ID: (publicId: string) => `${BASE_URL}/api/patients/${publicId}/details`,
		GET_BY_ID: (id: string) => `${BASE_URL}/api/patients/${id}/details`,
		VITALS_CREATE: `${BASE_URL}/api/patients/vitals`,
		VITALS_LATEST: (id: string) => `${BASE_URL}/api/patients/${id}/vitals/latest`,
		VITALS_HISTORY: (id: string) => `${BASE_URL}/api/patients/${id}/vitals`,
		REPORTS: (id: string) => `${BASE_URL}/api/patients/${id}/reports`,
		LABORATORY_REPORTS: (id: string) => `${BASE_URL}/api/patients/${id}/laboratory-reports`,
		RADIOLOGY_REPORTS: (id: string) => `${BASE_URL}/api/patients/${id}/radiology-reports`,
		REPORTS_CREATE: `${BASE_URL}/api/patients/reports`,
		ADDRESSES: `${BASE_URL}/api/patients/me/addresses`,
		TREATMENT_HISTORY: (id: string) => `${BASE_URL}/api/treatments/patient/${id}/history`,
		ADDRESS_BY_ID: (id: string) => `${BASE_URL}/api/patients/me/addresses/${id}`,
		FAMILY_MEMBERS: `${BASE_URL}/api/patients/family-members`,
		FAMILY_MEMBER_BY_ID: (id: string) => `${BASE_URL}/api/patients/family-members/${id}`,
		SUMMARY: `${BASE_URL}/api/patients/me/summary`,
		BOOKINGS: `${BASE_URL}/api/patients/me/bookings`,
	},
	TREATMENTS: {
		CREATE: `${BASE_URL}/api/treatments`,
		BY_APPOINTMENT: (appointmentId: string) => `${BASE_URL}/api/treatments/appointment/${appointmentId}`,
		/** Multipart: the doctor's scribbled notes as an image. Final once submitted (409 on any later edit). */
		SUBMIT_NOTES: (appointmentId: string) => `${BASE_URL}/api/treatments/appointment/${appointmentId}/notes`,
		/** A fresh signed link (about 5 minutes) to the handwritten prescription; 404 until one is submitted. */
		PRESCRIPTION: (appointmentId: string) => `${BASE_URL}/api/treatments/appointment/${appointmentId}/prescription`,
	},
	PHARMACY: {
		ME: `${BASE_URL}/api/pharmacies/me`,
		DETAILS: `${BASE_URL}/api/pharmacies/me/details`,
		ME_DETAILS: `${BASE_URL}/api/pharmacies/me/details`,
	},
	PHARMACY_ORDERS: {
		CREATE: `${BASE_URL}/api/pharmacy-orders`,
		LIST: `${BASE_URL}/api/pharmacy-orders`,
		LIST_BY_PHARMACY: `${BASE_URL}/api/pharmacies`, // New endpoint to get orders fr the logged-in pharmacy
		GET_BY_ID: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}`,
		UPDATE_STATUS: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}/status`,
		UPDATE_MEDICINES: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}/medicines`,
		SEND_REMINDER: (id: string) => `${BASE_URL}/api/pharmacy-orders/${id}/remind`,
	},
	RADIOLOGY_PROFILE: {
		SEARCH: `${BASE_URL}/api/radiology/search`, // Add this line
		DETAILS: `${BASE_URL}/api/radiology/profile`,
		UPDATE: `${BASE_URL}/api/radiology/profile`,
		SCAN_TYPES: `${BASE_URL}/api/radiology/scan-types`,
		SCANS: `${BASE_URL}/api/radiology/scans`,
		BOOKINGS: `${BASE_URL}/api/radiology/bookings`,
		BOOKING_DETAIL: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}`,
		SUBMIT_QUOTE: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}/quote`,
		VERIFY_PRESCRIPTION: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}/verify`,
		UPLOAD_REPORT: (id: string) => `${BASE_URL}/api/radiology/bookings/${id}/report`,
	},
	LABORATORY_PROFILE: {
		DETAILS: `${BASE_URL}/api/laboratory/profile`,
		UPDATE: `${BASE_URL}/api/laboratory/profile`,
		TEST_TYPES: `${BASE_URL}/api/laboratory/test-types`,
		TESTS: `${BASE_URL}/api/laboratory/tests`,
	},

	LABORATORY: {
		SEARCH: `${BASE_URL}/api/laboratory/search`,

		PROFILE: `${BASE_URL}/api/laboratory/profile`,
		DETAILS: `${BASE_URL}/api/laboratory/details`,

		TEST_TYPES: `${BASE_URL}/api/laboratory/test-types`,
		TESTS: `${BASE_URL}/api/laboratory/tests`,

		BOOKINGS: `${BASE_URL}/api/laboratory/bookings`,
		BOOKING_DETAIL: (id: string) => `${BASE_URL}/api/laboratory/bookings/${id}`,

		BOOKING_ITEMS: (bookingId: string) => `${BASE_URL}/api/laboratory/bookings/${bookingId}/items`,

		REPORTS: `${BASE_URL}/api/laboratory/reports`,
		UPLOAD_REPORT: (bookingId: string) => `${BASE_URL}/api/laboratory/bookings/${bookingId}/report`,

		VERIFY_PRESCRIPTION: (bookingId: string) => `${BASE_URL}/api/laboratory/bookings/${bookingId}/verify`,
		TESTS_BY_PUBLIC_ID: (publicId: string) => `${BASE_URL}/api/laboratories/${publicId}/tests`,
	},

	// Add inside API_ENDPOINTS in apiUrls.ts
	LOCATIONS: {
		LIST: `${BASE_URL}/api/locations`,
	},
	FOLLOW_UPS: {
		CREATE: `${BASE_URL}/api/follow-ups`,
		CANCEL: (id: string) => `${BASE_URL}/api/follow-ups/${id}/cancel`,
	},
	COMMUNITIES: {
		LIST: `${BASE_URL}/api/communities`,
		POSTS: (groupId: string) => `${BASE_URL}/api/communities/${groupId}/posts`,
		POST_DETAIL: (postId: string) => `${BASE_URL}/api/communities/threads/${postId}`,
		COMMENTS: (postId: string) => `${BASE_URL}/api/communities/threads/${postId}/comments`,
		JOIN: (groupId: string) => `${BASE_URL}/api/communities/${groupId}/join`,
	},
	BLOGS: {
		LIST: `${BASE_URL}/api/blogs`,
		DETAIL: (slug: string) => `${BASE_URL}/api/blogs/${slug}`,
		COMMENTS: (slug: string) => `${BASE_URL}/api/blogs/${slug}/comments`,
	},
	QA: {
		LIST: `${BASE_URL}/api/qa`,
		DETAIL: (id: string) => `${BASE_URL}/api/qa/${id}`,
		SUBMIT_QUESTION: `${BASE_URL}/api/qa/questions`,
		SUBMIT_ANSWER: (questionId: string) => `${BASE_URL}/api/qa/questions/${questionId}/answers`,
		SUBMIT_REPLY: (answerId: string) => `${BASE_URL}/api/qa/answers/${answerId}/replies`,
		LIKE_ANSWER: (answerId: string) => `${BASE_URL}/api/qa/answers/${answerId}/like`,
	},
	EVENTS: {
		PUBLIC: `${BASE_URL}/api/events/public`,
		PUBLIC_DETAIL: (id: string) => `${BASE_URL}/api/events/public/${id}`,
	},
	ANCILLARY: {
		// A specialty's services AND packages in one response (what the catalogue screen shows)
		CATALOG: `${BASE_URL}/api/ancillary/catalog`,
		PACKAGE_DETAIL: (id: string | number) => `${BASE_URL}/api/ancillary/packages/${id}`,
		PROFILE: `${BASE_URL}/api/ancillary/me/profile`,
		CAPABILITIES: `${BASE_URL}/api/ancillary/me/capabilities`,
		CATEGORIES: `${BASE_URL}/api/ancillary/categories`,
		SUB_SPECIALTIES: `${BASE_URL}/api/ancillary/sub_specialties`,
		SUBSPECIALTIES: `${BASE_URL}/api/ancillary/sub_specialties`,
		SERVICES: `${BASE_URL}/api/ancillary/services`,
		HIERARCHY: `${BASE_URL}/api/ancillary/hierarchy`,
		REQUESTS: `${BASE_URL}/api/ancillary/patient/requests`,
		PATIENT_ACTIVE_REQUEST: `${BASE_URL}/api/ancillary/patient/requests/active`,
		REQUEST_STATUS: (id: string) => `${BASE_URL}/api/ancillary/patient/requests/${id}/status`,
		TIP: (id: string) => `${BASE_URL}/api/ancillary/patient/requests/${id}/tip`,
		CANCEL_PATIENT: (id: string) => `${BASE_URL}/api/ancillary/patient/requests/${id}/cancel`,
		CANCEL_PROVIDER: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/cancel`,
		REJECT_PROVIDER: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/reject`,
		MY_REQUESTS: `${BASE_URL}/api/ancillary/patient/requests/my`,
		PROVIDER_STATUS: `${BASE_URL}/api/ancillary/provider/status`,
		PROVIDER_LOCATION: `${BASE_URL}/api/ancillary/provider/location`,
		PROVIDER_AVAILABLE: `${BASE_URL}/api/ancillary/provider/requests/available`,
		MY_APPOINTMENTS: `${BASE_URL}/api/ancillary/provider/requests/my`,
		ACCEPT_OFFER: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/accept`,
		UPDATE_STATUS: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/status`,
		EN_ROUTE: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/en-route`,
		ARRIVE: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/arrive`,
		VERIFY_OTP: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/verify-otp`,
		COMPLETE_SERVICE: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/complete`,
		CLINICAL_DETAILS: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/clinical-details`,
		PAYMENTS_AUTHORIZE: `${BASE_URL}/api/ancillary/payments/authorize`,
		REVIEWS: `${BASE_URL}/api/ancillary/reviews`,
		REVIEW_BY_BOOKING: (id: string | number) => `${BASE_URL}/api/ancillary/reviews/booking/${id}`,
		PROVIDER_REVIEWS: (id: string | number) => `${BASE_URL}/api/ancillary/reviews/provider/${id}`,
		WS_PATIENT_REQUEST: (id: string) =>
			`${BASE_URL.replace(/^http/, 'ws')}/api/ancillary/ws/patient/requests/${id}`,
		WS_PROVIDER_DISPATCH: `${BASE_URL.replace(/^http/, 'ws')}/api/ancillary/ws/provider/dispatch`,
		SOFT_REVIEW: (id: string) => `${BASE_URL}/api/ancillary/provider/requests/${id}/soft-review`,
		PROVIDER_EARNINGS: `${BASE_URL}/api/ancillary/provider/earnings`,
		PROVIDER_DASHBOARD_METRICS: `${BASE_URL}/api/ancillary/provider/dashboard-metrics`,
		VERIFIED_NURSES: `${BASE_URL}/api/ancillary/nurses`,
		// Phase 1 Slot-Based Booking Endpoints
		AVAILABLE_SLOTS: `${BASE_URL}/api/ancillary/available-slots`,
		REQUESTS_SCHEDULED: `${BASE_URL}/api/ancillary/requests/scheduled`,
		RESPOND_RESCHEDULE: (id: string) => `${BASE_URL}/api/ancillary/patient/requests/${id}/reschedule/respond`,
		PROVIDER_AVAILABILITY: `${BASE_URL}/api/ancillary/provider/me/availability`,
		PROVIDER_OVERRIDES: `${BASE_URL}/api/ancillary/provider/me/availability/overrides`,
		PROVIDER_OVERRIDE_BY_ID: (id: string | number) =>
			`${BASE_URL}/api/ancillary/provider/me/availability/overrides/${id}`,
		PROVIDER_SCHEDULED_ORDERS: `${BASE_URL}/api/ancillary/provider/me/orders`,
		ACCEPT_SCHEDULED: (id: string) => `${BASE_URL}/api/ancillary/provider/me/orders/${id}/accept`,
		DECLINE_SCHEDULED: (id: string) => `${BASE_URL}/api/ancillary/provider/me/orders/${id}/decline`,
		RESCHEDULE_PROPOSAL: (id: string) => `${BASE_URL}/api/ancillary/provider/me/orders/${id}/reschedule/propose`,
		// Provider visit execution (Today / visit details / start / in progress / complete)
		PROVIDER_TODAY: `${BASE_URL}/api/ancillary/provider/me/today`,
		PROVIDER_VISIT: (visitId: string) => `${BASE_URL}/api/ancillary/provider/me/visits/${visitId}`,
		PROVIDER_VISIT_ON_THE_WAY: (visitId: string) =>
			`${BASE_URL}/api/ancillary/provider/me/visits/${visitId}/on-the-way`,
		PROVIDER_VISIT_START: (visitId: string) => `${BASE_URL}/api/ancillary/provider/me/visits/${visitId}/start`,
		PROVIDER_VISIT_PROGRESS: (visitId: string) =>
			`${BASE_URL}/api/ancillary/provider/me/visits/${visitId}/progress`,
		PROVIDER_VISIT_UPDATES: (visitId: string) => `${BASE_URL}/api/ancillary/provider/me/visits/${visitId}/updates`,
		PROVIDER_VISIT_COMPLETE: (visitId: string) =>
			`${BASE_URL}/api/ancillary/provider/me/visits/${visitId}/complete`,
		PROVIDER_VISIT_ISSUES: (visitId: string) => `${BASE_URL}/api/ancillary/provider/me/visits/${visitId}/issues`,
	},
	WALLET: {
		GET: `${BASE_URL}/api/wallet`,
		TRANSACTIONS: `${BASE_URL}/api/wallet/transactions`,
		TRANSACTION_DETAIL: (id: string) => `${BASE_URL}/api/wallet/transactions/${id}`,
		TOPUP: `${BASE_URL}/api/wallet/topup`,
		PAY: `${BASE_URL}/api/wallet/pay`,
	},
}
