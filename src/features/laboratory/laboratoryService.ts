// src/features/laboratory/laboratoryService.ts
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import type { LabBooking } from '../laboratory/Orderlistlaboratorypage'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface LaboratoryItem {
	id: string
	name: string
	owner_name: string
	avatar_s3_key: string | null
	address: string
	city: string
	operating_hours: {
		open: string
		close: string
		[key: string]: string
	}
	home_collection_available: boolean
	is_24_x_7: boolean
	is_nabl_accredited: boolean
	emergency_tests_available: boolean
	image?: any
}

export interface LabTestType {
	id: string
	name: string
	category: string
	turnaround: string
	base_price: number
	description?: string
}

export interface PlaceLabOrderPayload {
	laboratory_public_id: string
	test_type_ids: string[]
	custom_tests: string
	collection_type: 'walk_in' | 'home_collection'
	collection_address_public_id: string | null
	notes: string | null
}

export interface SubmitLabQuotePayload {
	items: {
		booking_item_id: number | null
		test_name: string
		quoted_price: number
	}[]
	notes?: string | null
}

// ─────────────────────────────────────────────
// Feature flag — flip to false once API is ready
// ─────────────────────────────────────────────

const USE_MOCK = true

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]
const yesterday = () => {
	const d = new Date()
	d.setDate(d.getDate() - 1)
	return d.toISOString().split('T')[0]
}
const daysAgo = (n: number) => {
	const d = new Date()
	d.setDate(d.getDate() - n)
	return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────
// Mock data — Laboratories
// ─────────────────────────────────────────────

const MOCK_LABORATORIES: LaboratoryItem[] = [
	{
		id: 'lab-001',
		name: 'Apollo Diagnostics',
		owner_name: 'Dr. Ramesh Kumar',
		avatar_s3_key: null,
		address: '12, MG Road, Near Metro Station',
		city: 'Bangalore',
		operating_hours: { open: '07:00 AM', close: '09:00 PM' },
		home_collection_available: true,
		is_24_x_7: false,
		is_nabl_accredited: true,
		emergency_tests_available: false,
	},
	{
		id: 'lab-002',
		name: 'SRL Diagnostics',
		owner_name: 'Dr. Priya Nair',
		avatar_s3_key: null,
		address: '45, Linking Road, Bandra West',
		city: 'Mumbai',
		operating_hours: { open: '06:00 AM', close: '10:00 PM' },
		home_collection_available: true,
		is_24_x_7: false,
		is_nabl_accredited: true,
		emergency_tests_available: true,
	},
	{
		id: 'lab-003',
		name: 'Thyrocare Technologies',
		owner_name: 'Dr. Ajit Singh',
		avatar_s3_key: null,
		address: '88, Connaught Place',
		city: 'Delhi',
		operating_hours: { open: '00:00 AM', close: '11:59 PM' },
		home_collection_available: true,
		is_24_x_7: true,
		is_nabl_accredited: true,
		emergency_tests_available: true,
	},
	{
		id: 'lab-004',
		name: 'Lal Path Labs',
		owner_name: 'Dr. Sunita Rao',
		avatar_s3_key: null,
		address: '23, Anna Salai, Teynampet',
		city: 'Chennai',
		operating_hours: { open: '07:30 AM', close: '08:30 PM' },
		home_collection_available: false,
		is_24_x_7: false,
		is_nabl_accredited: false,
		emergency_tests_available: false,
	},
	{
		id: 'lab-005',
		name: 'Metropolis Healthcare',
		owner_name: 'Dr. Anand Mehta',
		avatar_s3_key: null,
		address: '5, Park Street',
		city: 'Kolkata',
		operating_hours: { open: '08:00 AM', close: '08:00 PM' },
		home_collection_available: true,
		is_24_x_7: false,
		is_nabl_accredited: true,
		emergency_tests_available: false,
	},
	{
		id: 'lab-006',
		name: 'Vijaya Diagnostics',
		owner_name: 'Dr. Kavitha Reddy',
		avatar_s3_key: null,
		address: '67, Banjara Hills Road No. 2',
		city: 'Hyderabad',
		operating_hours: { open: '00:00 AM', close: '11:59 PM' },
		home_collection_available: true,
		is_24_x_7: true,
		is_nabl_accredited: true,
		emergency_tests_available: true,
	},
	{
		id: 'lab-007',
		name: 'Neuberg Diagnostics',
		owner_name: 'Dr. Farhan Sheikh',
		avatar_s3_key: null,
		address: '11, FC Road, Shivajinagar',
		city: 'Pune',
		operating_hours: { open: '07:00 AM', close: '09:00 PM' },
		home_collection_available: false,
		is_24_x_7: false,
		is_nabl_accredited: false,
		emergency_tests_available: true,
	},
	{
		id: 'lab-008',
		name: 'Suburban Diagnostics',
		owner_name: 'Dr. Meenal Joshi',
		avatar_s3_key: null,
		address: '34, CG Road, Navrangpura',
		city: 'Ahmedabad',
		operating_hours: { open: '06:30 AM', close: '10:00 PM' },
		home_collection_available: true,
		is_24_x_7: false,
		is_nabl_accredited: true,
		emergency_tests_available: false,
	},
	{
		id: 'lab-009',
		name: 'Dr. Agarwal Diagnostics',
		owner_name: 'Dr. Suresh Agarwal',
		avatar_s3_key: null,
		address: '78, MI Road',
		city: 'Jaipur',
		operating_hours: { open: '08:00 AM', close: '07:00 PM' },
		home_collection_available: false,
		is_24_x_7: false,
		is_nabl_accredited: false,
		emergency_tests_available: false,
	},
	{
		id: 'lab-010',
		name: 'Clumax Diagnostics',
		owner_name: 'Dr. Hetal Patel',
		avatar_s3_key: null,
		address: '19, Ring Road, Varachha',
		city: 'Surat',
		operating_hours: { open: '07:00 AM', close: '09:30 PM' },
		home_collection_available: true,
		is_24_x_7: false,
		is_nabl_accredited: true,
		emergency_tests_available: true,
	},
]

// ─────────────────────────────────────────────
// Mock data — Test types per lab
// ─────────────────────────────────────────────

const MOCK_TEST_TYPES: LabTestType[] = [
	{
		id: 'tt-001',
		name: 'Complete Blood Count (CBC)',
		category: 'Haematology',
		turnaround: 'Same Day',
		base_price: 350,
	},
	{
		id: 'tt-002',
		name: 'Blood Glucose (Fasting)',
		category: 'Biochemistry',
		turnaround: 'Same Day',
		base_price: 120,
	},
	{ id: 'tt-003', name: 'HbA1c', category: 'Biochemistry', turnaround: '24 hrs', base_price: 500 },
	{ id: 'tt-004', name: 'Lipid Profile', category: 'Biochemistry', turnaround: '24 hrs', base_price: 650 },
	{
		id: 'tt-005',
		name: 'Liver Function Test (LFT)',
		category: 'Biochemistry',
		turnaround: '24 hrs',
		base_price: 700,
	},
	{
		id: 'tt-006',
		name: 'Kidney Function Test (KFT)',
		category: 'Biochemistry',
		turnaround: '24 hrs',
		base_price: 700,
	},
	{
		id: 'tt-007',
		name: 'Thyroid Profile (T3/T4/TSH)',
		category: 'Endocrinology',
		turnaround: '24 hrs',
		base_price: 850,
	},
	{ id: 'tt-008', name: 'Urine Routine & Microscopy', category: 'Urology', turnaround: 'Same Day', base_price: 180 },
	{ id: 'tt-009', name: 'Vitamin D (25-OH)', category: 'Biochemistry', turnaround: '48 hrs', base_price: 1200 },
	{ id: 'tt-010', name: 'Vitamin B12', category: 'Biochemistry', turnaround: '48 hrs', base_price: 900 },
	{ id: 'tt-011', name: 'HIV I & II (ELISA)', category: 'Serology', turnaround: '24 hrs', base_price: 400 },
	{ id: 'tt-012', name: 'HBsAg (Hepatitis B)', category: 'Serology', turnaround: '24 hrs', base_price: 350 },
	{ id: 'tt-013', name: 'Dengue NS1 Antigen', category: 'Serology', turnaround: 'Same Day', base_price: 600 },
	{ id: 'tt-014', name: 'Malaria Antigen Test', category: 'Serology', turnaround: 'Same Day', base_price: 450 },
	{ id: 'tt-015', name: 'Chest X-Ray', category: 'Radiology', turnaround: 'Same Day', base_price: 300 },
	{ id: 'tt-016', name: 'ECG (12-Lead)', category: 'Cardiology', turnaround: 'Same Day', base_price: 250 },
	{
		id: 'tt-017',
		name: 'Stool Routine & Microscopy',
		category: 'Microbiology',
		turnaround: '24 hrs',
		base_price: 200,
	},
	{
		id: 'tt-018',
		name: 'Culture & Sensitivity (Urine)',
		category: 'Microbiology',
		turnaround: '48 hrs',
		base_price: 550,
	},
	{
		id: 'tt-019',
		name: 'Iron Studies (Serum Ferritin)',
		category: 'Biochemistry',
		turnaround: '24 hrs',
		base_price: 750,
	},
	{ id: 'tt-020', name: 'C-Reactive Protein (CRP)', category: 'Immunology', turnaround: 'Same Day', base_price: 400 },
]

// ─────────────────────────────────────────────
// Mock data — Lab Bookings
// ─────────────────────────────────────────────

const MOCK_BOOKINGS: LabBooking[] = [
	{
		public_id: 'lb-001-abc-def-ghi',
		patient_name: 'Ravi Kumar',
		patient_phone: '9876543210',
		laboratory_name: 'Apollo Diagnostics',
		laboratory_public_id: 'lab-001',
		laboratory_phone: '08012345678',
		booking_date: today(),
		booking_time: '09:00',
		collection_type: 'walk_in',
		status: 'confirmed',
		payment_status: 'paid',
		total_price: 850,
		notes: 'Patient is fasting since last night.',
		created_at: new Date().toISOString(),
		prescription_verified: true,
		booking_items: [
			{
				id: 1,
				test_name: 'Complete Blood Count (CBC)',
				category: 'Haematology',
				quoted_price: 350,
				base_price: 350,
				turnaround: 'Same Day',
			},
			{
				id: 2,
				test_name: 'HbA1c',
				category: 'Biochemistry',
				quoted_price: 500,
				base_price: 500,
				turnaround: '24 hrs',
			},
		],
		patient: { name: 'Ravi Kumar', age: 45, gender: 'Male', phone: '9876543210' },
		laboratory: { phone: '08012345678' },
	},
	{
		public_id: 'lb-002-xyz-ghi-jkl',
		patient_name: 'Priya Sharma',
		patient_phone: '9123456780',
		laboratory_name: 'SRL Diagnostics',
		laboratory_public_id: 'lab-002',
		laboratory_phone: '02298765432',
		booking_date: today(),
		booking_time: '11:30',
		collection_type: 'home_collection',
		collection_address: '45, MG Road, Bangalore - 560001',
		status: 'pending_confirmation',
		payment_status: 'pending',
		total_price: null,
		notes: null,
		created_at: new Date().toISOString(),
		prescription_verified: false,
		booking_items: [
			{
				id: 3,
				test_name: 'Lipid Profile',
				category: 'Biochemistry',
				quoted_price: null,
				base_price: 650,
				turnaround: '24 hrs',
			},
			{
				id: 4,
				test_name: 'Thyroid Profile (T3/T4/TSH)',
				category: 'Endocrinology',
				quoted_price: null,
				base_price: 850,
				turnaround: '24 hrs',
			},
		],
		patient: { name: 'Priya Sharma', age: 32, gender: 'Female', phone: '9123456780' },
		laboratory: { phone: '02298765432' },
	},
	{
		public_id: 'lb-003-mno-pqr-stu',
		patient_name: 'Arjun Mehta',
		patient_phone: '9988776655',
		laboratory_name: 'Thyrocare Technologies',
		laboratory_public_id: 'lab-003',
		laboratory_phone: '01123456789',
		booking_date: yesterday(),
		booking_time: '08:00',
		collection_type: 'home_collection',
		collection_address: '12, Sector 15, Noida - 201301',
		status: 'sample_collected',
		payment_status: 'paid',
		total_price: 1550,
		notes: 'Diabetic patient, handle with care.',
		created_at: new Date(Date.now() - 86400000).toISOString(),
		prescription_verified: true,
		booking_items: [
			{
				id: 5,
				test_name: 'Blood Glucose (Fasting)',
				category: 'Biochemistry',
				quoted_price: 120,
				base_price: 120,
				turnaround: 'Same Day',
			},
			{
				id: 6,
				test_name: 'Kidney Function Test (KFT)',
				category: 'Biochemistry',
				quoted_price: 700,
				base_price: 700,
				turnaround: '24 hrs',
			},
			{
				id: 7,
				test_name: 'Vitamin D (25-OH)',
				category: 'Biochemistry',
				quoted_price: 730,
				base_price: 1200,
				turnaround: '48 hrs',
			},
		],
		patient: { name: 'Arjun Mehta', age: 58, gender: 'Male', phone: '9988776655' },
		laboratory: { phone: '01123456789' },
	},
	{
		public_id: 'lb-004-vwx-yza-bcd',
		patient_name: 'Deepa Nair',
		patient_phone: '9011223344',
		laboratory_name: 'Metropolis Healthcare',
		laboratory_public_id: 'lab-005',
		laboratory_phone: '03312345678',
		booking_date: daysAgo(3),
		booking_time: '10:00',
		collection_type: 'walk_in',
		status: 'report_ready',
		payment_status: 'paid',
		total_price: 1050,
		notes: null,
		created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
		prescription_verified: true,
		booking_items: [
			{
				id: 8,
				test_name: 'Liver Function Test (LFT)',
				category: 'Biochemistry',
				quoted_price: 700,
				base_price: 700,
				turnaround: '24 hrs',
			},
			{
				id: 9,
				test_name: 'Complete Blood Count (CBC)',
				category: 'Haematology',
				quoted_price: 350,
				base_price: 350,
				turnaround: 'Same Day',
			},
		],
		report: {
			report_pdf_s3_key: null,
			result_images_s3_keys: [],
		},
		patient: { name: 'Deepa Nair', age: 29, gender: 'Female', phone: '9011223344' },
		laboratory: { phone: '03312345678' },
	},
	{
		public_id: 'lb-005-efg-hij-klm',
		patient_name: 'Suresh Babu',
		patient_phone: '9876001122',
		laboratory_name: 'Vijaya Diagnostics',
		laboratory_public_id: 'lab-006',
		laboratory_phone: '04023456789',
		booking_date: daysAgo(7),
		booking_time: '09:30',
		collection_type: 'walk_in',
		status: 'completed',
		payment_status: 'paid',
		total_price: 2200,
		notes: null,
		created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
		prescription_verified: true,
		booking_items: [
			{
				id: 10,
				test_name: 'Vitamin B12',
				category: 'Biochemistry',
				quoted_price: 900,
				base_price: 900,
				turnaround: '48 hrs',
			},
			{
				id: 11,
				test_name: 'Vitamin D (25-OH)',
				category: 'Biochemistry',
				quoted_price: 1200,
				base_price: 1200,
				turnaround: '48 hrs',
			},
			{
				id: 12,
				test_name: 'Iron Studies (Serum Ferritin)',
				category: 'Biochemistry',
				quoted_price: 100,
				base_price: 750,
				turnaround: '24 hrs',
			},
		],
		report: {
			report_pdf_s3_key: null,
			result_images_s3_keys: [],
		},
		patient: { name: 'Suresh Babu', age: 41, gender: 'Male', phone: '9876001122' },
		laboratory: { phone: '04023456789' },
	},
	{
		public_id: 'lb-006-nop-qrs-tuv',
		patient_name: 'Meena Iyer',
		patient_phone: '9765432100',
		laboratory_name: 'Neuberg Diagnostics',
		laboratory_public_id: 'lab-007',
		laboratory_phone: '02012345678',
		booking_date: daysAgo(2),
		booking_time: '14:00',
		collection_type: 'walk_in',
		status: 'cancelled',
		payment_status: 'refunded',
		total_price: 600,
		notes: 'Patient cancelled due to personal reasons.',
		created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
		prescription_verified: false,
		booking_items: [
			{
				id: 13,
				test_name: 'Dengue NS1 Antigen',
				category: 'Serology',
				quoted_price: 600,
				base_price: 600,
				turnaround: 'Same Day',
			},
		],
		patient: { name: 'Meena Iyer', age: 36, gender: 'Female', phone: '9765432100' },
		laboratory: { phone: '02012345678' },
	},
]

// ─────────────────────────────────────────────
// In-memory store so mutations persist in mock
// ─────────────────────────────────────────────

let mockBookingsStore: LabBooking[] = JSON.parse(JSON.stringify(MOCK_BOOKINGS))

const delay = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ─────────────────────────────────────────────
// 1. Get all laboratories
// ─────────────────────────────────────────────

export const getLaboratories = async (
	params: Record<string, any> = {},
	options?: { signal?: AbortSignal }
): Promise<{ data: LaboratoryItem[] }> => {
	if (USE_MOCK) {
		await delay()
		return { data: MOCK_LABORATORIES }
	}
	const res = await ApiService.get<{ success: boolean; data: LaboratoryItem[] }>(API_ENDPOINTS.LABORATORY.LIST, {
		params,
		signal: options?.signal,
	})
	return { data: res.data?.data ?? [] }
}

// ─────────────────────────────────────────────
// 2. Get single laboratory detail
// ─────────────────────────────────────────────

export const getLaboratoryDetail = async (labId: string): Promise<LaboratoryItem | null> => {
	if (USE_MOCK) {
		await delay(400)
		return MOCK_LABORATORIES.find((lab) => lab.id === labId) ?? null
	}
	const res = await ApiService.get<{ success: boolean; data: LaboratoryItem }>(API_ENDPOINTS.LABORATORY.DETAIL(labId))
	return res.data?.data ?? null
}

// ─────────────────────────────────────────────
// 3. Get test types for a laboratory
// ─────────────────────────────────────────────

export const getLabTestTypes = async (labId: string): Promise<LabTestType[]> => {
	if (USE_MOCK) {
		await delay()
		// Slightly vary the test list per lab by skipping a few
		const skip = parseInt(labId.replace(/\D/g, '') || '0', 10) % 5
		return MOCK_TEST_TYPES.filter((_, i) => i % (skip + 2) !== 0 || i < 6)
	}
	const res = await ApiService.get<{ success: boolean; data: LabTestType[] }>(
		API_ENDPOINTS.LABORATORY.TEST_TYPES(labId)
	)
	return res.data?.data ?? []
}

// ─────────────────────────────────────────────
// 4. Place a lab order
// ─────────────────────────────────────────────

export const placeLabOrder = async (payload: PlaceLabOrderPayload): Promise<{ public_id: string }> => {
	if (USE_MOCK) {
		await delay(800)
		const lab = MOCK_LABORATORIES.find((l) => l.id === payload.laboratory_public_id)
		const selectedTests = MOCK_TEST_TYPES.filter((t) => payload.test_type_ids.includes(t.id))
		const newBooking: LabBooking = {
			public_id: `lb-${Date.now()}-mock`,
			patient_name: 'You (Patient)',
			patient_phone: '',
			laboratory_name: lab?.name ?? 'Unknown Lab',
			laboratory_public_id: payload.laboratory_public_id,
			booking_date: new Date().toISOString().split('T')[0],
			booking_time: '10:00',
			collection_type: payload.collection_type,
			collection_address: payload.collection_type === 'home_collection' ? 'Your saved address' : undefined,
			status: 'pending_confirmation',
			payment_status: 'pending',
			total_price: null,
			notes: payload.notes,
			created_at: new Date().toISOString(),
			prescription_verified: false,
			booking_items: selectedTests.map((t, i) => ({
				id: Date.now() + i,
				test_name: t.name,
				category: t.category,
				quoted_price: null,
				base_price: t.base_price,
				turnaround: t.turnaround,
			})),
			patient: { name: 'You (Patient)' },
			laboratory: { phone: lab ? '' : '' },
		}
		mockBookingsStore.unshift(newBooking)
		return { public_id: newBooking.public_id }
	}
	const res = await ApiService.post<{ success: boolean; data: { public_id: string } }>(
		API_ENDPOINTS.LABORATORY.PLACE_ORDER,
		payload
	)
	return res.data?.data ?? { public_id: '' }
}

// ─────────────────────────────────────────────
// 5. Get all lab bookings (for list page)
// ─────────────────────────────────────────────

export const getLabBookings = async (_accessToken: string, status?: string): Promise<LabBooking[]> => {
	if (USE_MOCK) {
		await delay()
		if (!status || status === 'all') return [...mockBookingsStore]
		return mockBookingsStore.filter((b) => b.status === status)
	}
	const res = await ApiService.get<{ success: boolean; data: LabBooking[] }>(API_ENDPOINTS.LABORATORY.BOOKINGS, {
		params: status ? { status } : {},
	})
	return res.data?.data ?? []
}

// ─────────────────────────────────────────────
// 6. Get single booking detail
// ─────────────────────────────────────────────

export const getLabBookingDetail = async (_accessToken: string, publicId: string): Promise<LabBooking> => {
	if (USE_MOCK) {
		await delay(400)
		const booking = mockBookingsStore.find((b) => b.public_id === publicId)
		if (!booking) throw new Error('Booking not found')
		return { ...booking }
	}
	const res = await ApiService.get<{ success: boolean; data: LabBooking }>(
		API_ENDPOINTS.LABORATORY.BOOKING_DETAIL(publicId)
	)
	if (!res.data?.data) throw new Error('Booking not found')
	return res.data.data
}

// ─────────────────────────────────────────────
// 7. Submit quote (lab staff)
// ─────────────────────────────────────────────

export const submitLabBookingQuote = async (
	_accessToken: string,
	publicId: string,
	payload: SubmitLabQuotePayload
): Promise<void> => {
	if (USE_MOCK) {
		await delay(800)
		const idx = mockBookingsStore.findIndex((b) => b.public_id === publicId)
		if (idx === -1) throw new Error('Booking not found')
		const total = payload.items.reduce((sum, item) => sum + item.quoted_price, 0)
		mockBookingsStore[idx] = {
			...mockBookingsStore[idx],
			status: 'confirmed',
			payment_status: 'pending',
			total_price: total,
			booking_items: mockBookingsStore[idx].booking_items.map((item, i) => ({
				...item,
				quoted_price: payload.items[i]?.quoted_price ?? item.quoted_price,
				test_name: payload.items[i]?.test_name ?? item.test_name,
			})),
		}
		return
	}
	await ApiService.post(API_ENDPOINTS.LABORATORY.SUBMIT_QUOTE(publicId), payload)
}

// ─────────────────────────────────────────────
// 8. Confirm payment (patient)
// ─────────────────────────────────────────────

export const confirmLabPayment = async (_accessToken: string, publicId: string): Promise<void> => {
	if (USE_MOCK) {
		await delay(800)
		const idx = mockBookingsStore.findIndex((b) => b.public_id === publicId)
		if (idx === -1) throw new Error('Booking not found')
		mockBookingsStore[idx] = {
			...mockBookingsStore[idx],
			payment_status: 'paid',
			status: 'confirmed',
		}
		return
	}
	await ApiService.post(API_ENDPOINTS.LABORATORY.CONFIRM_PAYMENT(publicId), {})
}

// ─────────────────────────────────────────────
// 9. Mark sample collected (lab staff)
// ─────────────────────────────────────────────

export const markLabSampleCollected = async (_accessToken: string, publicId: string): Promise<void> => {
	if (USE_MOCK) {
		await delay(700)
		const idx = mockBookingsStore.findIndex((b) => b.public_id === publicId)
		if (idx === -1) throw new Error('Booking not found')
		mockBookingsStore[idx] = { ...mockBookingsStore[idx], status: 'sample_collected' }
		return
	}
	await ApiService.post(API_ENDPOINTS.LABORATORY.MARK_SAMPLE_COLLECTED(publicId), {})
}

// ─────────────────────────────────────────────
// 10. Mark report ready (lab staff)
// ─────────────────────────────────────────────

export const markLabReportReady = async (_accessToken: string, publicId: string): Promise<void> => {
	if (USE_MOCK) {
		await delay(700)
		const idx = mockBookingsStore.findIndex((b) => b.public_id === publicId)
		if (idx === -1) throw new Error('Booking not found')
		mockBookingsStore[idx] = { ...mockBookingsStore[idx], status: 'report_ready' }
		return
	}
	await ApiService.post(API_ENDPOINTS.LABORATORY.MARK_REPORT_READY(publicId), {})
}

// ─────────────────────────────────────────────
// 11. Mark booking completed (lab staff)
// ─────────────────────────────────────────────

export const markLabBookingCompleted = async (_accessToken: string, publicId: string): Promise<void> => {
	if (USE_MOCK) {
		await delay(700)
		const idx = mockBookingsStore.findIndex((b) => b.public_id === publicId)
		if (idx === -1) throw new Error('Booking not found')
		mockBookingsStore[idx] = { ...mockBookingsStore[idx], status: 'completed' }
		return
	}
	await ApiService.post(API_ENDPOINTS.LABORATORY.MARK_COMPLETED(publicId), {})
}

// ─────────────────────────────────────────────
// 12. Cancel booking
// ─────────────────────────────────────────────

export const cancelLabBooking = async (_accessToken: string, publicId: string, reason?: string): Promise<void> => {
	if (USE_MOCK) {
		await delay(600)
		const idx = mockBookingsStore.findIndex((b) => b.public_id === publicId)
		if (idx === -1) throw new Error('Booking not found')
		mockBookingsStore[idx] = {
			...mockBookingsStore[idx],
			status: 'cancelled',
			notes: reason ? `Cancelled: ${reason}` : mockBookingsStore[idx].notes,
		}
		return
	}
	await ApiService.post(API_ENDPOINTS.LABORATORY.CANCEL(publicId), { reason })
}

// ─────────────────────────────────────────────
// 13. Reset mock store (useful for dev/testing)
// ─────────────────────────────────────────────

export const resetMockLabStore = () => {
	mockBookingsStore = JSON.parse(JSON.stringify(MOCK_BOOKINGS))
}
