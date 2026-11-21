# KarolaHealth — mobile app

The patient, doctor and home-care provider app of Karolahealth, built with React Native and Expo. It talks to the FastAPI backend in `health_care_backend/` and shares its accounts with the web app in `health_care_frontend/`.

- **Patients:** find and book doctors (clinic or video), lab tests and radiology (medicine delivery is coming), book home-care visits, see everything in one Bookings list, keep medical records and family members.
- **Doctors:** schedule, booking requests (with an auto-confirm switch), consultations with vitals and notes, referrals, availability.
- **Home-care (ancillary) providers:** Today, incoming requests (instant requests ring like a ride request, even with the app closed), visits, arrival and no-show handling.
- **Everyone:** push notifications, family profiles, server-driven menu per role.

## Tech stack

- [React Native](https://reactnative.dev/) 0.86 on [Expo](https://expo.dev/) SDK 57, React 19.2, TypeScript (strict)
- [React Navigation](https://reactnavigation.org/) v7 (native stack + bottom tabs), [React Native Paper](https://callstack.github.io/react-native-paper/) v5
- [Axios](https://axios-http.com/) for the API, [Zod](https://zod.dev/) for validation, Context + hooks for state (no Redux)
- Firebase Cloud Messaging (`@react-native-firebase/*`), `expo-notifications`, `react-native-notify-kit`
- Tokens in `expo-secure-store`; maps, camera, location, speech recognition and more through Expo modules

## Prerequisites

- Node.js 22 (what CI uses) and npm
- **Android:** Android Studio (SDK, plus an emulator or a phone with USB debugging), JDK 17, `JAVA_HOME` and `ANDROID_HOME` set
- **iOS:** macOS with Xcode (iOS is not a supported target yet: there is no Firebase iOS config)
- The backend running and reachable from the device or emulator (see `health_care_backend/`)

> **Expo Go does not work.** The app uses native modules Expo Go does not include (`@react-native-firebase/*`, `react-native-notify-kit`, `expo-speech-recognition`, `react-native-maps`, a custom `google-services.json`, and a native ring service). Always use a development build.

## Setup

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `.env` (it is gitignored). Only one variable is required:

| Variable | Meaning |
| :--- | :--- |
| `EXPO_PUBLIC_API_ENDPOINT` | **Required.** Backend base URL. The app throws at start-up if it is blank. Android emulator: `http://10.0.2.2:8000`. Physical device: your machine's LAN IP, e.g. `http://192.168.1.20:8000`. Use `https://` for anything but local development. |
| `EXPO_PUBLIC_ALLOW_INSECURE_HTTP` | Optional. `true` lets a **release** build use an `http://` address (test builds only). |
| `EXPO_PUBLIC_S3_BASE_URL` | Optional. Base URL for picture keys (`src/utils/s3Utils.ts`; there is a built-in fallback). |

`EXPO_PUBLIC_*` values are put into the JavaScript bundle by Metro: after changing `.env`, restart with `npx expo start -c`. A native rebuild is not needed for that.

## Run on Android

```bash
npm run android     # builds and installs a debug build (starts Metro, generates the git-ignored android/ folder on the first run)
npm start           # later: just Metro, for an already installed debug build
```

You need a **native rebuild** (`npx expo prebuild --platform android`, then `npm run android`) only when you change `app.json` plugins, anything in `plugins/`, `assets/sounds/` or `assets/notification/`, or add or remove a native package. **Do not add `--clean` to prebuild**: it deletes and regenerates `android/`.

## Build an APK

A release APK is standalone (no Metro) and carries the API address that was in `.env` when it was built. Release builds refuse a plain `http://` address, so use the `https://` backend.

**Local (Gradle)**, from `health_care_mobile/`:

```bash
npx expo prebuild --platform android      # first time, and after native changes (never --clean)
cd android
.\gradlew assembleRelease "-PreactNativeArchitectures=arm64-v8a"
```

- Output: `android\app\build\outputs\apk\release\app-release.apk`. Install with `adb install -r app\build\outputs\apk\release\app-release.apk` or copy the file to the phone.
- `arm64-v8a` covers current 64-bit phones and keeps the APK small; add `,armeabi-v7a` for older 32-bit phones. Keep the quotes (PowerShell splits at the comma).
- Gradle does not notice a `.env` change: run `.\gradlew clean` first after editing it. The first build takes 20 minutes or more.
- Without a release keystore in `android/app/build.gradle` the APK is signed with the debug key: fine for testing and sharing, not for the Play Store.

**EAS (cloud)**: `eas.json` has `development` (dev client, APK), `preview` (internal APK, auto-increment) and `production`. EAS cannot see the gitignored `.env`, so put the address in the profile:

```json
"preview": { "distribution": "internal", "autoIncrement": true, "android": { "buildType": "apk" },
             "env": { "EXPO_PUBLIC_API_ENDPOINT": "https://your-backend.example.com" } }
```

```bash
eas build -p android --profile preview
```

## Push notifications and Firebase

- `google-services.json` (Firebase project `karolahealth`, package `com.karolahealth.app`) is committed in the project root.
- `plugins/withNotificationChannels.js` creates the Android notification channels and sets the status-bar icon at prebuild; `plugins/withOfferOverlay.js` adds the ring service for instant care requests (Kotlin in `plugins/offer-overlay/`, sound in `assets/sounds/new_request.wav`). Skipping prebuild after a change to either leaves the build without it.
- The backend needs its Firebase service-account key (`FIREBASE_CREDENTIALS_PATH`) for pushes to arrive. A provider must allow "Display over other apps" for the request card to appear over other apps (the Today screen asks).
- Try a request on a phone with the backend's `scripts/send_test_offer.py`.

## Project layout

```text
index.ts, App.tsx        # entry: registers background push handlers, then the app
app.json, eas.json       # Expo config (plugins) and EAS build profiles
plugins/                 # Expo config plugins and the Kotlin of the native ring (offer-overlay/)
assets/                  # icon, splash, notification icons, sounds
src/
├── features/<domain>/   # screens (*Page.tsx) and their components: ancillary, appointment, auth,
│                        #   bookings, consultation, dashboard, doctor, laboratory, medical-records,
│                        #   notification, patient, profile, radiology, wallet ...
├── components/common/   # shared UI (layout/, buttons/, inputs/, display/, feedback/, booking/,
│                        #   location/), re-exported from the barrel index.ts
├── services/            # apiService.ts (axios + session handling) and per-domain services
├── constants/apiUrls.ts # BASE_URL and every API path
├── navigation/          # navigators, routes.ts, the server-driven menu
├── config/theme.ts      # design tokens (APP_COLORS, TONES ...)
├── context/ hooks/ utils/ types/ validation/
docs/                    # feature documentation (see below)
```

## Scripts and checks

| Script | What it does |
| :--- | :--- |
| `npm start` / `npm run android` | Metro / build and run a debug build on Android |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src` (errors fail; the existing warnings are a backlog) |
| `npm run format` / `npm run format:check` | Prettier over `src` |

A pre-commit hook (husky + lint-staged) runs ESLint on staged TypeScript files; `npm install` sets it up. CI (`.github/workflows/mobile-ci.yml`) runs typecheck and lint on every push to `dev` / `main` and on pull requests. There is no test runner.

## More documentation

- [CLAUDE.md](CLAUDE.md): conventions, commands and working agreements (read this before changing code).
- [docs/](docs/): one file per feature: home care, push and the native ring, navigation, consultation vitals, medical records, app updates.
- `review.md`: the list of known gaps from an earlier review (check it against the code before trusting it).
