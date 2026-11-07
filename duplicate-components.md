# Duplicate and unused components (mobile)

Branch: `remove-dead-components` (from `dev`). Started 2026-11-07.
Status: **step 1 done (not committed yet), step 2 not started.**

## Why

A scan of the 582 source files in `src/` (every pair compared by code structure, copied text and `StyleSheet` blocks, limited to files
the app really reaches from `index.ts` / `App.tsx`) showed that `src/components/common` itself is fairly clean. The duplication is next to
it: screens that copy each other, and screens that rebuild shared components locally.

## Findings

### 1. Pharmacy and radiology are near-copies (largest, live code)

| Pharmacy file | Radiology twin | Structure alike | Lines that differ |
|---|---|---|---|
| `profile/pharmacy/PharmacyProfileLayout` (260 lines) | `profile/radiology/RadiologyProfileLayout` | 96% | 56 |
| `profile/pharmacy/tabs/SettingTab` (324) | `profile/radiology/tabs/SettingTab` | 98% | 82 |
| `profile/pharmacy/tabs/PersonalDetailsTab` (521) | `profile/radiology/tabs/PersonalDetailsTab` | 86% | 88 |
| `profile/pharmacy/tabs/PharmacyDetailsTab` (682) | `profile/radiology/tabs/RadiologyDetailsTab` (654) | 88% | not diffed |
| `profile/pharmacy/tabs/ServicesTab` (622) | `profile/radiology/tabs/ServicesTab` (722) | 44% | not diffed |
| `pharmacy/OrderListPage` (997) | `radiology/OrderListRadiologyPage` (885) | 59% | not diffed |
| `pharmacy/components/PharmacyCard` (192) | `radiology/components/RadiologyCard` (181) | 59% | not diffed |
| `types/pharmacy-profile-api` | `types/radiology-profile-api` | 56% | not diffed |

About 3,700 lines on the pharmacy side have a close twin in radiology. Where it was diffed, the differences are labels and a few
settings (for example the notification toggles).

### 2. Feature screens rebuild shared components locally

- Profile tabs define their own `FieldLabel`, `InputField`, `FormRow`, `SelectDropdown`, `UploadBox`, `SectionTitle`,
  `MultiSelectDropdown`, `DobPickerField` (up to 12 files each) although `AppFormField`, `AppInput`, `AppSelect`, `AppMultiSelect`
  and `AppPhotoPicker` exist.
- `InfoRow` (3 live files), `DetailRow` (`HomeCareVisitView`), `SectionCard` (4 files) instead of `AppDetailRow` / `AppSection` / `AppSoftCard`.
- About ten local skeleton components instead of `AppSkeleton`.
- Local chips, badges and toggles (`StatusChip`, `BookingStatusBadge`, `ToolbarChip`, `FilterToggle`, `AllModeToggle`, `Toggle`,
  `ToggleRow`), two `EmptyState`, two `ImageViewerModal`, `RejectConfirmModal` instead of `AppConfirmSheet`.
- A raw `<Modal>` in 21 live files and a raw `<TextInput>` in 20 (several are "Sheet" screens such as `BookingRequestSheet`,
  `IncomingOfferSheet`, `StartCodeSheet`). No raw `<Switch>`: `AppToggle` is used.

### 3. Look-alike pairs in live code

`AncillaryBookNowReviewPage` / `AncillaryReviewPayPage` (44%), `CompletedBookingCard` / `UpcomingBookingCard` (49%),
`ArticleSection` / `PodcastsSection` (49%), `BlogsSection` / `CommunitySection` (45%), `DeclineOrderSheet` / `ReportIssueSheet`
(styles 68%), `AppPromoCard` / `HomeOffersSection` (styles 73%), `AlliedSelcetorModel` / `TherapeuticSelector` (same component,
different data; file names are misspelled), `blogService` / `qaService` / `communityService` (same request pattern, about 57%).

### 4. Inside the shared library

Only mild overlap: `AppSelect` / `AppMultiSelect` (43% structure, 65% styles), `ConsultationNotesImage` / `PrescriptionPreview` (33%),
`SelectionRowCard` / `AddressCardItem` (31%). Families that overlap in purpose, judged by name only (not measured): chips
(`AppChip`, `AppChipGroup`, `AppChipPicker`, `AppActionChip`, `AppTag`), tabs (`AppTabs`, `AppPillTabs`, `AppSegmentedControl`),
footers (`AppFooterBar`, `AppSaveFooter`, `AppStickyFooter`).

## Step 1: delete dead files (done)

Done on this branch, not committed. Checked with `npx tsc --noEmit` (clean) and ESLint (0 errors; the 588 warnings are the existing backlog).

**47 unreachable files deleted** (nothing imported them):

- Old profile layouts and tabs, 20 files: `profile/doctor/DoctorProfileLayout` and its 8 tabs, `profile/ancillary/AncillaryProfileLayout`
  and its 5 tabs / views, `profile/patient/PatientProfileLayout` and its 4 tabs.
- Consultation, 3: `AddVitalsModal`, `FollowUpModal`, `VitalsTab`.
- Home-care, 6: `AppointmentSummary`, `AppointmentTrackingTimeline`, `NursePulseRadarView`, `PopularServiceCard`,
  `RecommendationCard`, `AncillaryDashboard`.
- Dashboard, 3: `AncillarySelectorModal`, `CommunityBlogsSection`, `PatientHealthQuestionDetail`.
- Bookings, 3: `BookingsBottomSheet`, `BookingOptionCard`, `bookingSearchStyles`.
- Doctor, 3: `RejectReasonModal`, `WeekSelector`, `doctorFormatters`.
- Pages, 3: `auth/WelcomePage`, `patient/PatientAppointments`, `portal/PortalPage`.
- Radiology, 1: `radiology/components/InfoRow`.
- Constants and utils, 5: `Questionmockdata`, `mockdata`, `onboardingData`, `patientPlaceholder`, `resolvePatientIdentity`.

**5 unused shared components deleted** (6 files) (no users anywhere, including `App.tsx`; their exports removed from `components/common/index.ts`):
`AppTable` (and `AppPagination`, which only it used), `SelectedItemCard`, `SummaryEmptyState`, `PackageSectionCard`,
`AppScheduleTimeline`. The deleted files stay in git history.

**Kept on purpose**

- `features/dashboard/components/AllSpecialitiesPage.tsx`: switched off (commented out) in `AppNavigator`, with the Search page taking over.
- `features/portal/CommunityForumPage.tsx` and `CommunityThreadPage.tsx`: the Communities "Explore" link on Home navigates to a
  `CommunityForum` route that has no screen; wiring these pages back in is one of the options, so they stay until that is decided.
- `features/consultation/components/ScribbleNoteEditor.tsx`: the doctor's scribble editor with its speech-to-text mode
  (`expo-speech-recognition`). Nothing imports it today, because the voice feature is commented out in `ConsultationPage.tsx` and in
  `care-ai/useVoiceInput.ts` until the native module is available, and it must stay. It was deleted by mistake in the first run of
  step 1 and restored from git.
- `components/common/inputs/DoctorHandwritingPad.tsx`: unused, but part of the doctor handwriting / scribble area; kept until the
  team decides (it has no speech code).
- `components/common/booking/RollingDateSlotPicker.tsx`: an earlier version of this scan listed it as unused because it was searched by
  file name; it exports `DateStrip` and `SlotChipGrid`, which 5 and 7 screens use.

## Not done yet

### Step 2: merge pharmacy and radiology (planned, not started)

One provider-profile module (layout and tabs driven by a small config: labels, notification toggles, service lists), and one shared
order list and card. Biggest saving (about 3,700 lines) but needs a plan first, because both are live screens.

### Later

- Replace the local helper components of section 2 with the shared ones, a few files at a time, when a screen is touched.
- Move raw `<Modal>` sheets onto `AppBottomSheet` / `AppModal` / `AppConfirmSheet`, and raw `<TextInput>` onto `AppInput` / `AppFormField`.
- Tidy the look-alike pairs of section 3 and the `AppSelect` / `AppMultiSelect` base.
- Review the overlapping families of section 4 (chips, tabs, footers) and decide which to keep.

## Open decisions

1. **Communities "Explore" link** (broken today): register a `CommunityForum` screen (reusing the two kept pages) or hide the link.
2. **`AllSpecialitiesPage` and the 28 specialty images** (32 MB in `src/assets/specialties/`): delete, or keep switched off.
3. **Unreferenced assets**: 97 image and media files (45 MB) in `src/assets/` are not imported by any live file; 29 MB of that is
   `specialties/` (only used by the switched-off page), then `blog-and-community` 8.0 MB, `Pharmacy/Prescription.svg` 2.7 MB,
   `Banner` 2.1 MB. They are not in the APK (only imported assets are bundled), only in the repo. Checked by file name, so confirm
   before deleting.
4. **Unused route constants** (9 declared in `ROUTES.STACK` with no screen) and the stale commented `ScreenCaptureTest` lines: see
   `unused-code-report.md`.

## Method and limits

Similarity was measured on code structure with names and values blanked (so it shows how alike two files are built), on copied text,
and on `StyleSheet` blocks. It misses duplicates that look different but do the same job. "Unused" means not reachable through
`import` / `export from` / `require` / `import()` from `index.ts` and `App.tsx`; navigation built from strings or variables is not seen.
