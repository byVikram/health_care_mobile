export interface StatusColorStyle {
	color: string
	bgColor: string
	dot: string
	bg: string // legacy support for components expecting .bg
	text: string // legacy support for components expecting .text to match color
}

export const SEMANTIC_STATUS_COLORS = {
	success: {
		color: '#10b981',
		bgColor: 'rgba(16, 185, 129, 0.1)',
		dot: '#10b981',
		bg: 'rgba(16, 185, 129, 0.1)',
		text: '#10b981',
	},
	warning: {
		color: '#f59e0b',
		bgColor: 'rgba(245, 158, 11, 0.1)',
		dot: '#f59e0b',
		bg: 'rgba(245, 158, 11, 0.1)',
		text: '#f59e0b',
	},
	danger: {
		color: '#ef4444',
		bgColor: 'rgba(239, 68, 68, 0.1)',
		dot: '#ef4444',
		bg: 'rgba(239, 68, 68, 0.1)',
		text: '#ef4444',
	},
	info: {
		color: '#3b82f6',
		bgColor: 'rgba(59, 130, 246, 0.1)',
		dot: '#3b82f6',
		bg: 'rgba(59, 130, 246, 0.1)',
		text: '#3b82f6',
	},
	primary: {
		color: '#0d8585',
		bgColor: 'rgba(13, 133, 133, 0.1)',
		dot: '#0d8585',
		bg: 'rgba(13, 133, 133, 0.1)',
		text: '#0d8585',
	},
	purple: {
		color: '#8b5cf6',
		bgColor: 'rgba(139, 92, 246, 0.1)',
		dot: '#8b5cf6',
		bg: 'rgba(139, 92, 246, 0.1)',
		text: '#8b5cf6',
	},
	default: {
		color: '#64748b',
		bgColor: '#f1f5f9',
		dot: '#64748b',
		bg: '#f1f5f9',
		text: '#64748b',
	},
}

const STATUS_MAPPING: Record<string, keyof typeof SEMANTIC_STATUS_COLORS> = {
	// success states
	confirmed: 'success',
	completed: 'success',
	sample_collected: 'success',
	'sample collected': 'success',
	scan_completed: 'success',
	'scan completed': 'success',
	accepted: 'success',
	delivered: 'success',

	// warning / pending states
	pending: 'warning',
	pending_payment: 'warning',
	'pending payment': 'warning',
	awaiting_sample: 'warning',
	'awaiting sample': 'warning',

	// danger / cancelled states
	cancelled: 'danger',
	failed: 'danger',
	rejected: 'danger',

	// info / blue states
	report_ready: 'info',
	'report ready': 'info',
	processing: 'info',
	outfordelivery: 'info',
	out_for_delivery: 'info',
	'out for delivery': 'info',

	// primary / teal states
	pending_quote: 'primary',
	'pending quote': 'primary',

	// purple/rescheduled states
	rescheduled: 'purple',
	reschedule_required: 'danger',
	'waiting for patient confirmation': 'purple',
	'waiting for your confirmation': 'purple',
}

export function getStatusStyle(status?: string): StatusColorStyle {
	if (!status) return SEMANTIC_STATUS_COLORS.default
	const normalized = status.trim().toLowerCase()
	const key = STATUS_MAPPING[normalized]
	return key ? SEMANTIC_STATUS_COLORS[key] : SEMANTIC_STATUS_COLORS.default
}
