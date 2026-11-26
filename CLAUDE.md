# health_care_mobile/ — KarolaHealth mobile app

Part of the [healthcare2](../CLAUDE.md) monorepo (own `.git`, separate from the other two). App name "KarolaHealth", Expo slug `karola-health`, Android package `com.karolahealth.app`, Firebase project `karolahealth` (`google-services.json`). Serves patients, doctors and home-care (ancillary) providers (plus radiology staff) against `health_care_backend`.

## Stack

- React Native 0.86 on Expo SDK 57, React 19.2, TypeScript ~6.0 (strict). New Architecture; **native modules mean Expo Go does not work: use a dev build.**
- Navigation: React Navigation v7 (native-stack + bottom-tabs). UI: React Native Paper v5 plus the app's own components. No Redux: Context + hooks (`src/context/`).
- HTTP: axios through `src/services/apiService.ts`. Validation: Zod. Tokens in `expo-secure-store` (`utils/secureStorage.ts`), other data in AsyncStorage.
- Push: `@react-native-firebase/messaging`, `expo-notifications`, `react-native-notify-kit` (care-request card). Android only for the native ring (`plugins/offer-overlay/`). No iOS Firebase config.
- Tooling: ESLint 9 flat config (`eslint.config.js`), Prettier, husky + lint-staged (ESLint on staged `.ts/.tsx`), EAS (`eas.json`), CI `.github/workflows/mobile-ci.yml` (typecheck + lint). **There is no test runner.**

## Commands

```bash
npm start                                  # expo start (Metro only; needs a dev build already installed)
npm run android                            # expo run:android (builds + installs a debug build)
npm run typecheck                          # tsc --noEmit
npm run lint                               # eslint src (errors fail, the warning backlog does not)
npm run format:check                       # prettier --check "src/**/*.{ts,tsx}"  (npm run format writes)
npx expo prebuild --platform android       # applies app.json + plugins/ to the generated android/ folder
```

- `android/` and `dist/` are gitignored but **`android/` must not be wiped**: never run prebuild with `--clean` without asking.
- `npm run ios` and `npm run web` exist but are not supported targets.

## JS change or native rebuild?

- **JS / TS only, and `EXPO_PUBLIC_*` values:** Metro inlines `EXPO_PUBLIC_*` into the JS bundle. Restart with `npx expo start -c`; no native rebuild.
- **Native change** (anything in `app.json` plugins, `plugins/`, `assets/sounds/`, `assets/notification/`, a native package): `npx expo prebuild --platform android`, then `npx expo run:android`.
- **Native Kotlin lives in `plugins/offer-overlay/`**, copied into `android/` by `plugins/withOfferOverlay.js` at prebuild. Edit it there, never in `android/`.
- **Release builds refuse an `http://` API URL** (unless `EXPO_PUBLIC_ALLOW_INSECURE_HTTP=true`, test builds only). A release APK carries the URL that was in `.env` when it was built.

## Env vars

- `EXPO_PUBLIC_API_ENDPOINT` (required): backend base URL, read in `src/constants/apiUrls.ts`, which throws at import if it is blank. **Never hardcode a URL there again.** Committed `.env.example` explains emulator (`10.0.2.2`) vs device (LAN IP) addresses; `.env` is gitignored.
- `EXPO_PUBLIC_ALLOW_INSECURE_HTTP` (optional, `true` allows `http://` in a release build). `EXPO_PUBLIC_S3_BASE_URL` (optional; `utils/s3Utils.ts` falls back to a built-in bucket URL).
- EAS cloud builds cannot see `.env`: put `EXPO_PUBLIC_API_ENDPOINT` in the profile's `env` in `eas.json`.

## Folder map (`src/`)

- `features/<domain>/`: screens are `*Page.tsx` (a few `*Screen.tsx`), most with their own `components/`. Domains: `ancillary` (`patient/`, `staff/`), `appointment`, `app-update`, `auth`, `bookings`, `care-ai`, `consultation`, `dashboard`, `doctor` (`dashboard/`, `detail/`, `search/`, `book-slot/`), `events`, `health-feed`, `laboratory`, `medical-records`, `notification`, `onboarding`, `patient`, `patient-payment`, `portal`, `profile`, `radiology`, `referrals`, `settings`, `wallet`.
- `components/common/`: shared UI in sub-folders `layout/ buttons/ inputs/ display/ feedback/ booking/ location/`, all re-exported from the barrel `index.ts`. `components/layout/SidebarLayout.tsx` is the drawer.
- `services/` (`apiService.ts` + per-domain), `constants/apiUrls.ts` (**the only place for API paths**), `navigation/` (navigators, `routes.ts`, server-driven menu), `config/theme.ts` (tokens), `hooks/`, `utils/`, `types/`, `validation/`.
- Top-level `assets/` (icon, splash, `notification/`, `sounds/`), `plugins/` (Expo config plugins + `offer-overlay/` Kotlin), `index.ts` (registers background push handlers before the app mounts).

## Conventions

- Prettier: tabs, `tabWidth` 4, no semicolons, single quotes, `printWidth` 120, `endOfLine: auto`. Many files are CRLF: check with `npx prettier --check --end-of-line crlf <files>`; keep a file's existing line endings.
- Import alias `@/*` = `src/*` exists; most code uses relative imports. Route names are constants in `navigation/routes.ts`.
- **Async/await only** for API calls, never `.then()` chains. In effects: an inner `async` function with `try / catch / finally`, and an `active` flag in the cleanup for state updates.
- **Cancelling anything** (an appointment, an order, a visit, a request) uses the one `AppCancelSheet` (`components/common/booking`): the copy of each flow comes in through props (`title`, `reasons`, `reasonRequired`, `noteLabel`, `notice`, `footnote`, `choice` for "what to cancel", `children` for a flow's own block, `successTitle` / `successMessage` for the success toast, button labels) and the caller runs the cancellation in `onConfirm`, which RETURNS the result (`{ ok: true }`, or `{ ok: false, error }`): on success the sheet closes at once, says it in a success toast and runs `onDone` (refresh, go back); on failure the error shows inline in the sheet. A flow that must be acknowledged (its screen is gone, or what happens next needs explaining) sets `successStyle="screen"` for a confirmation screen instead (the home-care provider's Cancel visit). So never show a status pop-up for a cancellation, and never close the sheet yourself. Do not build another cancel modal.
- **Rescheduling** (a patient picking a new slot: doctor visit, home-care visit, lab order, any later service) uses the one `AppRescheduleSheet` (`components/common/booking`) and ends the way a cancellation does: the caller owns the dates and slots and runs the call in `onConfirm`, which RETURNS the result (`{ ok: true, data? }` or `{ ok: false, error }`); the sheet shows the spinner and blocks dismissing, then on success closes with a success toast (`successTitle`) and runs `onDone`, on failure stays open with the picked time and shows the message in red above the button (`onFailed` lets a flow reload its slots). So no status pop-up, own spinner or own toast around a reschedule, and the API call passes `skipGlobalError`. A **doctor does not pick a slot**: the doctor's side is `AskPatientRescheduleSheet` (asks the patient to choose), which ends the same way through the same hook (`useSheetOutcome`), as does the doctor's refer: both are the one `DoctorActionSheet` (`features/doctor/components`), whose content comes in through props (`reasons`, `pickDoctor`, `slotLabel`, `notice`). A sheet with its own look that runs a call uses that hook rather than its own `busy` flag and a status pop-up. Do not build another reschedule modal.
- **Where feedback goes** (one channel per event): an ERROR from inside a sheet stays in the sheet (inline, because a toast would sit behind the sheet and a status pop-up would stack a second layer on it); a SUCCESS that completes and closes is a toast, said once the sheet is gone (a cancellation: `AppCancelSheet` does it; hide a job, undo check-in, reschedule saved, notes saved); `showStatusModal` is only for a problem that blocks the user outside a sheet (session expired, no connection on load, a booking that cannot continue). Doctor (cancel appointment, decline request), patient (appointment, lab order, home-care order and visits), the home-care provider (cancel / release a visit) and the lab already do; there is no pharmacy or radiology cancel flow yet.
- **Reuse `src/components/common` first.** If nothing fits, add a reusable component in the matching sub-folder (styled with `APP_COLORS`), not a one-off inside a feature folder.
- Wrap API calls in a service function using `ApiService`; `skipGlobalError` is for calls whose screen shows its own message. Errors the user should see use `showStatusModal` or `react-native-toast-message`.
- ESLint errors gate; the React-Compiler-era hooks rules are warnings because existing code breaks them in bulk. Release bundles strip `console.*` (`babel.config.js`).
- Screens follow the server-driven menu: the backend sends keys (`GET /api/lookup/navigation`), the app maps a key to a screen. See `docs/navigation.md`.

## Navigation and auth

- `App.tsx` → `AppNavigator` shows `AuthNavigator` (login → role → onboarding → register) or the signed-in stack, from `useAuth().accessToken`. The signed-in stack starts on `MainTabNavigator` (tabs vary by role) with ~50 stack screens per domain.
- The sidebar and bottom tabs come from `GET /api/lookup/navigation` by role (keys only, never routes); `navigation/menuConfig.ts` holds the built-in `DEFAULT_MENU` used until the first answer. Details: [docs/navigation.md](docs/navigation.md).
- Auth is JWT access + refresh from `health_care_backend/app/auth`: `AuthContext` holds the session, `apiService.ts` attaches the token, refreshes it, keeps the session when only the network failed (offline, timeout, 5xx) and logs out on a real 401.

## Design system and decisions

- Screens are being redesigned to the KarolaHealth design language (the `doctor_consultation.html` family): `#2B6F71` primary header (64h, back chevron, title + subtitle), `#12373E` ink, `#F5F8F8` page with white sections, soft tone pairs for tiles and chips, 12–16 radius cards, 52h primary buttons (radius 12), bottom sheets with 20 top radius.
- **Use the tokens in `src/config/theme.ts`** (`APP_COLORS`, `TONES`, `toneAt`, `STATUS_TONES`, `CARD_SHADOW`, `formatInr`), never hardcoded hex. The Paper `theme` export there is older. Reference screens: `features/doctor/book-slot/BookSlotPage.tsx`, `features/doctor/detail/DoctorDetailPage.tsx`.
- Gotchas: a `ScrollView` sticky child's own style is replaced by RN (wrap it in a plain `View`); on Android a `PanResponder` drag must claim the touch in `onStartShouldSetPanResponder` (see `AppBottomSheet`).
- **Home care:** a patient never picks a provider; orders are matched by speciality only and the first provider to accept wins. Payment is after each visit, each visit has its own completion OTP. Booking code is named `Ancillary…` (`ancillaryProviderBookingService.ts`, `AncillaryBookVisitPage`), not "HomeCare".
- **Medicines** are ordered through LabStack (backend `docs/pharmacy-orders-labstack.md`). The old in-house pharmacy screens, the `pharmacy` role and their API paths are gone; the Pharmacy tile on Home and "Book again" for a pharmacy order only say "coming soon" until LabStack serves a pincode and the ordering screens are built.
- **A doctor has one speciality:** the detail API may still return `specialities: string[]`; treat it as one value.

## Working agreements

- **Do not commit or push unless asked.** When asked: one commit per repo, on `dev`, after checking which repo you are in.
- For bigger changes, write the plan (screens, API contract, what is reused, what is out of scope) and wait for the go-ahead first.
- Before saying done: `npx tsc --noEmit` and `npm run lint` pass. There are no tests, so say plainly what was not run on a device.
- `android/` is generated: check with the user before deleting or regenerating it.

## Feature docs

- [docs/home-care.md](docs/home-care.md): home-care patient no-show, provider Today / My visits, patient status strip.
- [docs/push-and-offers.md](docs/push-and-offers.md): push channels and taps, care-request card with Accept / Decline, native ring (own sound, overlay, lock screen).
- [docs/navigation.md](docs/navigation.md): navigators and the server-driven sidebar / tab bar.
- [docs/consultation-vitals.md](docs/consultation-vitals.md): the doctor's vitals card and sheet.
- [docs/medical-records.md](docs/medical-records.md): the patient's records list, upload and viewer.
- [docs/app-updates.md](docs/app-updates.md): the launch-time update check.
- [docs/care-ai.md](docs/care-ai.md): the Care AI chat: how a message goes to the backend chatbot, how a reply is drawn, recent chats, and what is not built yet.

## Other files

`.claude/skills/` (`api-integration`, `feature-screen`, `ui-feedback`) mirror `.gemini/skills/*.md`: keep both in sync. Root-level `*.html` design references and `review.md`, `gemini.md`, `duplicate-components.md`, `unused-code-report.md`, `provider-request-notifications.md` are dev notes, not maintained docs: check them against the code before trusting them.
