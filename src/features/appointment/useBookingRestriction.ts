// src/features/appointment/useBookingRestriction.ts
//
// Whether online booking of a doctor appointment is paused for the signed-in patient (patient no-show policy). See
// hooks/createBookingRestrictionHook.ts for how it is fetched.

import { createBookingRestrictionHook } from '../../hooks/createBookingRestrictionHook'
import { getBookingRestriction } from '../../services/appointmentService'

export const useBookingRestriction = createBookingRestrictionHook(getBookingRestriction)
