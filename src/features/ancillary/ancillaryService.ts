import AsyncStorage from '@react-native-async-storage/async-storage'

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
	status: 'assigned' | 'verification_pending' | 'in_progress' | 'completed'
	otpCode: string
	completePin: string
}

export interface NurseBookingState {
	status: NurseBooking['status']
	startServiceTime?: string | null
	checklist: Record<string, boolean>
	notes: string
	uploadedImages: string[]
}

const STORAGE_PREFIX = '@nurse_booking_state_'

export const MOCK_NURSE_BOOKINGS: NurseBooking[] = [
	{
		id: 'ns-booking-101',
		patientName: 'William Mercer',
		patientAge: 68,
		patientGender: 'Male',
		patientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
		patientPhone: '+1 (555) 019-2834',
		serviceName: 'Post-Surgical Wound Care & Dressing Change',
		serviceDescription: 'Wound assessment, cleaning, dressing change, and administration of prescribed topical antibiotics.',
		appointmentDate: 'August 06, 2026',
		appointmentTime: '10:00 AM - 11:30 AM',
		patientAddress: '4382 Oakwood Ave, Apt 3B, Los Angeles, CA 90004',
		status: 'assigned',
		otpCode: '1234',
		completePin: '5678',
	},
	{
		id: 'ns-booking-102',
		patientName: 'Eleanor Vance',
		patientAge: 74,
		patientGender: 'Female',
		patientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
		patientPhone: '+1 (555) 043-9876',
		serviceName: 'Geriatric Vital Monitoring & Medication Setup',
		serviceDescription: 'Weekly blood pressure, glucose checking, medication pillbox organization, and basic cognitive screen.',
		appointmentDate: 'August 06, 2026',
		appointmentTime: '01:00 PM - 02:00 PM',
		patientAddress: '782 Pinecrest Blvd, Glendale, CA 91202',
		status: 'assigned',
		otpCode: '1234',
		completePin: '5678',
	},
	{
		id: 'ns-booking-103',
		patientName: 'Marcus Brodie',
		patientAge: 45,
		patientGender: 'Male',
		patientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
		patientPhone: '+1 (555) 089-2211',
		serviceName: 'Intravenous (IV) Therapy & Hydration Care',
		serviceDescription: 'IV line insertion, medication infusion administration (hydromorphone), and post-infusion monitoring.',
		appointmentDate: 'August 06, 2026',
		appointmentTime: '03:30 PM - 05:00 PM',
		patientAddress: '1504 Sierra Bonita Ave, West Hollywood, CA 90046',
		status: 'completed',
		otpCode: '1234',
		completePin: '5678',
	},
]

export const getBookingState = async (bookingId: string): Promise<NurseBookingState | null> => {
	try {
		const json = await AsyncStorage.getItem(STORAGE_PREFIX + bookingId)
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
			},
		],
	},
}


// --- Patient-Facing "My Bookings" Interfaces ---
export interface AncillaryBookingProvider {
	name: string
	designation: string
	avatar: string
}

export interface AncillaryBooking {
	id: string
	serviceName: string
	serviceKey: string
	serviceLabel: string
	status: 'upcoming' | 'completed' | 'cancelled'
	date: string
	timeRange?: string
	provider: AncillaryBookingProvider
	amount?: number
	rating?: number
	cancellationReason?: string
	refundStatus?: string
	refundReferenceId?: string
}

export const MOCK_ANCILLARY_BOOKINGS: AncillaryBooking[] = [
	{
		id: 'book-1',
		serviceName: 'Nursing Care',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
		status: 'upcoming',
		date: 'Tomorrow',
		timeRange: '09:00 AM - 11:00 AM',
		provider: {
			name: 'Anita Sharma',
			designation: 'Registered Nurse',
			avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
		},
	},
	{
		id: 'book-1b',
		serviceName: 'Physiotherapy Session',
		serviceKey: 'physiotherapy',
		serviceLabel: 'Physiotherapy',
		status: 'upcoming',
		date: '12 Aug 2026',
		timeRange: '04:00 PM - 05:00 PM',
		provider: {
			name: 'Dr. James Wilson',
			designation: 'Physiotherapist',
			avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120',
		},
	},
	{
		id: 'book-1c',
		serviceName: 'Elderly Care Visit',
		serviceKey: 'elderly-care',
		serviceLabel: 'Elderly Care',
		status: 'upcoming',
		date: '14 Aug 2026',
		timeRange: '10:00 AM - 12:00 PM',
		provider: {
			name: 'Michael Thorne',
			designation: 'Caregiver',
			avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
		},
	},
	{
		id: 'book-2',
		serviceName: 'Wound Dressing',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
		status: 'completed',
		date: '12 Oct 2023',
		provider: {
			name: 'Anita Sharma',
			designation: 'Registered Nurse',
			avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
		},
		amount: 549,
		rating: 4.5,
	},
	{
		id: 'book-3',
		serviceName: 'Physiotherapy Session',
		serviceKey: 'physiotherapy',
		serviceLabel: 'Physiotherapy',
		status: 'cancelled',
		date: '05 Oct 2023',
		provider: {
			name: 'Dr. James Wilson',
			designation: 'Physiotherapist',
			avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120',
		},
		cancellationReason: 'Provider unavailable due to emergency.',
		refundStatus: 'Refund Initiated',
		refundReferenceId: '#RF9832K',
	},
]

// --- Nurse Instant Care Request Interfaces & Backend Simulation ---
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
	expiresAt: number // Timestamp in ms for 30-min response window
}

export interface AuthorizedDetailedPatientInfo {
	id: string
	patientName: string
	patientAge: number
	patientGender: 'Male' | 'Female' | 'Other'
	patientPhone: string
	exactAddress: string
	serviceName: string
	procedureDetails: string
	clinicalNotes: string
	careInstructions: string
	requiredDocuments: string[]
	verificationOtp: string
	completionPin: string
}

export const fetchSoftReviewRequest = async (requestId: string): Promise<SoftReviewRequestData> => {
	// Simulates backend API returning ONLY soft-review non-PHI info before acceptance
	// 30-second response window
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

export interface AcceptResponse {
	success: boolean
	alreadyClaimed?: boolean
	message?: string
	detailedInfo?: AuthorizedDetailedPatientInfo
}

export const acceptCareRequestBackend = async (
	requestId: string,
	simulateClaimed: boolean = false
): Promise<AcceptResponse> => {
	// Simulates backend acceptance API call and race condition check
	if (simulateClaimed) {
		return {
			success: false,
			alreadyClaimed: true,
			message: 'This care request has already been assigned to another nurse.',
		}
	}
	return {
		success: true,
		detailedInfo: {
			id: requestId || 'REQ-NURSE-991',
			patientName: 'Eleanor Vance',
			patientAge: 68,
			patientGender: 'Female',
			patientPhone: '+91 98765 43210',
			exactAddress: '72 Park Street, Block B, Apt 402, Whitefield, Bengaluru',
			serviceName: 'Wound Care',
			procedureDetails: 'Abdominal surgical incision dressing change, aseptic cleaning, and topical antibiotic application.',
			clinicalNotes: 'Post-laparoscopic surgery Day 5. Mild serous drainage. Patient resting comfortably at home.',
			careInstructions: 'Verify patient identity with OTP check. Check vitals (BP, SpO2) before starting procedure.',
			requiredDocuments: ['Sterile Dressing Kit Prescription', 'Nurse Care Chart Note'],
			verificationOtp: '4829',
			completionPin: '9182',
		},
	}
}