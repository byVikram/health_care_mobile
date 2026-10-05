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
├── hooks/                # useGPSLocation.ts + feature-scoped hooks
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

### Scripts and testing status

Only `start`, `android`, `ios` and `web` scripts exist — there are no `test`, `lint`, `build` or `typecheck` scripts yet (type-check manually with `npx tsc --noEmit`). The single test folder (`src/features/wallet/__tests__/`) has no runner configured, so nothing can be run as-is. See `review.md` for the full list of known gaps.
