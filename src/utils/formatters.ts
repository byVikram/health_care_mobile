// src/utils/formatters.ts

/**
 * Format numeric currency amount to INR format (₹1,250)
 */
export function formatPrice(amount: number | string | null | undefined): string {
	if (amount == null) return '₹0'
	const num = typeof amount === 'number' ? amount : parseFloat(amount)
	if (isNaN(num)) return '₹0'
	return `₹${num.toLocaleString('en-IN')}`
}

/**
 * Calculate age string from birthdate (YYYY-MM-DD or DD-MM-YYYY)
 */
export function calculateAge(dob: string | null | undefined): string {
	if (!dob) return ''
	const parts = dob.split(/[-/]/)
	let birthDate: Date
	if (parts.length === 3) {
		if (parts[0].length === 4) {
			// YYYY-MM-DD
			birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
		} else {
			// DD-MM-YYYY
			birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
		}
	} else {
		birthDate = new Date(dob)
	}

	if (isNaN(birthDate.getTime())) return ''
	const today = new Date()
	let age = today.getFullYear() - birthDate.getFullYear()
	const m = today.getMonth() - birthDate.getMonth()
	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
		age--
	}
	return age > 0 ? `${age} Yrs` : ''
}

/**
 * Format time string (14:30:00 -> 2:30 PM)
 */
export function formatTimeSlot(timeStr: string | null | undefined): string {
	if (!timeStr) return ''
	const parts = timeStr.split(':')
	if (parts.length < 2) return timeStr
	let hours = parseInt(parts[0], 10)
	const minutes = parts[1]
	if (isNaN(hours)) return timeStr
	const ampm = hours >= 12 ? 'PM' : 'AM'
	hours = hours % 12
	hours = hours ? hours : 12
	return `${hours}:${minutes} ${ampm}`
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string | null | undefined): string {
	if (!str) return ''
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Capitalize every word, treating underscores as spaces
 * ("clinic_visit" -> "Clinic Visit")
 */
export function capitaliseWords(str: string | null | undefined): string {
	if (!str) return ''
	return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
