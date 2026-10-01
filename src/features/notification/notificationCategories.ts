// src/features/notification/notificationCategories.ts
//
// Notification categories from the "Notifications" design -- one set for patients, one for doctors.
// The backend's `notifications.type` carries the category id (see scripts/seed_notifications_demo_data.py);
// older notification types the backend already raises (referral_*, reschedule_required, ancillary_*,
// FOLLOW_UP_REMINDER ...) are mapped onto a category by resolveCategory().

type NotificationTone = 'teal' | 'blue' | 'purple' | 'green' | 'amber' | 'orange' | 'grey'

export const NOTIFICATION_TONES: Record<NotificationTone, { bg: string; ink: string }> = {
	teal: { bg: '#E3EFEF', ink: '#2B6F71' },
	blue: { bg: '#DDEBFA', ink: '#2463A8' },
	purple: { bg: '#ECE6FA', ink: '#6A4BB5' },
	green: { bg: '#E6F4EC', ink: '#1E7A4E' },
	amber: { bg: '#FBEFD5', ink: '#8A5300' },
	orange: { bg: '#FBE6DA', ink: '#B4532A' },
	grey: { bg: '#E9EEEF', ink: '#4A5A5D' },
}

export type NotificationCategory = {
	id: string
	label: string
	desc: string
	/** SVG path (24x24 viewBox) for AppPathIcon. */
	icon: string
	tone: NotificationTone
}

/** Triangle-with-bang icon + red tile used for critical alerts, whatever their category. */
export const CRITICAL_ICON = 'M12 3l9.5 17h-19zM12 10v4M12 17.5v.01'
export const CRITICAL_TONE = { bg: '#FDECEA', ink: '#B42318' }

const REPORTS_ICON = 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9'
const PAY_ICON = 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4zM4 7V5.5A1.5 1.5 0 0 1 5.5 4H16v3M15 13.5h2'
const CHAT_ICON = 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'

const PATIENT_CATEGORIES: NotificationCategory[] = [
	{ id: 'appts', label: 'Appointments', desc: 'Reminders, confirmations and changes', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', tone: 'teal' },
	{ id: 'reports', label: 'Reports', desc: 'Lab and scan results when they are ready', icon: REPORTS_ICON, tone: 'blue' },
	{ id: 'meds', label: 'Medicines', desc: 'Dose reminders and refills', icon: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7', tone: 'purple' },
	{
		id: 'care',
		label: 'Home care',
		desc: 'Nurse and caregiver visit updates',
		icon: 'M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16M7 20l1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9M2 15l6 6M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12z',
		tone: 'green',
	},
	{ id: 'pay', label: 'Payments', desc: 'Receipts, refunds and wallet', icon: PAY_ICON, tone: 'amber' },
	{ id: 'community', label: 'Community', desc: 'Answers and replies to your posts', icon: CHAT_ICON, tone: 'teal' },
]

const DOCTOR_CATEGORIES: NotificationCategory[] = [
	{ id: 'req', label: 'Requests', desc: 'New bookings, reschedules and cancellations', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M12 13v5M9.5 15.5h5', tone: 'orange' },
	{ id: 'qa', label: 'Questions', desc: 'Patient questions and votes on your answers', icon: CHAT_ICON, tone: 'teal' },
	{ id: 'reports', label: 'Reports', desc: 'Reports shared by patients and labs', icon: REPORTS_ICON, tone: 'blue' },
	{ id: 'rx', label: 'Prescriptions', desc: 'Prescriptions waiting for your signature', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', tone: 'purple' },
	{ id: 'refer', label: 'Referrals', desc: 'Updates on patients you referred', icon: 'M7 7h11l-3-3M17 17H6l3 3', tone: 'green' },
	{ id: 'pay', label: 'Payouts', desc: 'Weekly payouts and statements', icon: PAY_ICON, tone: 'amber' },
	{ id: 'clinic', label: 'Clinics', desc: 'Timing and staff changes at your clinics', icon: 'M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5M12 8v4M10 10h4', tone: 'grey' },
]

/** Bucket for notification types that don't map onto any category (shown with a plain bell). */
export const OTHER_CATEGORY: NotificationCategory = {
	id: 'other',
	label: 'Updates',
	desc: '',
	icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
	tone: 'grey',
}

export const categoriesForRole = (role?: string | null) => (role === 'doctor' ? DOCTOR_CATEGORIES : PATIENT_CATEGORIES)

/** Category for a notification type: the type itself when it IS a category id, else a best-effort map of the legacy types. */
export function resolveCategory(type: string | null | undefined, role?: string | null): NotificationCategory {
	const cats = categoriesForRole(role)
	const t = (type ?? '').toLowerCase()
	const direct = cats.find((c) => c.id === t)
	if (direct) return direct
	const pick = (id: string) => cats.find((c) => c.id === id) ?? OTHER_CATEGORY
	const isDoctor = role === 'doctor'
	if (t.includes('referral')) return isDoctor ? pick('refer') : OTHER_CATEGORY
	if (t.includes('reschedule') || t.includes('appointment') || t.includes('follow')) return pick(isDoctor ? 'req' : 'appts')
	if (!isDoctor && (t.includes('ancillary') || t.includes('nurse') || t.includes('care'))) return pick('care')
	if (t.includes('payment') || t.includes('wallet') || t.includes('payout')) return pick('pay')
	if (t.includes('report') || t.includes('lab')) return pick('reports')
	return OTHER_CATEGORY
}
