// src/utils/pincode.ts
//
// An Indian pincode is six digits and never starts with 0. Geocoders return it in many forms ("560 010", "560010;560011",
// "KA 560010") or not at all, so anything that came from one goes through normalizePincode.

const FIND = /(?:^|\D)([1-9]\d{2})\s?(\d{3})(?!\d)/

/** The first six-digit pincode in `raw`, or undefined. */
export const normalizePincode = (raw?: string | null): string | undefined => {
	const match = FIND.exec(raw ?? '')
	return match ? `${match[1]}${match[2]}` : undefined
}

export const isPincode = (value?: string | null): value is string => /^[1-9]\d{5}$/.test(value ?? '')
