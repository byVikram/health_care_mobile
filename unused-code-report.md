# Mobile app audit: unused code, and what else turned up

Static scan of `health_care_mobile/src` on 2026-11-01 (branch `profile_vs`, after commit `2cc8450`). Nothing was changed or deleted: this is a list to decide from. Sections 1 to 5 cover unused files and routes; sections 6 to 8 cover everything else the scan turned up.

## How it was checked

- **Files:** every `import`, `export … from`, `require()` and `import()` was followed from `index.ts` and `App.tsx` across the 581 files in `src/` (tests excluded). A file nothing reaches is "unreachable". A file that is only imported by unreachable files is unreachable too.
- **Routes:** each `ROUTES.STACK.*` constant was compared with the screens `AppNavigator.tsx` registers and with every place that navigates (`ROUTES.…` references, and string-literal `navigate('Name')` calls).
- **Limits:** the scan cannot see navigation built from variables or strings, or deep links and push-notification handlers that name a screen some other way. Treat "unreachable" as "very likely dead", and confirm the items marked below before deleting.

## 1. A live bug found on the way: Communities "Explore" does nothing

`HomeCommunitiesSection` is rendered on both the patient Home (`PatientHomeScreen.tsx`) and the doctor Home (`DoctorHomeScreen.tsx`). Its "Explore" link calls `navigate(ROUTES.STACK.COMMUNITY_FORUM)`, but **no `CommunityForum` screen is registered** in `AppNavigator`. The page that would show it, `portal/CommunityForumPage.tsx`, is one of the unreachable files below. So tapping "Explore" does nothing (a "not handled" warning in dev). `dashboard/components/CommunitySection.tsx` (used by `DashboardPage`) has the same two links.

Fix options:
- **Wire it back in:** register `CommunityForum` (`CommunityForumPage`) and `CommunityThread` (`CommunityThreadPage`) in `AppNavigator`.
- **Hide it:** remove the "Explore" link and the dead screens together.

## 2. Unreachable files (55; 52 genuinely unused)

| Group | Files |
|---|---|
| **Old profile layouts and tabs** (22) | `features/profile/patient/PatientProfileLayout.tsx` + `tabs/AddressTab`, `LifestyleTab`, `MedicalTab`, `PersonalTab` |
| | `features/profile/doctor/DoctorProfileLayout.tsx` + `tabs/AchievementsTab`, `AvailabilityTab`, `EducationalDetailsTab`, `FavouriteDoctorsTab`, `MyHospitalsTab`, `PersonalDetailsTab`, `ProfessionalDetailsTab`, `SettingsTab` |
| | `features/profile/ancillary/AncillaryProfileLayout.tsx` + `tabs/AvailabilityTab`, `CapabilitiesTab`, `PersonalDetailsTab`, `ProfessionalDetailsTab`, `ServicesAndProceduresView` |
| **Portal and community** (3) | `features/portal/PortalPage.tsx`, `CommunityForumPage.tsx`, `CommunityThreadPage.tsx` |
| **Consultation** (4) | `features/consultation/components/AddVitalsModal.tsx`, `FollowUpModal.tsx`, `ScribbleNoteEditor.tsx`, `VitalsTab.tsx` |
| **Home-care** (6) | `features/ancillary/components/AppointmentSummary.tsx`, `AppointmentTrackingTimeline.tsx`, `NursePulseRadarView.tsx`, `PopularServiceCard.tsx`, `RecommendationCard.tsx`; `features/ancillary/patient/AncillaryDashboard.tsx` |
| **Dashboard and bookings** (6) | `features/dashboard/components/AncillarySelectorModal.tsx`, `CommunityBlogsSection.tsx`, `PatientHealthQuestionDetail.tsx`; `features/bookings/BookingsBottomSheet.tsx`, `components/BookingOptionCard.tsx`, `components/bookingSearchStyles.ts` |
| **Other components** (6) | `components/common/booking/AppPayment.tsx`, `components/common/inputs/DoctorHandwritingPad.tsx`, `features/doctor/components/RejectReasonModal.tsx`, `features/doctor/components/WeekSelector.tsx`, `features/doctor/search/components/ScreenCaptureTest.tsx`, `features/radiology/components/InfoRow.tsx` |
| **Auth and patient** (2) | `features/auth/WelcomePage.tsx`, `features/patient/PatientAppointments.tsx` |
| **Constants and utils** (5) | `constants/Questionmockdata.ts`, `constants/mockdata.ts`, `constants/onboardingData.ts`, `utils/patientPlaceholder.ts`, `utils/resolvePatientIdentity.ts` |
| **Type declaration files** (3, not dead) | `svg.d.ts`, `types/assets.d.ts`, `types/react-native-vector-icons.d.ts`: ambient types that nothing imports. False positives; keep. |

Check before deleting:
- **Old profile layouts and tabs:** they look replaced by the per-role profile redesign, but `CapabilitiesTab` was edited recently (the "repair the corrupted rupee signs" commit). Confirm the redesign fully replaces them.
- **`AppPayment`, `RejectReasonModal`, `WeekSelector`, `ScribbleNoteEditor`, `DoctorHandwritingPad`, `AddVitalsModal`:** may be features that were planned but never wired in, rather than leftovers.

## 3. Routes

### Declared in `ROUTES.STACK` but no screen registered (13)

| Route | Used by |
|---|---|
| `HEALTH_PROFILE`, `VIDEO_CONSULTATION`, `RESCHEDULE_APPOINTMENT`, `CANCEL_APPOINTMENT`, `RADIOLOGY_SCAN_TYPES`, `ANCILLARY_PROVIDERS`, `ANCILLARY_BOOKING_CART`, `ANCILLARY_BOOKING_SUMMARY`, `WALLET_TOPUP` | Nothing, apart from the `types.ts` param list. Dead constants. |
| `ANCILLARY_BOOKING_DETAILS`, `ANCILLARY_PAYMENT` | Only `features/ancillary/utils/bookingProgressStepperConfig.ts`, which reads their names. No screens exist. |
| `COMMUNITY_THREAD` | Only the unreachable `CommunityForumPage`. |
| `COMMUNITY_FORUM` | Live code (Home and dashboard): **the bug in section 1.** |

### Registered, but nothing navigates to it (4, plus one commented out)

| Route | Screen | Note |
|---|---|---|
| `SEARCH` (`'SplashScreen'`) | `SearchPage` | The Search tab is the live path. The stack copy is unused and its name is misleading. |
| `ANCILLARY_BOOKING_STATUS` | `TrackAppointmentPage` | A second registration of a page already registered under another route. |
| `ANCILLARY_PRICING_REVIEW` | staff `PricingReviewPage` | No navigation found. |
| `CAREGIVER_SERVICES` | `CaregiverServicesScreen` | No navigation found. |
| `SCREEN_CAPTURE_TEST` | `ScreenCaptureTest` | The registration is commented out in `AppNavigator`; the component file is unreachable. |

**Confirm first:** check whether push-notification taps (`services/pushNotificationService.ts`) or other deep links open any of the four registered routes by name before removing them. A search of the source for their string names found nothing.

## 4. Exports from the `components/common` barrel with no use outside their own file (12)

A rougher, name-based check: `ADDRESS_TAGS`, `AppScheduleTimeline`, `BOOKING_KINDS`, `FAMILY_GENDERS`, `INFO_BANNER_TONES`, `OfflineScreen`, `PackageSectionCard`, `SelectedItemCard`, `SummaryEmptyState`, `WorkingHoursDropdownSelect`, `formatElapsed`, `workingHoursDurationOptions`. Verify each with a search before removing it.

## 5. Suggested cleanup (nothing done yet)

1. Decide the Communities bug (wire the screens back in, or hide the link).
2. On a separate branch, as one commit: delete the clearly dead files in section 2 (leave the three `.d.ts` files), delete the nine zero-use route constants and their `types.ts` entries, and remove the stale commented `ScreenCaptureTest` lines.
3. Run `npx tsc --noEmit` after, and a final search of the source for each removed name.
4. Decide the four "registered but never navigated" routes and the 12 barrel exports after the confirmations above.

## 6. Worth fixing

1. **`features/auth/AccountPage.tsx` throws away what the user chose.** A `FIXME` at line ~101 says the save call is commented out, so the selected location and speciality are validated, then silently discarded, and the user is moved on believing they were saved. It also uses a raw `fetch()` instead of `ApiService`, so it skips the auth header and the shared error handling. The file is reachable, so this is live code. Fixing it changes what the screen saves, so plan it before building.
2. **Full profile payloads are logged.** `features/ancillary/ancillaryService.ts:1657` and `:1659` log the whole provider profile update and its response with `console.log`: personal data, not wrapped in `__DEV__`.
   - The app has 174 `console.log` / `console.debug` calls in total; 33 are in `ancillaryService.ts`, 10 each in `doctorService.ts` and `AppCalendar.tsx`, and 6 in `AppHeader.tsx`.
   - `review.md` lists console stripping in Babel as still open, so these logs reach production builds.
   - The patient-profile logs (`PatientProfileLayout.tsx`, 10 calls that print profile data) are in an unreachable file, so deleting that file removes them.
3. **The Communities "Explore" link goes nowhere** (section 1).

## 7. Standards drift

| Item | Count | Where |
|---|---|---|
| `.then()` chains (the team standard is async/await) | 14 | `AppSearchBar`, `LocationSheet`, `DicomViewer`, `HealthReadsPage`, `QuestionThreadPage`, `ReadArticlePage`, `AchievementsPage`, `createBookingRestrictionHook`, and others |
| `as any` casts | 94 | mostly navigation calls that bypass the typed route params |
| Two icon libraries | 189 files use `@expo/vector-icons`; 14 use `react-native-vector-icons` | `LocationSelector` is one of the 14 |
| Hard-coded `#RRGGBB` colours instead of the `APP_COLORS` tokens in `config/theme.ts` | about 3,000 occurrences in 239 files | across the app |

## 8. Clutter

- **Tracked at the repo root:** eight design-mockup files (`Doctor Dashboard.html`, `Offline & Models.html`, `ancillary-provider.html`, `doctor_consultation.html`, `login and register pages.html`, `patient_dashboard.html`, `user-profile.html`) and `metro_restart_log.txt`. They are not app code.
- **Line endings:** 34 of 582 source files are LF in the working tree while the rest are CRLF (`core.autocrlf` is on). `LabSlotPicker.tsx` is one; Git warns about it on every commit.
- **Possibly unused dependencies:** `dayjs`, `react-native-maps` and `@react-native-community/slider` are not named anywhere in `src/`, `App.tsx` or the config. `react-native-screens`, `react-native-worklets` and `react-dom` also did not show up, but they are peer requirements of React Navigation, Reanimated and Expo web, so keep them.
- **Very large files:** `ancillaryService.ts` (2,219 lines), `profile/doctor/tabs/MyHospitalsTab.tsx` (1,807; unreachable, see section 2), `ConsultationPage.tsx` (1,652), `AppointmentList.tsx` (1,648), `PharmacyOrderDetailsPage.tsx` (1,567).

## 9. Suggested order

1. Fix the two things users hit: the `AccountPage` save and the Communities link.
2. Strip or gate the `console.log` calls, starting with `ancillaryService` (and `__DEV__`-guard the ones that print payloads).
3. Do the dead-file cleanup in section 5, which also removes the `PatientProfileLayout` logging.
4. The standards drift (section 7) and clutter (section 8) can wait; the unused-dependency check is the cheapest to act on once confirmed.
