// src/features/ancillary/hooks/useAncillaryBookingRestriction.ts
//
// Whether booking of ANY home-care service (instant or scheduled) is paused for the signed-in patient (the home-care
// no-show policy). The doctor appointment pause is separate: see features/appointment/useBookingRestriction.ts.

import { createBookingRestrictionHook } from '../../../hooks/createBookingRestrictionHook'
import { getAncillaryBookingRestriction } from '../ancillaryNoShowService'

export const useAncillaryBookingRestriction = createBookingRestrictionHook(getAncillaryBookingRestriction)
