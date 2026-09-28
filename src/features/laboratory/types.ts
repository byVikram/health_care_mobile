// src/features/laboratory/types.ts
//
// Shared shapes for the multi-step Laboratory booking flow (Test/Package
// Selection → Patient Details → Lab & Slot Selection → Booking Summary →
// Confirm Booking → Booking Tracking), used by `SampleCollectionScreen`,
// `LabSelectionScreen`, `BookingSummaryScreen`, and `BookingTrackingScreen`
// so they agree on what's been collected without a new global store —
// this rides through navigation route params instead, the same way
// `PLACE_LABORATORY_TEST` / `PLACE_RADIOLOGY_ORDER` already carry booking
// context via params (see `navigation/types.ts`).

import type { PatientAddress } from '../profile/patient/PatientProfileService'

/** Who the lab booking is for (the caller or a family member), as carried in the draft. */
export interface PatientProfile {
	id: string
	publicId?: string
	name: string
	age: string | number
	gender: string
	relationship: string
	avatar?: string
	bloodGroup?: string
}

// Mirrors `CollectionType` in `features/laboratory_duplicated/laboratory.ts`
// (the real, already-integrated lab-booking payload) so this flow's choice
// lines up with the backend contract other lab flows already use.
export type CollectionMethod = 'home_collection' | 'walk_in'

/** Which kind of booking this is — mirrors `LaboratorySelectionType` minus the empty state. */
export type LabSelectionType = 'tests' | 'package'

/**
 * Everything gathered by the time the patient reaches Lab Selection:
 * what they're booking (from `LaboratoryCartContext`), how the sample is
 * collected, who it's for, and where. Carried as a single route param
 * rather than re-derived on each screen.
 */
export interface LabBookingDraft {
	selectionType: LabSelectionType
	collectionType: CollectionMethod
	patient: PatientProfile
	collectionAddressId: string | null
	/** Full address record for `collectionAddressId`, kept alongside the id so
	 *  later steps (Booking Summary) can show the address text without an
	 *  extra fetch — same real `PatientAddress` shape the shared
	 *  `AddressSelectionSheet` already loads, nothing invented. */
	collectionAddress: PatientAddress | null
	notes: string
	testIds: string[]
	packageIds: string[]
	/**
	 * Whether this booking still needs a laboratory + date/time slot chosen.
	 * Decided once, in `SampleCollectionScreen`, from the booking type and
	 * collection method:
	 *  - Diagnostic tests + Home Sample Collection: `false` — a lab visit
	 *    doesn't apply, so Lab & Slot Selection is skipped entirely and the
	 *    patient goes straight to Booking Summary.
	 *  - Diagnostic tests + Diagnostic Center Visit: `true`.
	 *  - Packages: always `true` (packages still need a center + slot, even
	 *    though their sample collection is home-based).
	 * `BookingSummaryScreen` and `BookingTrackingScreen` both read this to
	 * decide whether to render/require lab + appointment details.
	 */
	preferredDate?: string
	preferredTimeSlot?: string
	requiresLabSelection: boolean
}

/** Laboratory chosen in the merged Lab + Date + Slot step, carried forward
 *  to Booking Summary / Tracking. Mirrors the flat lab fields already
 *  threaded through `AppStackParamList` (see `PLACE_LABORATORY_TEST`) rather
 *  than introducing a new nested shape. */
export interface SelectedLabInfo {
	labId: string
	labName: string
	labAddress?: string
	labCity?: string
	labAvatarKey?: string | null
	labOperatingHours?: { open: string; close: string }
	labIs24x7?: boolean
}
