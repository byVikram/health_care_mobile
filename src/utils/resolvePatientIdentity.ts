import { getMigratedItem } from './secureStorage'
import { safeJsonParse } from './jsonUtils'
import { getPatientDetails } from '../features/profile/patient/PatientProfileService'
import { isPlaceholderPatientName } from './patientPlaceholder'

export interface ResolvedPatientIdentity {
	publicId: string
	name: string
	age: string
	gender: string
	bloodGroup: string
	relationship: string
	avatar?: string
}

/** Resolves the logged-in user's own real patient identity (name/age/
 *  gender/publicId): live API first, falling back to cached AsyncStorage
 *  data — the same resolution order, response shape (`response.data.personal`,
 *  not a flat `response.data.name`), and placeholder-name validation
 *  Ancillary's booking flow already uses (see `BookingDetailsPage.tsx`'s
 *  `fetchProfile`), so patient-identity handling is consistent everywhere a
 *  booking is made. Returns `null` if no genuine (non-placeholder) identity
 *  can be resolved — callers must not fabricate a fallback name/age/gender
 *  in that case; let the caller's own "select/confirm patient" UI handle it. */
export async function resolveSelfPatientIdentity(): Promise<ResolvedPatientIdentity | null> {
	let resolvedName = ''
	let resolvedPublicId = ''
	let personalData: any = null

	try {
		const response = await getPatientDetails()
		if (response && response.success && response.data) {
			personalData = response.data.personal
			resolvedName = personalData?.name || response.data.name || ''
			resolvedPublicId = response.data.public_id || response.data.id || personalData?.public_id || personalData?.id || ''
		}
	} catch {
		// fall through to AsyncStorage
	}

	if (!resolvedPublicId || !resolvedName || resolvedName.trim() === '') {
		try {
			const userRaw = await getMigratedItem('user')
			if (userRaw) {
				const userData = safeJsonParse<any>(userRaw)
				if (userData) {
					if (!resolvedPublicId) {
						resolvedPublicId = userData.publicId || userData.public_id || userData.id || ''
					}
					if (!resolvedName || resolvedName.trim() === '') {
						resolvedName = userData.name || userData.full_name || ''
					}
				}
			}
		} catch {
			// ignore
		}
	}

	if (
		!resolvedName ||
		typeof resolvedName !== 'string' ||
		resolvedName.trim() === '' ||
		isPlaceholderPatientName(resolvedName) ||
		!resolvedPublicId
	) {
		return null
	}

	let parsedAge = ''
	if (personalData?.date_of_birth) {
		const dob = new Date(personalData.date_of_birth)
		if (!isNaN(dob.getTime())) {
			const diff = Date.now() - dob.getTime()
			parsedAge = String(Math.abs(new Date(diff).getUTCFullYear() - 1970))
		}
	} else if (personalData?.age) {
		parsedAge = String(personalData.age)
	}

	return {
		publicId: resolvedPublicId,
		name: resolvedName.trim(),
		age: parsedAge,
		gender: personalData?.gender || '',
		bloodGroup: personalData?.blood_group || '',
		relationship: personalData?.relation || 'Self',
		avatar: personalData?.avatar,
	}
}
