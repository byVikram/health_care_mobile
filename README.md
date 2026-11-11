# KarolaHealth — Mobile App

A comprehensive healthcare mobile application built with React Native and Expo. Serves patients, doctors, ancillary (home-care) providers, and pharmacy/radiology/lab staff, covering appointments, doctor search, consultations, home-care booking, and wallet.

## Features

- **Authentication**: Secure login/registration, role-based (patient, doctor, ancillary provider, pharmacy, radiology, laboratory).
- **Doctor Search & Directory**: Browse and search for healthcare professionals by specialty, name, or availability.
- **Dynamic Scheduling**: Real-time doctor availability and appointment booking.
- **Consultation Management**: Medical history, consultation details, and record sharing.
- **Home-Care Booking**: Book/manage ancillary (nursing, physiotherapy, etc.) home visits.
- **Wallet**: Patient/provider wallet and transaction history.
- **Cross-Platform**: Unified native experience on iOS and Android.

## Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) 0.86 on [Expo](https://expo.dev/) SDK 57, React 19.2
- **Navigation**: [React Navigation](https://reactnavigation.org/) v7 (Native Stack & Bottom Tabs)
- **UI Components**: [React Native Paper](https://callstack.github.io/react-native-paper/) v5
- **Networking**: [Axios](https://axios-http.com/) (custom instance with interceptors)
- **Validation**: [Zod](https://zod.dev/)
- **Date Management**: [Day.js](https://day.js.org/)
- **Icons & Graphics**: `react-native-svg` and `react-native-svg-transformer`
- **Push Notifications**: `@react-native-firebase/messaging`
- **Language**: TypeScript (strict mode)

## Project Structure

Feature-based, not a single `screens/` folder — the codebase is organized under `src/`:

```text
src/
├── assets/             # Images, fonts, and graphical assets (by domain)
├── components/
│   ├── common/         # Shared UI, grouped into sub-folders (layout/, buttons/, inputs/,
│   │                   #   display/, feedback/, booking/, location/), all re-exported from
│   │                   #   the barrel index.ts — import from `components/common`, not the
│   │                   #   file path. A shared component's test/helper lives in a
│   │                   #   __tests__/ folder next to it (e.g.
│   │                   #   components/common/<sub-folder>/__tests__/<Component>.test.tsx)
│   └── layout/          # SidebarLayout.tsx
├── config/              # theme.ts (design tokens/Paper theme), toastConfig.tsx
├── constants/           # apiUrls.ts (source of truth for API routes), routes, misc constants
├── context/             # AuthContext, NetworkContext, ScrollContext — no Redux
├── features/             # Feature-based modules: ancillary, appointment, auth, bookings,
│                         #   consultation, dashboard, doctor, events, laboratory,
│                         #   notification, onboarding, patient, patient-payment,
│                         #   patient-qr, pharmacy, portal, profile, radiology,
│                         #   referrals, settings, wallet — most have their own components/
├── hooks/                # useFamilyMembers.ts + feature-scoped hooks
├── navigation/           # AppNavigator, AuthNavigator, MainTabNavigator, routes, types
├── services/             # apiService.ts (shared axios instance) + per-domain services
├── types/                # Domain TypeScript definitions
└── utils/                # date, formatters, secureStorage, s3, network state, etc.
```

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS recommended) and npm
- **Android:** Android Studio (SDK + an emulator, or a USB-debugging device) and a JDK
- **iOS:** macOS with Xcode (iOS builds are not possible on Windows/Linux)
- The backend running and reachable from the device/emulator (see `health_care_backend/`)

> **Expo Go will not work.** The app uses native modules that Expo Go does not include (`@react-native-firebase/*`, `expo-speech-recognition`, `expo-screen-capture`, `react-native-maps`) plus a custom `google-services.json`. You must run a native development build, as below.

### Installation

1. Clone the repository and navigate into `health_care_mobile/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set the backend API URL — required, the app throws at import time if it is missing:
   ```bash
   cp .env.example .env      # Windows: copy .env.example .env
   # then edit EXPO_PUBLIC_API_ENDPOINT
   ```
   Use an address the device can reach: the Android emulator reaches your machine at `http://10.0.2.2:8000`; a physical device needs your machine's LAN IP. Use `https://` for anything other than local development.

### Running the App

Build and launch a native debug build (this also starts Metro, and generates the git-ignored `android/` / `ios/` folders on first run):

```bash
npm run android     # Android emulator or connected device
npm run ios         # iOS simulator (macOS only)
```

Once a debug build is installed, you can restart just the JS bundler with `npm start`. `npm run web` exists but the native-only modules above mean web is not a supported target.

### Building an APK (Android release)

A release APK is a standalone build: it has no Metro server, and it carries the backend address that was in `.env` **when it was built**. This is the local Gradle route (no EAS).

**Before you start**

- JDK 17 and the Android SDK are installed, and `JAVA_HOME` and `ANDROID_HOME` are set (Android Studio installs the SDK).
- `EXPO_PUBLIC_API_ENDPOINT` in `.env` is the `https://` address of the backend the APK should talk to. A release build refuses a plain `http://` address, and changing `.env` later needs a rebuild.
- `google-services.json` is in the project root (it is committed). Push notifications need it.

**Steps** (from `health_care_mobile/`)

1. Apply the native configuration to the generated `android/` folder. Do this the first time, and again whenever you change `app.json`, add or remove a native package, or edit anything in `plugins/`:
   ```bash
   npx expo prebuild --platform android
   ```
   Don't add `--clean` unless you mean it: it deletes and regenerates `android/`, including any change made there by hand.
2. Build the release APK:
   ```bash
   cd android
   .\gradlew assembleRelease "-PreactNativeArchitectures=arm64-v8a"
   ```
   - `arm64-v8a` builds for current 64-bit phones only, which keeps the APK much smaller than an all-architecture build. For older 32-bit phones too, use `"-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"`.
   - Keep the quotes around the `-P...` argument (PowerShell splits it at the comma otherwise).
   - The first build takes a long time (20 minutes or more); later ones reuse most of the work.
   - If a build behaves as if it ignored a change, run `.\gradlew clean` first.
3. The APK is at:
   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```
4. Install it on a connected phone (USB debugging on), or copy the file to the phone and open it there:
   ```bash
   adb install -r app\build\outputs\apk\release\app-release.apk
   ```

**Good to know**

- Unless a release keystore has been configured in `android/app/build.gradle`, the release APK is signed with the debug key. That is fine for testing and sharing; it cannot be uploaded to the Play Store.
- Push notifications: the notification channels, the status-bar icon and the Firebase defaults are added by `plugins/withNotificationChannels.js` during step 1, so skipping `prebuild` after pulling changes to that plugin leaves the APK without them. The backend must have its Firebase service-account key set (`FIREBASE_CREDENTIALS_PATH` on the server) for pushes to arrive.
- If Gradle fails at `processReleaseMainManifest` with "Manifest merger failed", a library and the app declare the same manifest entry; the error names the attribute and the fix (usually `tools:replace` in the plugin).
- `npm run android` builds a *debug* build for development instead (see "Running the App").

### Scripts

| Script | What it does |
| :--- | :--- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src` (errors fail; the existing warnings are a backlog) |
| `npm run format` / `format:check` | Prettier over `src` |

A git pre-commit hook (husky + lint-staged) runs ESLint on the staged TypeScript files; `npm install` sets it up. CI (`.github/workflows/mobile-ci.yml`) runs typecheck and lint on every push and pull request. Native builds can also be made with EAS (`eas.json`: `development`, `preview`, `production`). See `review.md` for the list of known gaps.
