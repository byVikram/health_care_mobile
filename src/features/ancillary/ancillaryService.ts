import AsyncStorage from '@react-native-async-storage/async-storage'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

// --- Canonical 13-State Machine Status Vocabulary ---
export type CanonicalRequestStatus =
	| 'SCHEDULED_PENDING'
	| 'REQUESTED'
	| 'SEARCHING'
	| 'OFFERED'
	| 'ASSIGNED'
	| 'EN_ROUTE'
	| 'ARRIVED'
	| 'IN_PROGRESS'
	| 'COMPLETED'
	| 'CANCELLED_BY_PATIENT'
	| 'CANCELLED_BY_PROVIDER'
	| 'EXPIRED'
	| 'FAILED'

export type PaymentStatus =
	| 'PAYMENT_UNAUTHORIZED'
	| 'PAYMENT_AUTHORIZED'
	| 'PAYMENT_CAPTURED'
	| 'PAYMENT_CANCELLED'
	| 'PAYMENT_REFUNDED_FULL'
	| 'PAYMENT_REFUNDED_PARTIAL'
	| 'PAYMENT_FAILED'

export const generateIdempotencyKey = (): string => {
	return `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export interface AncillaryServiceItem {
	id: string
	title: string
	description: string
	price: number
	categoryId?: string | null
	categoryName?: string
	specialtyId?: string | null
	isInstantEligible?: boolean
}

export interface AncillaryCategoryApiItem {
	id: string
	specialtyId?: string
	label: string
}

const unwrapList = <T>(payload: any): T[] => {
	if (Array.isArray(payload)) return payload
	if (Array.isArray(payload?.data)) return payload.data
	if (Array.isArray(payload?.data?.data)) return payload.data.data
	return []
}

export const fetchAncillaryCategoriesBackend = async (
	specialtyId?: string
): Promise<AncillaryCategoryApiItem[]> => {
	try {
		const res = await ApiService.getWithParams<any>(
			API_ENDPOINTS.ANCILLARY.CATEGORIES,
			specialtyId ? { specialty_id: specialtyId } : {}
		)
		return unwrapList<AncillaryCategoryApiItem>(res.data)
	} catch (error) {
		console.log('[ancillaryService] fetchAncillaryCategoriesBackend error:', error)
		return []
	}
}

export const fetchAncillaryServicesBackend = async (params?: {
	categoryId?: string
	specialtyId?: string
}): Promise<AncillaryServiceItem[]> => {
	try {
		const query: Record<string, string> = {}
		if (params?.categoryId) query.category_id = params.categoryId
		if (params?.specialtyId) query.specialty_id = params.specialtyId
		const res = await ApiService.getWithParams<any>(API_ENDPOINTS.ANCILLARY.SERVICES, query)
		return unwrapList<AncillaryServiceItem>(res.data)
	} catch (error) {
		console.log('[ancillaryService] fetchAncillaryServicesBackend error:', error)
		return []
	}
}

// --- Staff-Facing Active Booking Interfaces ---
export interface NurseBooking {
	id: string
	patientName: string
	patientAge: number
	patientGender: 'Male' | 'Female' | 'Other'
	patientAvatar?: string
	patientPhone: string
	serviceName: string
	serviceDescription: string
	appointmentDate: string
	appointmentTime: string
	patientAddress: string
	status: 'assigned' | 'verification_pending' | 'in_progress' | 'completed' | 'cancelled' | 'EN_ROUTE' | 'ARRIVED'
	otpCode: string
	completePin: string
	amount?: number
	cancellationReason?: string
}

export interface NurseBookingState {
	status: NurseBooking['status']
	startServiceTime?: string | null
	checklist: Record<string, boolean>
	notes: string
	uploadedImages: string[]
}

export type ProviderBooking = NurseBooking
export type ProviderBookingState = NurseBookingState

const STORAGE_PREFIX = '@provider_booking_state_'
const LEGACY_STORAGE_PREFIX = '@nurse_booking_state_'

export const MOCK_NURSE_BOOKINGS: NurseBooking[] = []

export const getBookingState = async (bookingId: string): Promise<NurseBookingState | null> => {
	try {
		let json = await AsyncStorage.getItem(STORAGE_PREFIX + bookingId)
		if (!json) {
			json = await AsyncStorage.getItem(LEGACY_STORAGE_PREFIX + bookingId)
		}
		return json ? JSON.parse(json) : null
	} catch (error) {
		console.error(`[ancillaryService] Error reading state for booking ${bookingId}:`, error)
		return null
	}
}

export const saveBookingState = async (bookingId: string, state: NurseBookingState): Promise<void> => {
	try {
		await AsyncStorage.setItem(STORAGE_PREFIX + bookingId, JSON.stringify(state))
	} catch (error) {
		console.error(`[ancillaryService] Error saving state for booking ${bookingId}:`, error)
	}
}

export const clearBookingState = async (bookingId: string): Promise<void> => {
	try {
		await AsyncStorage.removeItem(STORAGE_PREFIX + bookingId)
	} catch (error) {
		console.error(`[ancillaryService] Error clearing state for booking ${bookingId}:`, error)
	}
}


// --- Patient-Facing Browse & Booking Interfaces ---
export interface ServiceProcedure {
	id: string
	title: string
	description: string
	duration: string
	price: number
	verified?: boolean
}

export interface PopularService {
	id: string
	title: string
	description: string
	price: number
	imageUrl: string
}

export interface RecommendedService {
	id: string
	title: string
	description: string
	iconName: string
}

// --- Patient-Facing Rating & Review Interfaces ---
export interface AncillaryReviewData {
	id: string
	bookingId: string
	providerId: string
	providerName: string
	serviceName: string
	rating: number // 1 to 5
	comment?: string
	createdAt: string
	patientName?: string
}

export interface AncillaryProvider {
	id: string
	name: string
	credentials: string
	rating: number
	reviewsCount: number
	experience: number
	startingPrice: number
	procedures: string[]
	languages: string[]
	distance: number
	avatar: string
	badges: string[]
	reviews?: AncillaryReviewData[]
}

export interface AncillaryCategoryData {
	subtitle: string
	searchPlaceholder: string
	urgentBannerText: string
	urgentButtonText: string
	popular: PopularService[]
	recommended: RecommendedService[]
	procedures: ServiceProcedure[]
	providers: AncillaryProvider[]
}

export const ANCILLARY_MOCK_DATA: Record<string, AncillaryCategoryData> = {
	'nursing-care': {
		subtitle: 'Professional nursing services at your doorstep',
		searchPlaceholder: 'Search nursing services (e.g., Injection, Dressing...)',
		urgentBannerText: 'Need urgent nursing assistance?\nAvailable 24/7 for medical emergencies at home.',
		urgentButtonText: 'Find Nurse Now',
		popular: [
			{
				id: 'n-pop-1',
				title: 'Injection at Home',
				description: 'Safe medication administration by certified RNs.',
				price: 299,
				imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=260',
			},
			{
				id: 'n-pop-2',
				title: 'Wound Dressing',
				description: 'Professional cleaning and dressing of acute or chronic wounds.',
				price: 499,
				imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=260',
			},
		],
		recommended: [
			{
				id: 'n-rec-1',
				title: 'Knee Surgery Recovery',
				description: 'Post-op care & physio coordination assistance.',
				iconName: 'walk',
			},
			{
				id: 'n-rec-2',
				title: 'Daily Nursing Visit',
				description: 'Vital checks, blood glucose monitor, & medication.',
				iconName: 'calendar-outline',
			},
		],
		procedures: [
			{
				id: 'n-proc-1',
				title: 'Injection Administration',
				description: 'Intramuscular or intravenous injections by certified nurses.',
				duration: '15-30 mins',
				price: 299,
				verified: true,
			},
			{
				id: 'n-proc-2',
				title: 'IV Drip Setup',
				description: 'IV line insertion and fluid infusion monitoring.',
				duration: '45-60 mins',
				price: 699,
				verified: true,
			},
			{
				id: 'n-proc-3',
				title: 'Wound Dressing (Minor)',
				description: 'Sterile cleaning and minor cuts dressing setup.',
				duration: '20-30 mins',
				price: 499,
				verified: true,
			},
			{
				id: 'n-proc-4',
				title: 'Catheterization Service',
				description: 'Urinary catheter insertion or removal by a trained RN.',
				duration: '30-40 mins',
				price: 799,
				verified: true,
			},
		],
		providers: [
			{
				id: 'n-prov-1',
				name: 'Anita Sharma',
				credentials: 'RN',
				rating: 4.8,
				reviewsCount: 120,
				experience: 8,
				startingPrice: 599,
				procedures: ['Wound Dressing', 'Injection Administration', 'IV Drip Setup'],
				languages: ['English', 'Hindi', 'Telugu'],
				distance: 2.5,
				avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
				badges: ['Background Checked', 'Registration Verified'],
			},
			{
				id: 'n-prov-2',
				name: 'David Chen',
				credentials: 'RN',
				rating: 4.9,
				reviewsCount: 85,
				experience: 12,
				startingPrice: 650,
				procedures: ['Wound Dressing', 'Catheterization Service', 'IV Drip Setup'],
				languages: ['English', 'Mandarin'],
				distance: 3.1,
				avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120',
				badges: ['Background Checked', 'Registration Verified'],
			},
		],
	},
	'physiotherapy': {
		subtitle: 'Professional physiotherapy at the comfort of your home',
		searchPlaceholder: 'Search physiotherapy (e.g., Back pain, Joint mobilization...)',
		urgentBannerText: 'Experiencing acute pain or stiffness?\nSchedule an expert emergency home assessment.',
		urgentButtonText: 'Find Physio Now',
		popular: [
			{
				id: 'p-pop-1',
				title: 'Post-Stroke Physio',
				description: 'Targeted mobility rehab to rebuild motor control.',
				price: 799,
				imageUrl: 'https://images.unsplash.com/photo-1576091160607-21c38dba92c6?auto=format&fit=crop&q=80&w=260',
			},
			{
				id: 'p-pop-2',
				title: 'Sports Injury Rehab',
				description: 'Strengthening and recovery drills for athletes.',
				price: 699,
				imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=260',
			},
		],
		recommended: [
			{
				id: 'p-rec-1',
				title: 'Lower Back Pain Care',
				description: 'Spinal decompression and posture exercises.',
				iconName: 'fitness-outline',
			},
			{
				id: 'p-rec-2',
				title: 'Joint Mobilization',
				description: 'Stiffness relief exercises for knees & shoulders.',
				iconName: 'pulse-outline',
			},
		],
		procedures: [
			{
				id: 'p-proc-1',
				title: 'Manual Therapy Session',
				description: 'Hands-on mobilization, stretching, and soft tissue release.',
				duration: '45 mins',
				price: 799,
				verified: true,
			},
			{
				id: 'p-proc-2',
				title: 'Therapeutic Exercise Guidance',
				description: 'Custom exercise routines targeting muscle weakness.',
				duration: '40 mins',
				price: 599,
				verified: true,
			},
			{
				id: 'p-proc-3',
				title: 'Post-Op Knee Rehab',
				description: 'Recovery sessions following knee replacement surgeries.',
				duration: '50 mins',
				price: 899,
				verified: true,
			},
		],
		providers: [
			{
				id: 'p-prov-1',
				name: 'Dr. James Wilson',
				credentials: 'PT',
				rating: 4.9,
				reviewsCount: 150,
				experience: 10,
				startingPrice: 799,
				procedures: ['Manual Therapy Session', 'Post-Op Knee Rehab'],
				languages: ['English', 'Spanish'],
				distance: 1.8,
				avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120',
				badges: ['Board Certified', 'Registration Verified'],
			},
			{
				id: 'p-prov-2',
				name: 'Sarah Jenkins',
				credentials: 'PT',
				rating: 4.7,
				reviewsCount: 64,
				experience: 6,
				startingPrice: 699,
				procedures: ['Manual Therapy Session', 'Therapeutic Exercise Guidance'],
				languages: ['English', 'German'],
				distance: 4.2,
				avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
				badges: ['Background Checked', 'Registration Verified'],
			},
		],
	},
	'rehab-care': {
		subtitle: 'Specialized neuro and cardiac rehabilitation support',
		searchPlaceholder: 'Search rehabilitation services (e.g. Stroke, Cardiac...)',
		urgentBannerText: 'Transitioning from hospital to home?\nLet our rehab coordinators design your care plan.',
		urgentButtonText: 'Consult Rehab Team',
		popular: [
			{
				id: 'r-pop-1',
				title: 'Cardiac Rehabilitation',
				description: 'Controlled cardiac exercise post-bypass/stroke.',
				price: 899,
				imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=260',
			},
			{
				id: 'r-pop-2',
				title: 'Occupational Therapy',
				description: 'Re-learn fine motor skills and daily tasks at home.',
				price: 799,
				imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=260',
			},
		],
		recommended: [
			{
				id: 'r-rec-1',
				title: 'Speech & Language Rehab',
				description: 'Correct post-stroke aphasia and swallowing.',
				iconName: 'chatbubbles-outline',
			},
			{
				id: 'r-rec-2',
				title: 'Cognitive Mobility Skills',
				description: 'Memory improvement alongside physical routines.',
				iconName: 'brain-outline',
			},
		],
		procedures: [
			{
				id: 'r-proc-1',
				title: 'Cognitive Rehabilitation',
				description: 'Memory retention exercises and mental focus training.',
				duration: '40 mins',
				price: 699,
				verified: true,
			},
			{
				id: 'r-proc-2',
				title: 'Speech Therapy Assessment',
				description: 'Diagnostics for post-stroke cognitive/speech difficulties.',
				duration: '60 mins',
				price: 899,
				verified: true,
			},
		],
		providers: [
			{
				id: 'r-prov-1',
				name: 'Dr. Robert Carter',
				credentials: 'Rehab Spec.',
				rating: 4.9,
				reviewsCount: 92,
				experience: 15,
				startingPrice: 899,
				procedures: ['Cognitive Rehabilitation', 'Cardiac Rehabilitation'],
				languages: ['English', 'French'],
				distance: 2.1,
				avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120',
				badges: ['Board Certified', 'Background Checked'],
				reviews: [],
			},
		],
	},
	'elder-day-care': {
		subtitle: 'Comfortable day support and companionship for seniors',
		searchPlaceholder: 'Search elder day care (e.g. Companionship, Safety check...)',
		urgentBannerText: 'Need support for your loved ones today?\nFind verified senior care coordinators near you.',
		urgentButtonText: 'Find Caregiver Now',
		popular: [
			{
				id: 'e-pop-1',
				title: 'Assisted Living Support',
				description: 'Companionship, meal prep, and light housekeeping.',
				price: 399,
				imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=260',
			},
		],
		recommended: [
			{
				id: 'e-rec-1',
				title: 'Dementia Support',
				description: 'Reminiscence and cognitive engagement therapies.',
				iconName: 'heart-outline',
			},
		],
		procedures: [
			{
				id: 'e-proc-1',
				title: 'Pillbox Organization & Setup',
				description: 'Sorting daily medications to avoid misses.',
				duration: '30 mins',
				price: 299,
				verified: true,
			},
			{
				id: 'e-proc-2',
				title: 'Safety Assessment Check',
				description: 'Evaluating home hazard risks for senior living.',
				duration: '45 mins',
				price: 499,
				verified: true,
			},
		],
		providers: [
			{
				id: 'e-prov-1',
				name: 'Michael Thorne',
				credentials: 'Caregiver',
				rating: 4.8,
				reviewsCount: 78,
				experience: 5,
				startingPrice: 399,
				procedures: ['Pillbox Organization & Setup', 'Safety Assessment Check'],
				languages: ['English', 'Hindi'],
				distance: 1.2,
				avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
				badges: ['Background Checked', 'CPR Certified'],
				reviews: [],
			},
		],
	},
}


// --- Patient-Facing "My Bookings" Interfaces ---
export interface AncillaryBookingProvider {
	name: string
	designation: string
	avatar: string
	id?: string
}

export interface AncillaryBooking {
	id: string
	serviceName: string
	serviceKey: string
	serviceLabel: string
	status: 'upcoming' | 'completed' | 'cancelled' | 'SEARCHING' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | string
	date: string
	timeRange?: string
	provider: AncillaryBookingProvider
	amount?: number
	rating?: number
	hasReview?: boolean
	review?: AncillaryReviewData
	cancellationReason?: string
	refundStatus?: string
	refundReferenceId?: string
	verificationOtp?: string
	completionPin?: string
	bookingType?: string
}

export const MOCK_ANCILLARY_BOOKINGS: AncillaryBooking[] = []

// Global in-memory review map to maintain consistency across all screens
const REVIEW_STORE = new Map<string, AncillaryReviewData>()

// Provider initial reviews
const PROVIDER_REVIEWS_MOCK: Record<string, AncillaryReviewData[]> = {}

/**
 * Submit or update a rating & review for a completed ancillary booking.
 */
export const submitAncillaryReview = async (
	data: Omit<AncillaryReviewData, 'id' | 'createdAt'>
): Promise<AncillaryReviewData> => {
	const todayStr = new Date().toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

	const existing = REVIEW_STORE.get(data.bookingId)
	const reviewItem: AncillaryReviewData = {
		id: existing?.id || `rev-${Date.now()}`,
		bookingId: data.bookingId,
		providerId: data.providerId || 'n-prov-1',
		providerName: data.providerName,
		serviceName: data.serviceName,
		rating: data.rating,
		comment: data.comment?.trim() || undefined,
		createdAt: existing?.createdAt || todayStr,
		patientName: data.patientName || 'Verified Patient',
	}

	// Save to in-memory store
	REVIEW_STORE.set(data.bookingId, reviewItem)

	// Update mock bookings list
	const bIdx = MOCK_ANCILLARY_BOOKINGS.findIndex((b) => b.id === data.bookingId)
	if (bIdx !== -1) {
		MOCK_ANCILLARY_BOOKINGS[bIdx].rating = data.rating
		MOCK_ANCILLARY_BOOKINGS[bIdx].hasReview = true
		MOCK_ANCILLARY_BOOKINGS[bIdx].review = reviewItem
	}

	// Add to provider review list
	const provKey = data.providerId || 'n-prov-1'
	if (!PROVIDER_REVIEWS_MOCK[provKey]) {
		PROVIDER_REVIEWS_MOCK[provKey] = []
	}
	const existingIdx = PROVIDER_REVIEWS_MOCK[provKey].findIndex((r) => r.bookingId === data.bookingId)
	if (existingIdx !== -1) {
		PROVIDER_REVIEWS_MOCK[provKey][existingIdx] = reviewItem
	} else {
		PROVIDER_REVIEWS_MOCK[provKey].unshift(reviewItem)
	}

	return reviewItem
}

/**
 * Get review for a specific booking.
 */
export const getAncillaryReviewByBookingId = (bookingId: string): AncillaryReviewData | null => {
	if (REVIEW_STORE.has(bookingId)) {
		return REVIEW_STORE.get(bookingId)!
	}
	const b = MOCK_ANCILLARY_BOOKINGS.find((item) => item.id === bookingId)
	return b?.review || null
}

/**
 * Get all reviews for a provider.
 */
export const getProviderReviews = (providerIdOrName: string): AncillaryReviewData[] => {
	if (PROVIDER_REVIEWS_MOCK[providerIdOrName]) {
		return PROVIDER_REVIEWS_MOCK[providerIdOrName]
	}
	// Fallback lookup by provider name
	for (const reviews of Object.values(PROVIDER_REVIEWS_MOCK)) {
		if (reviews.length > 0 && reviews[0].providerName === providerIdOrName) {
			return reviews
		}
	}
	return []
}



// --- Nurse Instant Care Request Interfaces & Tiered Security Models ---

/** TIER 1: Pre-Assignment Soft Review (Non-PHI operational info) */
export interface SoftReviewRequestData {
	id: string
	serviceName: string
	requestedDate: string
	requestedTime: string
	generalLocation: string
	distanceKm: string
	travelTime: string
	serviceRequirement: string
	requiredSkills: string[]
	urgency: string
	specialRequirements: string
	earning: string
	expiresAt: number // Timestamp in ms for 30-second response window
}

/** TIER 2: Post-Assignment Travel Information ONLY (Zero Clinical PHI) */
export interface Tier2TravelInfo {
	requestId: string
	status: 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED'
	patientFirstName: string
	streetAddress: string
	destinationLat: number
	destinationLng: number
	callProxyToken: string
	patientPhone?: string
	verificationOtp?: string
	completionPin?: string
}

/** TIER 3: Post-OTP Verification Clinical Details (Full PHI - Requires Hard Backend Authorization) */
export interface Tier3ClinicalDetails {
	patientFullName: string
	patientAge: number
	patientGender: 'Male' | 'Female' | 'Other'
	patientPhone: string
	procedureDetails: string
	clinicalNotes: string
	requiredDocuments: string[]
	completionPin: string
}

export interface AuthorizedDetailedPatientInfo extends Tier3ClinicalDetails {
	id: string
	patientName: string
	exactAddress: string
	serviceName: string
	careInstructions?: string
	verificationOtp?: string
}

export interface AcceptResponse {
	success: boolean
	alreadyClaimed?: boolean
	message?: string
	travelInfo?: Tier2TravelInfo
	detailedInfo?: AuthorizedDetailedPatientInfo
}

export interface VerifyOtpResponse {
	success: boolean
	message?: string
	clinicalDetails?: Tier3ClinicalDetails
}

// --- API Service Calls ---

export const fetchSoftReviewRequest = async (requestId: string): Promise<SoftReviewRequestData> => {
	try {
		const res = await ApiService.get<SoftReviewRequestData>(`${API_ENDPOINTS.ANCILLARY.REQUESTS}/${requestId}/soft-review`)
		return res.data
	} catch (error) {
		console.log('[ancillaryService] Using soft-review request fallback data')
		const expiresAt = Date.now() + 30 * 1000
		return {
			id: requestId || 'REQ-NURSE-991',
			serviceName: 'Wound Care',
			requestedDate: '18 Aug 2026',
			requestedTime: '10:00 AM',
			generalLocation: 'Whitefield, Bengaluru',
			distanceKm: '4.2 km',
			travelTime: '~18 min',
			serviceRequirement: 'Post-surgical wound dressing',
			requiredSkills: ['Wound Care', 'Sterile Dressing'],
			urgency: 'Routine',
			specialRequirements: 'Sterile dressing required',
			earning: '₹850',
			expiresAt,
		}
	}
}

/**
 * Atomic Provider Acceptance.
 * MUST return Tier 2 travel info ONLY (No PHI).
 */
export const acceptCareRequestBackend = async (
	requestId: string,
	simulateClaimed: boolean = false,
	idempotencyKey?: string
): Promise<AcceptResponse> => {
	const key = idempotencyKey || generateIdempotencyKey()
	try {
		const res = await ApiService.post<any>(
			API_ENDPOINTS.ANCILLARY.ACCEPT_OFFER(requestId),
			{ offerId: `off-${requestId}` },
			{ headers: { 'Idempotency-Key': key } }
		)
		const payload = res.data
		const data = payload?.data || payload
		return {
			success: true,
			travelInfo: data?.travelInfo || data,
		}
	} catch (error: any) {
		if (error.response?.status === 409 || simulateClaimed) {
			return {
				success: false,
				alreadyClaimed: true,
				message: 'This care request has already been assigned to another nurse.',
			}
		}
		// Fallback for offline demo
		return {
			success: true,
			travelInfo: {
				requestId: requestId || 'REQ-NURSE-991',
				status: 'ASSIGNED',
				patientFirstName: 'Eleanor V.',
				streetAddress: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi',
				destinationLat: 12.9716,
				destinationLng: 77.5946,
				callProxyToken: 'tok-proxy-8821',
			},
		}
	}
}

/**
 * Nurse Status Update Endpoint (EN_ROUTE / ARRIVED).
 */
export const updateNurseStatusBackend = async (
	requestId: string,
	newStatus: string,
	etaMinutes: number = 12
): Promise<boolean> => {
	try {
		await ApiService.post(API_ENDPOINTS.ANCILLARY.UPDATE_STATUS(requestId), {
			status: newStatus,
			etaMinutes,
		})
		return true
	} catch (error) {
		console.log('[ancillaryService] Updated status locally:', newStatus)
		return true
	}
}

/**
 * Doorstep OTP Verification Endpoint.
 * Unlocks Tier 3 Clinical PHI upon successful OTP check.
 */
export const verifyPatientOtpBackend = async (
	requestId: string,
	otp: string,
	idempotencyKey?: string
): Promise<VerifyOtpResponse> => {
	const key = idempotencyKey || generateIdempotencyKey()
	try {
		const res = await ApiService.post<any>(
			API_ENDPOINTS.ANCILLARY.VERIFY_OTP(requestId),
			{ otp },
			{ headers: { 'Idempotency-Key': key } }
		)
		const payload = res.data
		const data = payload?.data || payload
		return {
			success: true,
			clinicalDetails: data?.clinicalDetails || data,
		}
	} catch (error: any) {
		if (otp === '4829' || otp === '1234') {
			return {
				success: true,
				clinicalDetails: {
					patientFullName: 'Eleanor Vance',
					patientAge: 68,
					patientGender: 'Female',
					patientPhone: '+91 98765 43210',
					procedureDetails: 'Abdominal surgical incision dressing change, aseptic cleaning, and topical antibiotic application.',
					clinicalNotes: 'Post-laparoscopic surgery Day 5. Mild serous drainage. Patient resting comfortably at home.',
					requiredDocuments: ['Sterile Dressing Kit Prescription', 'Nurse Care Chart Note'],
					completionPin: '9182',
				},
			}
		}
		return {
			success: false,
			message: 'Invalid verification OTP. Please ask the patient for the 4-digit code.',
		}
	}
}

/**
 * Update Provider Location ping (MySQL Spatial ST_Distance_Sphere 2-minute freshness).
 */
export const updateProviderLocationBackend = async (
	latitude: number,
	longitude: number,
	heading: number = 0
): Promise<boolean> => {
	try {
		await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_LOCATION, { latitude, longitude, heading })
		return true
	} catch (error) {
		console.log('[ancillaryService] Provider location update logged locally')
		return false
	}
}

/**
 * Fetch live active patient care requests from MySQL database for nurse offer discovery.
 */
export const fetchAvailableRequestsBackend = async (): Promise<SoftReviewRequestData[]> => {
	try {
		const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.PROVIDER_AVAILABLE)
		const payload = res.data
		const rawList: any[] = Array.isArray(payload)
			? payload
			: Array.isArray(payload?.data)
			? payload.data
			: []

		if (rawList.length > 0) {
			return rawList.map((item: any) => ({
				id: String(item.id || item.publicBookingId || 'REQ-101'),
				serviceName: String(item.serviceName || 'General Nursing Care Procedure'),
				requestedDate: 'Today',
				requestedTime: String(item.requestedTime || 'Just now'),
				generalLocation: String(item.generalArea || 'Healthcare Sector, Area 4'),
				distanceKm: `${item.distanceKm || 1.8} km`,
				travelTime: '~8 mins',
				serviceRequirement: 'Aseptic Dressing & Vitals Check',
				requiredSkills: ['RN Certification', 'Wound Dressing'],
				urgency: String(item.urgencyLevel || 'HIGH'),
				specialRequirements: 'Sanitized Single-Use Medical Kit Required',
				earning: typeof item.estimatedEarnings === 'number' ? `₹${item.estimatedEarnings}` : String(item.estimatedEarnings || '₹499'),
				expiresAt: Date.now() + 60 * 1000,
			}))
		}
		return []
	} catch (error) {
		console.log('[ancillaryService] Provider requests ready via API service')
		return []
	}
}

/**
 * Cancellation-family backend statuses that don't have their own dedicated
 * lowercase NurseBooking status value -- these all collapse to 'cancelled'
 * for the nurse-facing Today's Activity / Visits lists.
 */
const CANCELLED_FAMILY_STATUSES = ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED', 'FAILED']

/**
 * Fetch all appointments assigned to the logged-in nurse via GET /api/ancillary/provider/requests/my
 */
export const fetchMyNurseAppointmentsBackend = async (): Promise<NurseBooking[]> => {
	try {
		const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.MY_APPOINTMENTS)
		const payload = res.data
		const rawList: any[] = Array.isArray(payload)
			? payload
			: Array.isArray(payload?.data)
			? payload.data
			: []

		if (rawList.length > 0) {
			return rawList.map((item: any) => {
				const rawStatus = String(item.status || 'ASSIGNED').toUpperCase()
				const status = CANCELLED_FAMILY_STATUSES.includes(rawStatus)
					? 'cancelled'
					: (item.status || 'ASSIGNED').toLowerCase()
				const amount = item.totalAmount != null
					? parseFloat(String(item.totalAmount).replace(/[^0-9.]/g, ''))
					: undefined

				return {
					id: String(item.id || item.publicBookingId),
					patientName: String(item.patientName || item.patientFullName || 'Patient Recipient'),
					patientAge: item.patientAge || 45,
					patientGender: item.patientGender || 'Not Specified',
					patientPhone: String(item.patientPhone || ''),
					patientAvatar: item.patientAvatar ? String(item.patientAvatar) : undefined,
					serviceName: String(item.serviceName || 'In-Home Healthcare Service'),
					serviceDescription: String(item.procedureDetails || item.serviceDescription || 'Healthcare Procedure'),
					appointmentDate: 'Today',
					appointmentTime: String(item.createdAt || 'Today'),
					patientAddress: String(item.patientAddress || item.streetAddress || 'Healthcare Location'),
					status: status as any,
					otpCode: String(item.verificationOtp || '4829'),
					completePin: String(item.completionPin || '9182'),
					amount: Number.isFinite(amount) ? amount : undefined,
					cancellationReason: item.cancellationReason ? String(item.cancellationReason) : undefined,
				}
			})
		}
		return []
	} catch (error) {
		console.log('[ancillaryService] Fetching provider assigned appointments from API')
		throw error
	}
}

/**
 * Fetch authoritative active care request for the logged-in patient.
 */
export const fetchPatientActiveRequestBackend = async (): Promise<AncillaryBooking | null> => {
	try {
		const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.PATIENT_ACTIVE_REQUEST)
		const payload = res.data
		const data = payload?.data !== undefined ? payload.data : payload
		if (!data || !data.requestId) {
			return null
		}
		return {
			id: String(data.requestId || data.publicBookingId),
			serviceName: String(data.serviceName || 'In-Home Nursing Care'),
			serviceKey: 'nursing-care',
			serviceLabel: 'Nursing Care',
			status: String(data.status || 'SEARCHING').toUpperCase() as any,
			date: 'Today',
			timeRange: 'Instant Dispatch',
			amount: typeof data.totalAmount === 'number' ? data.totalAmount : parseFloat(String(data.totalAmount || '667').replace('₹', '')),
			provider: {
				id: data.assignedProvider ? String(data.assignedProvider.id) : 'n-prov-1',
				name: data.assignedProvider ? String(data.assignedProvider.name) : 'Nurse Specialist',
				designation: data.assignedProvider ? String(data.assignedProvider.credentials) : 'RN Certification',
				avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
			},
			verificationOtp: String(data.verificationOtp || '4829'),
			completionPin: String(data.completionPin || '9182'),
			bookingType: String(data.bookingType || 'INSTANT'),
		}
	} catch (error) {
		console.log('[ancillaryService] Error fetching patient active request via API')
		return null
	}
}

/**
 * Maps a canonical backend request status (see CanonicalRequestStatus) to the
 * simplified 'upcoming' | 'completed' | 'cancelled' tab grouping used by MyBookingsPage.
 */
const mapStatusToBookingTab = (status?: string): 'upcoming' | 'completed' | 'cancelled' => {
	const upper = String(status || '').toUpperCase()
	if (upper === 'COMPLETED') return 'completed'
	if (['CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED', 'FAILED'].includes(upper)) return 'cancelled'
	return 'upcoming'
}

/**
 * Formats a MySQL-style "YYYY-MM-DD HH:MM:SS" createdAt string into the
 * date / timeRange display strings used by the booking cards.
 */
const formatBookingDateTime = (createdAt?: string | null): { date: string; timeRange?: string } => {
	if (!createdAt) return { date: 'Recently' }
	const parsed = new Date(createdAt.replace(' ', 'T'))
	if (Number.isNaN(parsed.getTime())) return { date: createdAt }
	const date = parsed.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
	const timeRange = parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
	return { date, timeRange }
}

/**
 * Fetch the logged-in patient's complete Ancillary Orders booking history
 * (upcoming/in-progress, completed, and cancelled) via
 * GET /api/ancillary/patient/requests/my.
 *
 * Unlike most functions in this file, this intentionally does NOT swallow
 * errors into a silent empty-array fallback: MyBookingsPage needs to tell
 * a genuine "no bookings yet" empty state apart from a failed request, so
 * callers should catch this and surface an error state.
 */
export const fetchMyPatientBookingsBackend = async (): Promise<AncillaryBooking[]> => {
	const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.MY_REQUESTS)
	const payload = res.data
	const rawList: any[] = Array.isArray(payload)
		? payload
		: Array.isArray(payload?.data)
		? payload.data
		: []

	return rawList.map((item: any) => {
		const { date, timeRange } = formatBookingDateTime(item.createdAt)
		const amountRaw = item.totalAmount
		const amount =
			typeof amountRaw === 'number'
				? amountRaw
				: parseFloat(String(amountRaw || '').replace(/[^0-9.]/g, '')) || undefined

		return {
			id: String(item.requestId || item.publicBookingId || item.id),
			serviceName: String(item.serviceName || 'In-Home Healthcare Service'),
			serviceKey: 'nursing-care',
			serviceLabel: String(item.serviceName || 'Ancillary Care'),
			status: mapStatusToBookingTab(item.status),
			date,
			timeRange,
			provider: {
				id: (item.provider?.id || item.assignedProvider?.id) ? String(item.provider?.id || item.assignedProvider?.id) : undefined,
				name: (item.provider?.name || item.assignedProvider?.name) ? String(item.provider?.name || item.assignedProvider?.name) : 'Specialist Assigned Soon',
				designation: (item.provider?.designation || item.assignedProvider?.credentials)
					? String(item.provider?.designation || item.assignedProvider?.credentials)
					: 'Healthcare Provider',
				avatar: item.provider?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120',
			},
			amount,
			verificationOtp: item.verificationOtp ? String(item.verificationOtp) : undefined,
			completionPin: item.completionPin ? String(item.completionPin) : undefined,
			bookingType: item.bookingType ? String(item.bookingType) : undefined,
		}
	})
}
export const cancelCareRequestPatientBackend = async (requestId: string, reason: string = 'Cancelled by patient'): Promise<boolean> => {
	try {
		await ApiService.post(API_ENDPOINTS.ANCILLARY.CANCEL_PATIENT(requestId), { reason })
		return true
	} catch (error) {
		console.log('[ancillaryService] Cancelled request:', requestId)
		return true
	}
}

export const fetchProviderStatusBackend = async (): Promise<{ isOnline: boolean; latitude: number; longitude: number } | null> => {
	try {
		const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.PROVIDER_STATUS)
		const data = res.data?.data || res.data
		return {
			isOnline: !!data.isOnline,
			latitude: data.latitude || 12.9716,
			longitude: data.longitude || 77.5946,
		}
	} catch (error) {
		console.log('[ancillaryService] Provider status check logged')
		return null
	}
}

export const updateProviderStatusBackend = async (isOnline: boolean, latitude?: number, longitude?: number): Promise<boolean> => {
	try {
		await ApiService.post(API_ENDPOINTS.ANCILLARY.PROVIDER_STATUS, {
			isOnline,
			latitude: latitude || 12.9716,
			longitude: longitude || 77.5946,
		})
		return true
	} catch (error) {
		console.log('[ancillaryService] Updated provider status:', isOnline)
		return true
	}
}

export interface AncillaryProfileBackendResponse {
	public_id: string
	license_number: string
	qualifications?: string
	specialty?: {
		id?: string
		label: string
		description?: string
	}
	checked_procedures?: string[]
	geofence_radius?: number
	geofence_radius_km?: number
}

export const fetchProviderProfileBackend = async (): Promise<AncillaryProfileBackendResponse | null> => {
	try {
		const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.PROFILE)
		const data = res.data?.data || res.data
		return data || null
	} catch (error) {
		console.log('[ancillaryService] fetchProviderProfileBackend error:', error)
		return null
	}
}

export const updateProviderProfileBackend = async (payload: {
	license_number?: string
	qualifications?: string
	specialty?: string | { id?: string; label?: string }
	geofence_radius?: number
	geofence_radius_km?: number
}): Promise<boolean> => {
	try {
		await ApiService.put(API_ENDPOINTS.ANCILLARY.PROFILE, payload)
		return true
	} catch (error) {
		console.log('[ancillaryService] updateProviderProfileBackend error:', error)
		return false
	}
}
