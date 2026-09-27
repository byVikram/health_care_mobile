# health_care_mobile/ — Mobile App (React Native + Expo)

Part of the [healthcare2](../CLAUDE.md) monorepo. See root CLAUDE.md for cross-service context. App name: "KarolaHealth" (`app.json` slug `karola-health`, Android package `com.anonymous.KarolaHealth`). Has its own `.git` repo, separate from the rest of `healthcare2`.

## Stack

- React Native 0.86 on Expo SDK 57, React 19.2, TypeScript ~6.0 (strict mode)
- Navigation: React Navigation v7 (native-stack + bottom-tabs)
- UI: React Native Paper v5 (`PaperProvider`)
- HTTP: axios (custom instance with interceptors)
- Validation: Zod (`src/validation/authSchemas.ts`)
- Storage: `secureStorage.ts` wraps `expo-secure-store` for tokens (`access_token`/`refresh_token`); `@react-native-async-storage/async-storage` used for non-sensitive data. Network: `@react-native-community/netinfo` (backs `NetworkContext`/`OfflineBanner`)
- Native/Expo modules: camera, location, audio, video, speech-recognition, image-picker, file-system, device, screen-capture, maps, webview, signature-canvas, svg (+ svg-transformer), reanimated v4
- Firebase: `@react-native-firebase/app` + `messaging` (push notifications), `google-services.json` for Android — no iOS Firebase config found
- No ESLint config (Prettier only); no `eas.json` (no EAS Build/Submit configured yet)
- Only one test file exists (`src/features/wallet/__tests__/`) and **no test runner is configured** — these tests currently cannot be run as-is

## Folder structure (`src/`)

- Feature-based, not a single `screens/` folder: `src/features/<domain>/*Page.tsx` (a few explicit `*Screen.tsx` live in `components/common/` and `features/onboarding/`)
- `src/features/` domains: `ancillary` (`patient/`, `staff/` splits — home-care nursing/physio), `appointment`, `auth`, `bookings`, `consultation`, `dashboard`, `doctor` (`detail/`, `events/`, `search/`), `events`, `laboratory`, `notification`, `onboarding`, `patient`, `patient-payment`, `patient-qr`, `pharmacy`, `portal`, `profile` (split per role), `radiology`, `referrals`, `settings`, `wallet` — most have their own `components/`
- `src/components/common/` — shared UI, grouped into sub-folders and all re-exported from the barrel `index.ts` (import from `components/common`, not the file path): `layout/` (AppScreenHeader, AppHeader, AppSection, AppFooterBar, AppBottomSheet, AppModal, AppSidebar, SplashScreen…), `buttons/`, `inputs/`, `display/` (AppTypography, AppAvatar, AppIcon…), `feedback/` (StatusModal, ErrorBoundary, OfflineBanner…), `booking/` (booking-flow pieces), `location/`. New shared components go in the matching sub-folder. Design tokens (`APP_COLORS`, `TONES`, `CARD_SHADOW`) live in `src/config/theme.ts`
- `src/components/layout/` — `SidebarLayout.tsx`
- `src/navigation/` — `AppNavigator.tsx` (root switch: auth vs. authenticated), `AuthNavigator.tsx`, `MainTabNavigator.tsx` (role-conditional tabs), `navigationService.ts`, `routes.ts` (`ROUTES` constants), `types.ts` (param list types)
- `src/context/` — `AuthContext.tsx` (auth/session/role — **no Redux**, Context + hooks instead), `NetworkContext.tsx`, `ScrollContext.tsx`
- `src/services/` — `apiService.ts` (shared axios instance: auth header, offline short-circuit, session-expiry handling), plus `appointmentService.ts`, `blogService.ts`, `communityService.ts`, `locationService.ts`, `notificationPermissionService.ts`, `qaService.ts`, `reviewService.ts`; some features keep their own local service
- `src/constants/apiUrls.ts` — `BASE_URL` + `API_ENDPOINTS` map (**source of truth for API routes**)
- `src/hooks/useGPSLocation.ts` (top-level) + feature-scoped hooks
- `src/config/` — `theme.ts` (Paper theme), `toastConfig.tsx`
- `src/types/` — domain type defs + `assets.d.ts`, `react-native-vector-icons.d.ts`
- `src/utils/` — `date.ts`, `formatters.ts`, `jsonUtils.ts`, `networkState.ts`, `s3Utils.ts`, `secureStorage.ts`
- `src/assets/` — images by domain, mirrors `health_care_frontend/src/assets/` structure
- Top-level `assets/` (outside `src/`) — Expo app icons/splash, referenced from `app.json`

## Running / building

```bash
npm start          # expo start
npm run android     # expo run:android
npm run ios         # expo run:ios
npm run web         # expo start --web
```
No `test`, `lint`, `build`, or `typecheck` npm scripts are defined. `metro.config.js` adds `.dcm` (DICOM) as an asset extension and wires `react-native-svg-transformer`. `babel.config.js` uses `babel-preset-expo` + reanimated plugin.

## Navigation

`App.tsx` → `AppNavigator` picks `AuthNavigator` (login → role selection → specialty selection → onboarding → register) or the authenticated `AppStack`, based on `useAuth().accessToken`. Authenticated stack's initial route is `MainTabNavigator` (bottom tabs: Home/Search/Portal-Bookings/Ancillary/Wallet/Profile, tab set varies by `role`), with ~50 additional stack screens reachable per domain (search/doctors, pharmacy, radiology, laboratory, consultation, doctor events, nurse/ancillary staff flows, patient ancillary booking flow, wallet). Route names centralized in `src/navigation/routes.ts`.

## Env vars

- `EXPO_PUBLIC_API_ENDPOINT` — **backend base URL**, read in `src/constants/apiUrls.ts` (fixed in commit `0b691ea`; previously hardcoded). `BASE_URL` now throws at import time if the var is missing/blank — set it before running the app.
- No `.env.example` committed.

## Skills

`.claude/skills/` has directory-scoped Claude Code skills for common tasks: `api-integration`, `feature-screen`, `ui-feedback`. These mirror `.gemini/skills/*.md` (used by Gemini CLI) — keep both in sync if you edit one.

## Conventions

- Prettier: tabs, `tabWidth: 4`, no semicolons, single quotes, `printWidth: 120`
- No ESLint — Prettier is the only enforced style tool
- TypeScript strict mode (`expo/tsconfig.base`)
- Screens mostly suffixed `Page.tsx` (not `Screen.tsx`, except a handful of onboarding/common files); services suffixed `Service.ts`; context providers suffixed `Context.tsx` and export a paired `useX` hook
- Route names as string constants in `src/navigation/routes.ts`, not hardcoded in navigators
- `android/` exists on disk despite being gitignored as a "generated" folder — don't assume it's disposable without checking with the user first
- Root-level scratch files (`review.md`, `gemini.md`, `tsc_full_output.txt`) are dev notes/leftover compiler output, not maintained docs. `review.md` tracks a phased remediation plan; Phases 1–3 (secure token storage, no plaintext token logging, safe JSON parsing, error boundary, the API URL env fix above, folder/naming standardization) are marked complete and verified against current code as of 2026-09-22. Phase 4/5 items (console-stripping in babel, FlatList conversion, a real Jest suite) are still open — verify against the doc before assuming something in the later phases is done.
