# Mobile Review — health_care_mobile (KarolaHealth)

**Date:** 2026-10-02 · **Branch:** `dev` @ `5de3fdd` · **Supersedes:** the 2026-09-15 production-hardening review (its open items and checklist are re-assessed in §2)
**Scope:** `src/` (React Native 0.86 / Expo SDK 57 / React 19.2, ~21 feature domains), tooling, docs, repo hygiene.
**Lenses:** (1) security / privacy (PHI), (2) correctness / hooks / performance, (3) developer experience.

## How this review was produced (and how far to trust it)

Three read-only review passes over the code (one per lens), followed by a spot-check of the load-bearing claims. Nothing was run on a device; `tsc --noEmit` was run and returns 0 errors. `android/` was not readable by the security pass, so native manifests were not inspected.

- **✔ Verified** = I re-read the cited code or re-ran the grep/count myself afterwards.
- **Reported** = read from code by the review pass with file:line, not independently re-checked.
- One claim was **wrong and is excluded**: "`android/` is not gitignored" — `/android` and `/ios` are in `.gitignore`.

## 1. Executive summary

The app has a clear feature-based structure, a growing shared component library (`components/common`) with design tokens, typed navigation, secure token storage as the primary store, a correct single-flight token refresh, an offline short-circuit, and zero TypeScript errors in strict mode.

The risks cluster in five places:

1. **PHI leaves the device or sits on it unprotected**: ~323 `console.*` calls (many print profile payloads / request bodies) and no console stripping in release builds; PHI cached in plain `AsyncStorage`; a `SecureStore` failure silently falls back to plaintext token storage; cleartext HTTP/WS is not prevented in release.
2. **The ancillary WebSockets connect with no auth token** (the server side also doesn't require one — see the backend review S-1), and the screens that use them have no reconnect and double-navigation races.
3. **The API layer has no timeout and shows a global "API Error" modal on every non-401/403 failure**, which stacks on top of local error UI (including from 2-second pollers).
4. **Quality gates are absent**: no test runner (the only "test" asserts against an inline copy of a function), no lint, no CI, no crash reporting.
5. **The previous review's "complete" checklist no longer matches the code** (design tokens, `as any`, monolith decomposition) — see §2.

## 1a. P0 remediation applied (2026-10-02)

Verification: `npx tsc --noEmit` returns **0 errors**. **None of this has been run on a device or in a release build** - see "Unverified" below.

| Item | What changed |
| :--- | :--- |
| S-3 PHI in logs | `babel.config.js` now adds `transform-remove-console` under `env.production` (new devDependency `babel-plugin-transform-remove-console`), so release bundles contain no `console.*` calls. The ~323 development logs themselves are still in the source. |
| S-1 cleartext | `constants/apiUrls.ts` throws at startup if `EXPO_PUBLIC_API_ENDPOINT` is not `https://` when `!__DEV__` (and `ws://` becomes `wss://` as a result). Removed a commented-out hardcoded LAN IP. |
| S-5 secure storage | `utils/secureStorage.ts` fails closed: on native, if the keystore errors or is missing, tokens are held **in memory only** (the session ends with the app process) and are never written to AsyncStorage. Web (unsupported target) keeps AsyncStorage. |
| S-6 / S-7 logout | New `utils/localSession.ts` (`purgeLocalSession` + the single list of user-data AsyncStorage keys). Used by both `AuthContext.clearAuth` and the forced logout after a rejected refresh; it also clears `ancillary_subspecialty_id` and `ancillary_setup_completed`, which neither path used to clear. |
| S-8 refresh | `apiService` now distinguishes `ok` / `rejected` / `unavailable`. Only a 4xx from the refresh endpoint (excluding 408/429) or a missing refresh token ends the session; offline, timeout and 5xx keep the session and just fail the request. |
| C-1 timeout | Default axios timeout 30 s; multipart (`FormData`) requests get 120 s; the refresh call is also bounded. |
| C-2 global error modal | New per-request flag `skipGlobalError`, and identical global dialogs within 4 s are collapsed. Both 2-second pollers (`TrackAppointmentPage`, `ServiceMatchingPage`) pass it. |
| S-2 / C-3 WebSockets | New `utils/authedSocket.ts`: sends `{"type":"auth","token":...}` as the first frame (the token is never in the URL), swallows `AUTH_OK`, reconnects with exponential backoff (1 s up to 30 s) and stops on the server's 4401/4403/4404. Both screens use it; `ServiceMatchingPage` no longer opens a socket without a booking id (the `'active'` key no longer exists server-side) and relies on its polling instead. |
| S-4 DICOM WebView | The three pinned CDN scripts now carry `integrity="sha384-..."` + `crossorigin="anonymous"`; the WebView uses `originWhitelist={['about:*']}`, `allowFileAccess={false}`, `domStorageEnabled={false}`, `mixedContentMode="never"`, and the message logger is `__DEV__`-only. |

**Not done / still open:** PHI cached in plain AsyncStorage (`user`, `current_location`; the rest of S-6), the `Linking.openURL` scheme allowlist (S-9), presigned S3 URLs (S-10), the double-navigation race and stale closures in the tracking screens (C-4 and the section 4 Medium items), `AuthContext` memoisation, and everything in section 6 (tests, CI, crash reporting). The README run instructions were corrected in the same pass (dev-client flow; `.env.example` added and un-ignored).

**Unverified (needs a device / release build):**
- The WebSocket handshake end to end against the updated backend.
- That the DICOM viewer still renders with SRI and the tightened WebView props (a wrong hash or a blocked resource would show as an empty viewer).
- That a release build really strips `console.*`, and that the https assertion does not trip your release pipeline (a release build pointed at an `http://` URL now fails at launch - intended).
- That the 30 s timeout is long enough for your slowest real endpoints.

**Deploy note:** this build must go out together with the backend that implements the WebSocket handshake (see the backend review, section 1a). Against an old backend the sockets simply never authenticate and the screens fall back to polling.

---

## 2. Status of the 2026-09-15 review

### Open Phase 4/5 items

| Item | Status | Evidence |
| :--- | :--- | :--- |
| `transform-remove-console` for release builds | **Open** — 323 `console.*` calls in 105 files | `babel.config.js`; grep ✔ |
| Convert heavy `ScrollView` lists to `FlatList`/`FlashList` | **Partly done** — 35 files use virtualized lists; 594 `.map(` render sites remain, which of them sit in long lists was not audited | Reported |
| Clean unmount of WebSockets / timers | **Mostly good** — intervals cleared and `ws.close()` on unmount in the screens read; gaps are reconnect/backoff and stale closures (§4) | Reported |
| Skeleton loaders on initial fetches | **Partial** (e.g. `RowSkeletons` in the ancillary catalogue); not audited app-wide | Reported |
| Jest + React Native Testing Library | **Open** — no runner; the single "test" is a no-op (§5) | ✔ |

### Checklist items marked done that do **not** hold today

| Previously ticked | Reality now |
| :--- | :--- |
| "Hex colors consumed exclusively from `src/config/theme.ts`" | **4,028** hardcoded `#RRGGBB` in `src/features` + `src/components` ✔. Worst: `DoctorAppointments.tsx` (107), `PharmacyOrderDetailsPage.tsx` (98), `laboratory_duplicated/PlaceLabOrderPage.tsx` (80), `AncillaryDashboard.tsx` (79), `TrackAppointmentPage.tsx` (71) |
| "Unsafe `as any` refactored" | **293** `: any` / `as any` occurrences |
| "Monolithic files decomposed" | **14+** files over 1,000 lines ✔: `ancillaryService.ts` 2,186, `DoctorAppointments.tsx` 1,847, `MyHospitalsTab.tsx` 1,807, `AppointmentList.tsx` 1,602, `PharmacyOrderDetailsPage.tsx` 1,567, then ~9 more at 1,040–1,540 |
| "Zero `console.log` output sensitive data" | Tokens are no longer logged, but full profile/request/response bodies are (S-3 below) |
| Naming standardised to `*Page.tsx` | 82 `*Page.tsx` vs 20 `*Screen.tsx`; a `laboratory_duplicated/` folder exists beside `laboratory/` ✔ |

These checkboxes should be treated as historical, not as a current quality gate.

### Fixed since the last review (this session)

- **Duplicate fetches after login** — `SidebarLayout` avatar-sync effect depended on the value it updates and on an unstable `updateUser`; `DashboardPage` passed an inline `onRefreshComplete` into a child effect's dependency array. Both fixed (effect scoped to `[role, ancillarySpecialty]`; callback memoised with `useCallback`).
- **Catalogue row bullet points invisible** — `AppCatalogItemRow`'s `points` block didn't stretch inside a `alignItems:'flex-start'` column, so its `flex:1` text collapsed; fixed with `alignSelf:'stretch'`.

## 3. Security and privacy findings

### High

| ID | Finding | Where | Verified |
| :--- | :--- | :--- | :--- |
| S-1 | **Cleartext transport is not prevented.** `BASE_URL` only strips trailing slashes; no https assertion for release builds; WebSocket URLs derive `ws://` from the same base; `app.json` sets no cleartext/ATS policy. Dev `.env` uses `http://`. **Fix:** assert `https` when `!__DEV__`; set `usesCleartextTraffic:false` for release. | `constants/apiUrls.ts:8,268-270`; `app.json` | ✔ (WS derivation, no token); manifest not inspected |
| S-2 | **WebSockets carry no auth token.** Patient request socket is opened with only the booking id; it pushes verification OTP, completion PIN, address and ETA. `ServiceMatchingPage` also falls back to the id `'active'`. Server side currently accepts unauthenticated clients (backend S-1). **Fix:** short-lived WS ticket sent in the first message; server checks ownership. | `TrackAppointmentPage.tsx:270-271`; `ServiceMatchingPage.tsx:95-96` | ✔ (no token in URL / `new WebSocket`) |
| S-3 | **PHI in logs, not stripped in release.** 323 `console.*` in 105 files. Worst: `PatientProfileLayout.tsx:52,66,147,152` (full profile `JSON.stringify`), `PatientProfileService.ts:116` (PATCH payload), `doctorService.ts:131,143,299,312,559,602`, `ancillaryService.ts:1597-1645` (provider profile, `error.config.data` = request body, `error.response.data`), `PharmacyOrderDetailsPage.tsx:679` (order incl. prescription images), `ConsultationService.ts:176`, `PatientPayment.tsx:260`. **Fix:** `babel-plugin-transform-remove-console` under `env.production` plus a `__DEV__`-gated logger; delete payload/response logs. | `babel.config.js`; files listed | ✔ (counts, no plugin); per-line reported |
| S-4 | **DICOM WebView is over-permissive and loads third-party scripts without SRI.** `originWhitelist={['*']}` ✔, `allowFileAccess`, `mixedContentMode="always"`, `domStorageEnabled`; three scripts from `cdn.jsdelivr.net` run in the same page that receives base64 DICOM (PHI) via `postMessage`. **Fix:** bundle scripts locally (or pin + SRI); whitelist `about:*`; disable file access and mixed content. | `consultation/components/DicomViewer.tsx:79-83,262,288-294` | ✔ (`originWhitelist`); rest reported |

### Medium

| ID | Finding | Where | Verified |
| :--- | :--- | :--- | :--- |
| S-5 | **`SecureStore` failure falls back to plaintext `AsyncStorage`** for tokens, with a warning only under `__DEV__` (the file's own `FIXME` admits it). **Fix:** fail closed or keep in memory; never persist tokens to AsyncStorage. | `utils/secureStorage.ts:25-66` | ✔ |
| S-6 | **PHI persisted in unencrypted AsyncStorage**: `user` (name, email, avatar), `current_location` (address + lat/long), `user_specialty`. | `context/AuthContext.tsx:112,131,197,216` | Reported |
| S-7 | **Logout leaves data behind.** `clearAuth` removes a fixed key list; the forced-logout path after refresh failure removes only `role`/`user`, leaving `current_location`, `user_specialty`, etc. `clearAuth` swallows the server-logout error. **Fix:** one shared `purgeLocalSession()` with a namespaced key list. FCM token deregistration on logout not verified. | `AuthContext.tsx:221-249`; `apiService.ts:186` | Reported |
| S-8 | **Transient network failure during token refresh hard-logs the user out.** `performTokenRefresh` returns `null` on *any* error (including offline) and the caller then logs out. **Fix:** log out only when the refresh endpoint answers 401/403. | `services/apiService.ts:76-100,156-186` | ✔ (returns null on any catch); caller behaviour reported |
| S-9 | **API-supplied URLs go straight to `Linking.openURL` with no scheme allowlist** (`target.url`, `media_url`, `registration_link`, consultation `url`); offer `target.params` passed to `navigation.navigate`. **Fix:** allow `https:` (plus `tel:`/`mailto:` where intended) and a fixed route allowlist. | `HomeOffersSection.tsx:103-106`; `HomeHealthReadsSection.tsx:90`; `EventSection.tsx:111`; `EventDetailsPage.tsx:116`; `AllEventsPage.tsx:165`; `ConsultationPage.tsx:529` | Reported |
| S-10 | **Prescription/consultation files opened from a guessable public S3 URL** (`https://healthcare-s3-bucket.s3.amazonaws.com/<key>`). Bucket policy unverified; prefer presigned URLs from the backend. | `utils/s3Utils.ts:1-13`; `ConsultationPage.tsx:885` | Reported |

### Low

Hardcoded test UPI id and payee name in `AppPayment.tsx:17-20`; `DicomViewer.tsx:296` logs every WebView message; `ACCESS_FINE_LOCATION` requested where coarse may suffice (`app.json:28-33`); no `expo-screen-capture` protection active on prescription/DICOM screens; a `ScreenCaptureTest` placeholder is commented out in `AppNavigator.tsx`.

**Verified clean:** no `dangerouslySetInnerHTML`-style patterns, no Clipboard use, no token/OTP logging, no real secrets in source (`google-services.json` holds a placeholder key), no deep-link handlers registered, `.env` is gitignored ✔. **Not verified:** Android manifest/cleartext flags, push-payload handling location, whether FCM token is cleared on logout.

## 4. Correctness, hooks and performance findings

### High

| ID | Finding | Where | Verified |
| :--- | :--- | :--- | :--- |
| C-1 | **No axios timeout.** `axios.create({ paramsSerializer })` sets none, so the `ECONNABORTED` branch never fires unless a caller passes one; a hung request means an indefinite spinner. **Fix:** default 15–30 s. | `services/apiService.ts:39` | ✔ |
| C-2 | **Global "API Error" modal on every non-401/403 error**, stacking on top of screens' own error UI/toasts. The 2-second pollers (`TrackAppointmentPage:329`, `ServiceMatchingPage:189`) can re-open it every poll on a 500. Whether the modal dedupes is unverified. **Fix:** per-request `skipGlobalError` flag and/or modal dedupe. | `apiService.ts:221-227` | ✔ |
| C-3 | **WebSockets have no reconnect/backoff, and run alongside 2 s polling** (~30 req/min per screen). No `onclose`/`onerror` handlers. Cleanup on unmount *is* correct. **Fix:** small WS helper with backoff; poll slower (≈10 s) while the socket is open. | `TrackAppointmentPage.tsx:271-281,329`; `ServiceMatchingPage.tsx:96-120,189` | ✔ (no handlers / poll); rest reported |
| C-4 | **Double navigation in `ServiceMatchingPage`:** the WS handler (:109) and the poller (:172) each schedule `navigation.replace(TRACK_APPOINTMENT)` after 400 ms with separate timers, so both can fire. **Fix:** shared "navigated" ref. | `ServiceMatchingPage.tsx:109,172` | Reported |

### Medium

- **`TrackAppointmentPage` effect closes over stale state** — deps are `[bookingId]` only but it reads `liveProvider`, `liveServiceTitle`, `liveAddress`, `bookingData`; `navigation.replace` at :297/:319 has no mounted check; `fetchStatus` can run concurrently with itself (2 s interval, no in-flight guard). Use refs + an in-flight guard. (`:233-340`)
- **`AuthContext` is not memoised** — provider value object and `updateUser`/`clearAuth`/`setAuth`/`setCurrentLocation`/… are re-created every render, re-rendering all 53 `useAuth` consumers; `updateUser` closes over `user` and can drop updates if called twice in one tick (use functional `setUser`). No effect currently loops on them (`useBookingLocation` and `ClinicSwitcher` are safe only because of `[]` deps / eslint-disable), so it is fragile rather than broken. (`context/AuthContext.tsx:110,209,220,254-275`)
- **`DashboardPage` doctor fetches have no cancel/stale guard** — fast `selectedDate` switches can let an older response overwrite a newer one; debug `console.log`s at :150,154,157. (`DashboardPage.tsx:144-190`)
- **`.then()` chains in effects violate the team's async/await standard** (≈25 occurrences in 20 files), most without unmount guards: `DoctorHomeScreen.tsx:224-232`, `WorkDocumentsPage.tsx:129,139`, `ProfessionalDetailsPage.tsx:105,108`, `PlaceLabOrderPage.tsx:475`, `ConsentForm.tsx:46`, `MyDoctorPage.tsx:218`, `AppointmentDetailsContent.tsx:305`, `AppointmentActionSheet.tsx:118`, `AccountPage.tsx:57-58`, `ProfessionalDetailsTab.tsx:563`.
- **`DoctorHomeScreen` fetches `getAppointments({limit:100})` only to count pending requests** (`:221-233`) — heavy payload; use a count endpoint or shared cache (duplicate fetch in `DoctorEngageScreen` unverified).
- **Swallowed errors in ancillary tracking** — empty `catch` at `TrackAppointmentPage.tsx:359-361`; status-fetch failure only logged (:307-308), so no error state; `ServiceMatchingPage.tsx:218-224` `handleCancelRequestWithReason` has no `try/catch` (stuck `isCancelling`, unhandled rejection). 10 single-line empty catches elsewhere (`AppCalendar.tsx:277`, `DicomViewer.tsx` ×7, `ServicesAndProceduresView.tsx:69,75`).

### Low

`ProviderTodayContent.tsx:94-101` has `onRefreshComplete` in effect deps — safe only while the parent keeps its `useCallback([])` (documented in a comment); a future inline prop would cause a refetch loop. Heavy inline renders in `AncillaryDashboard.tsx`/`ConsultationPage.tsx` unmeasured.

**Metrics:** `tsc --noEmit` 0 errors ✔; 293 `any`; 14+ files >1,000 lines ✔; 323 `console.*` ✔; 35 files use FlatList/FlashList/SectionList.

## 5. What is done well

- Strict TypeScript, zero compile errors; feature-based layout; shared `components/common` split into `layout/buttons/inputs/display/feedback/booking/location` with a barrel export and design tokens in `config/theme.ts`.
- Tokens in `expo-secure-store` as the primary store; **single shared in-flight refresh promise** (concurrent 401s make one refresh call, one retry per request, raw `axios.post` so it can't recurse); offline short-circuit; clean network-error messages; array params serialised for FastAPI; 403 body log gated by `__DEV__`; `clearAuth` revokes the refresh token server-side best-effort.
- Root `ErrorBoundary`, `NetworkContext` + `OfflineBanner`, toast helpers.
- Intervals/timers read are cleared on unmount (`AppTimerBadge`, `ProviderTodayContent`, `useLiveLocationShare`, `AncillaryRequestSentPage`, `NursePulseRadarView`); home dashboard no longer double-fetches and `useHomeChromeData` caches are cleared on logout.
- Spot-checked shared layout components (`AppProviderCard`, `ProviderDetailsCard`, `AppInfoBanner`) already guard `flex:1` text columns with `minWidth:0`.
- `README.md`/`CLAUDE.md` are candid about gaps; utilities are small modules (`date`, `formatters`, `jsonUtils`, `slots`) that are easy to test.

## 6. Developer experience

| Area | Finding | Severity |
| :--- | :--- | :--- |
| Running the app | `README.md` tells new developers to `npm start` and scan a QR with **Expo Go**. The app needs a dev client / native build (`@react-native-firebase/*`, `expo-speech-recognition`, `expo-screen-capture`, `react-native-maps`, custom `google-services.json`). Scripts are `expo run:android/ios`. No `eas.json`; `android/` exists locally (ignored) with no prebuild instructions. **The README rewritten earlier in this session still carries the original Expo Go steps — fix pending.** | High |
| Tests | No `jest`/`jest-expo`/RNTL; no `test`, `lint` or `typecheck` scripts. `src/features/wallet/__tests__/` has `WalletScreen.test.ts` (defines `formatWalletCurrency` inline and checks it with `console.assert` — tests a copy, not app code) and `WalletScreen.test.tsx`. Best first targets: `utils/formatters.ts`, `date.ts`, `slots.ts`, `jsonUtils.ts`, `s3Utils.ts`, `resolvePatientIdentity.ts`, the zod `authSchemas`, and `ApiService` 401-refresh logic (mock axios). | High |
| Design system adoption | 4,028 hardcoded hex colours vs `APP_COLORS`/`TONES` (§2). The documented redesign direction is not enforced by any tool. | High |
| File size | 14+ files over 1,000 lines (§2) — hard to review/merge; raises the cost of the redesign. | High |
| Imports | 737 imports use `../../../` or deeper; `tsconfig.json` has no `paths`. Add `@/*` (Expo SDK 57 resolves tsconfig paths). | Medium |
| Duplicate / drifting features | `features/laboratory` beside `features/laboratory_duplicated` (4 Page-style files, 3 over 1,200 lines) — which is live is unclear. 82 `*Page` vs 20 `*Screen`. | Medium |
| Service layering | Direct network calls bypassing `ApiService`: `components/common/inputs/DoctorHospitalDropdown.tsx:45` (axios), `components/common/location/LocationScreen.tsx:52` (fetch), `features/auth/AccountPage.tsx:56` (fetch + commented block saying it "bypasses auth-header injection"), `features/consultation/ConsultationPage.tsx:492` (fetch of an S3 key). Some may be intentional (public/S3) but are undocumented. | Medium |
| Onboarding | `EXPO_PUBLIC_API_ENDPOINT` throws at import if unset and there is no `.env.example`. `google-services.json` is tracked (deliberate or not, it should be a documented choice). | Medium |
| Tooling | No ESLint/husky/lint-staged; Prettier config exists but no `format` script, and some files are 2-space (so it isn't applied consistently). `babel.config.js` lists the reanimated plugin explicitly — with Reanimated 4 the worklets plugin is what's required (confirm `babel-preset-expo` already adds it). | Medium |
| Observability | Root `ErrorBoundary` only (no per-screen boundaries); **no crash reporting** (no Sentry/Crashlytics) for a healthcare app; raw `console.*` with no logger wrapper or levels; no feature-flag mechanism. | Medium |
| Dependency health | Loose carets on `expo`, `@react-native-firebase/*`, `react-navigation`; `@react-native/metro-config ^0.85.2` vs `react-native 0.86.3`; both `react-native-vector-icons` and `@expo/vector-icons`; `react-native-web`/`react-dom` installed (is web a target?). Unused-dependency check and `expo install --check` not run. | Low |
| Repo-root clutter | Tracked mockups at the root: `Doctor Dashboard.html`, `Offline & Models.html`, `doctor_consultation.html`, `patient_dashboard.html`, `user-profile.html` ✔ (plus untracked `ancillary-provider.html`); also `gemini.md`, `tsc_full_output.txt`, `mobile_tsc_out.txt`, `metro_restart_log.txt`. Move mockups to `docs/design/`, delete the logs. | Low |
| Docs | No navigation/param-type docs; `CLAUDE.md` and `README.md` otherwise accurate. | Low |

**Quick wins (≤1 day each):** (1) rewrite README run steps to the dev-client flow, add `.env.example` and an `eas.json` development profile; (2) add `jest-expo`, `npm test`, `typecheck`, and replace the fake wallet test with tests for formatters/date/slots/jsonUtils/zod schemas; (3) add `@/*` path alias and a `format` script; (4) tidy root clutter and resolve `laboratory_duplicated`; (5) add a default axios timeout and a release-only console stripper + `__DEV__` logger, and add crash reporting (Firebase is already a dependency).

## 7. Recommended action plan

**P0 — before wider release**
1. Strip `console.*` in release builds and delete the payload/response/profile logs (S-3).
2. Enforce `https`/`wss` in release (S-1); authenticate the WebSockets with a short-lived ticket once the backend supports it (S-2).
3. Make `secureStorage` fail closed (S-5); purge all local PHI on every logout path through one function (S-6, S-7); don't log out on transient refresh failures (S-8).
4. Lock down the DICOM WebView and bundle its scripts (S-4).
5. Add a default axios timeout and a way to suppress the global error modal per request; dedupe it (C-1, C-2).

**P1 — next sprint**
6. WebSocket helper with reconnect/backoff, shared "navigated" ref, in-flight guards, and fix `TrackAppointmentPage` stale closures (C-3, C-4 and §4 Medium).
7. Memoise `AuthContext` (value + callbacks) and use functional `setUser`.
8. URL/route allowlists for `Linking.openURL` and offer params (S-9); presigned S3 URLs (S-10).
9. Test runner + CI (typecheck, tests, lint); crash reporting; dev-client README.

**P2 — hygiene**
10. Migrate hex colours to `APP_COLORS` per screen as each is redesigned; split the 1,000+-line files (start with `ancillaryService.ts`, `DoctorAppointments.tsx`, `MyHospitalsTab.tsx`); convert remaining `.then()` chains to async/await with unmount guards; add path aliases; remove `laboratory_duplicated`; route direct `fetch`/`axios` call sites through `ApiService` or document them; refresh the stale checklist items in this file as they are fixed.

## 8. Not verified in this review

Behaviour on a physical device (low-end Android, iOS); Android manifest/cleartext flags; server-side WebSocket auth (see backend review) and S3 bucket policy; push-notification payload handling; FCM token cleanup on logout; which of the 594 `.map(` sites render long lists; remaining ~100 `useEffect`+fetch call sites outside the files named above; unused-dependency analysis.
