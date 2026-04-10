# Gemini Mobile App - Healthcare

A comprehensive healthcare mobile application built with React Native and Expo. This application serves as a patient portal for booking appointments, searching for doctors, viewing doctor availability, and managing medical consultations.

## Features

- **Authentication**: Secure user login and registration.
- **Doctor Search & Directory**: Browse and search for healthcare professionals based on specialty, name, or availability.
- **Dynamic Scheduling**: View real-time doctor availability and book appointments seamlessly.
- **Consultation Management**: Track past medical history, view consultation details, and share health records.
- **Cross-Platform**: Provides a unified, native experience on both iOS and Android platforms.

## Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation**: [React Navigation](https://reactnavigation.org/) (Native Stack & Bottom Tabs)
- **UI Components**: [React Native Paper](https://callstack.github.io/react-native-paper/)
- **Networking**: [Axios](https://axios-http.com/)
- **Date Management**: [Day.js](https://day.js.org/)
- **Icons & Graphics**: `react-native-svg` and `react-native-svg-transformer`
- **Language**: TypeScript

## Project Structure

The codebase is organized modularly under the `src/` directory to promote scalability and maintainability:

```text
src/
├── assets/         # Images, fonts, and localized graphical assets
├── components/     # Reusable UI components (buttons, inputs, cards, etc.)
├── config/         # App-wide configuration files (e.g., environment variables, API base URLs)
├── constants/      # Static constants (colors, typography, general app constants)
├── context/        # React Context providers (global state like authentication)
├── features/       # Feature-based modules (Auth, DoctorSearch, Appointments, Consultation)
├── navigation/     # App navigators (Stack Navigators, Tab Navigators)
├── services/       # API integration layers (Auth Service, Availability API, etc.)
└── types/          # TypeScript definitions and interfaces
```

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- [Expo Go](https://expo.dev/client) app installed on your physical device, OR an Android/iOS emulator configured on your machine.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd Karola Health
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

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

## Recent Updates

- **Native Migration**: Migrated the web patient portal to a React Native mobile application for a fully native experience.
- **Doctor Availability API**: Integrated with the updated backend API for dynamic, localized start and end times, overcoming previous hardcoded slot limitations.
- **Enhanced UI**: Upgraded the Consultation Page to ensure feature parity with the legacy web application, including Medical History & Sharing workflows.
