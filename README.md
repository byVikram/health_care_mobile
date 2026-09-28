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

- [Node.js](https://nodejs.org/en/) (LTS recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- [Expo Go](https://expo.dev/client) app installed on your physical device, OR an Android/iOS emulator configured on your machine.

### Installation

1. Clone the repository and navigate into `health_care_mobile/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set the backend API URL — required, the app throws at import time if it's missing:
   ```bash
   EXPO_PUBLIC_API_ENDPOINT=http://<your-backend-host>:8000
   ```
   No `.env.example` is committed; set this in your own `.env` or shell environment before running.

### Running the App

Start the Expo development server:

```bash
npm start
```

Press the indicated keys in your terminal to open the app on different platforms:
- **`a`** - Open in Android emulator
- **`i`** - Open in iOS simulator (requires macOS)
- **`w`** - Open in web browser
- Or scan the QR code using the Expo Go app on your physical iOS/Android device.

No `test`, `lint`, `build`, or `typecheck` npm scripts are defined yet. Only one test file exists (`src/features/wallet/__tests__/`) and no test runner is configured — see `CLAUDE.md` for current status.
