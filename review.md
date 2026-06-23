# Code Review Findings: Karola Health Mobile App

This report outlines the structural, architectural, and logical improvements identified during a comprehensive analysis of the codebase. The findings are categorized by severity, along with actionable refactoring recommendations.

---

## 1. Critical Severity Issues

### 1.1 Unintended Data Loss on Logout
* **Location:** [AuthContext.tsx](src/context/AuthContext.tsx#L109)
* **Problem:** The `clearAuth` function triggers `await AsyncStorage.clear()`. This completely wipes the entire local application database. If the app expands to store offline health metrics, search history, app themes, cached static assets, or push notification flags, they will be deleted whenever a user logs out.
* **Refactoring Suggestion:** Instead of a wholesale clear, selectively delete only authentication keys using `AsyncStorage.multiRemove` (mirroring what was correctly implemented in the API client [apiService.ts](src/services/apiService.ts#L111)).
  ```typescript
  const clearAuth = async () => {
      await AsyncStorage.multiRemove(['role', 'user', 'access_token', 'refresh_token', 'selectedHospital', 'selectedHospitalId']);
      clearAuthState();
  };
  ```

### 1.2 Invisible User Notifications (Missing Toast Root Component)
* **Location:** Called across multiple screen components (e.g., [OrderListRadiologyPage.tsx](src/features/radiology/OrderListRadiologyPage.tsx#L19), [PlacePharmacyOrderPage.tsx](src/features/pharmacy/PlacePharmacyOrderPage.tsx#L17))
* **Problem:** Toast alerts via `Toast.show()` are triggered for async success/error feedback throughout the app, but the root `<Toast />` component is never declared at the application root [App.tsx](App.tsx). As a result, **no toast notifications will ever render on screen**, leaving the user with zero visual feedback in multiple workflows.
* **Refactoring Suggestion:** Import and render `<Toast />` at the root Level in `App.tsx` (or immediately inside `AppNavigator`):
  ```tsx
  // App.tsx
  import Toast from 'react-native-toast-message';
  
  export default function App() {
      return (
          <SafeAreaProvider>
              <PaperProvider theme={theme}>
                  <AuthProvider>
                      <AppNavigator />
                      <Toast /> {/* Add this line */}
                  </AuthProvider>
              </PaperProvider>
          </SafeAreaProvider>
      );
  }
  ```

### 1.3 Global API Error Handler Hijacks Local UI Experience
* **Location:** [apiService.ts](src/services/apiService.ts#L124-L129)
* **Problem:** The response interceptor in the custom `ApiService` automatically issues an alert window `Alert.alert('API Error', message)` for *all* HTTP responses other than `401` and `403`. 
  - Standard client validation exceptions (e.g., `400 Bad Request`, `422 Unprocessable Entity`) or `404 Not Found` will raise disruptive system-level native alert dialogs.
  - This prevents local screen components from handling validation errors cleanly (like inline red error messages) and breaks standard separation of concerns.
* **Refactoring Suggestion:** Remove the catch-all `Alert.alert` from the global interceptor. Let the calling features handle non-fatal HTTP errors locally inside their screen hooks or use a specialized error display helper rather than blocking UI threads globally.

---

## 2. High Severity Issues

### 2.1 Fragile Package Import Pattern (Deep Node Modules Import)
* **Location:** [AppNavigator.tsx](src/navigation/AppNavigator.tsx#L39)
* **Problem:** There is an import pointing directly into internal types:
  ```typescript
  import Component from 'react-native-paper/lib/typescript/components/List/ListItem'
  ```
  Deep imports are unstable, bypass public library APIs, and can break without warnings during library upgrades (major/minor version changes). Furthermore, `Component` is imported but completely unused in this navigator.
* **Refactoring Suggestion:** Remove the unused import. If type definitions are needed, import them from the public API package export:
  ```typescript
  import { List } from 'react-native-paper'; // Standard way to reference List items
  ```

### 2.2 Domain Boundary Violations in Feature Services
* **Location:** [pharmacyService.ts](src/features/profile/pharmacy/pharmacyService.ts#L136) vs [pharmacyService.ts](src/features/pharmacy/pharmacyService.ts)
* **Problem:** The service logic for Pharmacy is split awkwardly:
  - The profile folder contains `createPharmacyOrder` which belongs in the main checkout workflow.
  - The pharmacy feature folder contains `getPatientTreatmentHistory` and `getPatientAddresses` which cross boundaries into the Patient/Profile domain.
  This introduces confusing relative import trajectories (`../../../types/...`) and circular structure paths.
* **Refactoring Suggestion:** Restructure service functions based on domain ownership:
  - Keep profile configuration methods (e.g., getting/updating a pharmacy's own details) in `src/features/profile/`.
  - Move user-facing booking operations (like placing or checking an order) to `src/features/pharmacy/`.
  - Address operations should be linked directly to a centralized `src/features/profile/patient/` or shared helper service.

### 2.3 Wrong Placeholder Image Category Mismatch
* **Location:** [RadiologyCard.tsx](src/features/radiology/component/RadiologyCard.tsx#L7-L11)
* **Problem:** The card imports pharmacy placeholder image assets (`pharmacy2`, `pharmacy3`, `pharmacy4`) to render as default images for radiology centers, even though dedicated radiology placeholder assets were pulled (e.g., under `src/assets/Radiology/`).
* **Refactoring Suggestion:** Use the appropriate radiology image placeholder assets instead of pharmacy-related images.

---

## 3. Medium Severity Issues

### 3.1 Duplicated Helper and Utility Logic
* **Issue A: Date Formatting:**
  - Standard formatting helpers are provided in [date.ts](src/utils/date.ts).
  - However, screens like [DoctorDetailPage.tsx](src/features/doctor/detail/DoctorDetailPage.tsx#L727), [AvailabilityTab.tsx](src/features/profile/doctor/tabs/AvailabilityTab.tsx#L214), [PatientProfileService.ts](src/features/profile/patient/PatientProfileService.ts#L75), and [OrderListRadiologyPage.tsx](src/features/radiology/OrderListRadiologyPage.tsx#L112) redefine a local copy of `formatDateForApi` / `formatApiDate`.
* **Issue B: Geocoding Duplication:**
  - `useGPSLocation.ts` contains custom geocoding hooks [useGPSLocation.ts](src/useGPSLocation/useGPSLocation.ts#L64).
  - `locationService.ts` contains a duplicate geocoding utility `getAddressFromCoords` [locationService.ts](src/useGPSLocation/locationService.ts#L26).
* **Issue C: S3 URL Resolution:**
  - [PlacePharmacyOrderPage.tsx](src/features/pharmacy/PlacePharmacyOrderPage.tsx#L48) and [RadiologyBookingPage.tsx](src/features/radiology/RadiologyBookingPage.tsx#L40) format the S3 url properly.
  - [RadiologyBookingDetailsPage.tsx](src/features/radiology/RadiologyBookingDetailsPage.tsx#L99) contains a mock function that returns just the raw key, which will fail to fetch the remote images for radiology documents.
* **Refactoring Suggestion:** Consolidate these helpers into shared utilities (`src/utils/`). Import them on screens instead of redeclaring local variations.

### 3.2 Redundant Request Token Passing & API Duplication
* **Location:** [RadiologyService.ts](src/features/radiology/RadiologyService.ts), [doctorService.ts](src/features/doctor/doctorService.ts#L157), and [radiologyService.ts](src/features/profile/radiology/radiologyService.ts#L66)
* **Problem:** 
  - Service methods accept a redundant `token` parameter and build request auth headers manually. The global Axios client instance in `ApiService` is already configured with a request interceptor that retrieves the accessToken from `AsyncStorage` and appends it automatically. Passing the token manually creates API clutter and leads to maintenance discrepancies.
  - The exact same API endpoint `API_ENDPOINTS.RADIOLOGY_PROFILE.SCAN_TYPES` is requested by two different services: `fetchScanTypes` in `src/features/radiology/RadiologyService.ts` and `getScanTypes` in `src/features/profile/radiology/radiologyService.ts`.
* **Refactoring Suggestion:** Clean up token passing from service interfaces, and unify duplicate endpoints into a single radiology service.

### 3.3 Folder Directory Structure Anomaly
* **Location:** `src/useGPSLocation/`
* **Problem:** There is a top-level directory named after a specific custom React hook. 
* **Refactoring Suggestion:** Relocate the files:
  - Move `useGPSLocation.ts` to a generic directory, e.g., `src/hooks/useGPSLocation.ts`.
  - Move `locationService.ts` to `src/services/locationService.ts`.

---

## 4. Low Severity & Best Practice Improvements

### 4.1 Massive Component Bloat (Inlining Subcomponents)
* **Problem:** Multiple screen files have grown extremely large, exceeding 1,000 to 2,000 lines (e.g., [DoctorDetailPage.tsx](src/features/doctor/detail/DoctorDetailPage.tsx) at 2226 lines; [RadiologyBookingDetailsPage.tsx](src/features/radiology/RadiologyBookingDetailsPage.tsx) at 1381 lines; [OrderListRadiologyPage.tsx](src/features/radiology/OrderListRadiologyPage.tsx) at 1021 lines). They contain several standalone components inline (`BackgroundSubsection`, `HospitalAppointmentCard`, `ImageViewerModal`, `BookingCard`, etc.).
* **Refactoring Suggestion:** Split these files up. Define subcomponents inside a `components/` subfolder located next to the page component (e.g., `src/features/doctor/detail/components/HospitalAppointmentCard.tsx`).

### 4.2 Hardcoded Color Strings
* **Problem:** CSS colors like `#1f5f68`, `#2E7C86`, or `#2B6F71` are hardcoded in styles across features instead of utilizing the defined application theme tokens. Similarly, local `COLORS` configuration objects are created in components like [Scantypeselectormodal.tsx](src/features/radiology/component/Scantypeselectormodal.tsx#L91).
* **Refactoring Suggestion:** Access constants dynamically using `useTheme()` from `react-native-paper` to make the codebase easier to update and to prepare it for optional dark-mode integration.

### 4.3 Redundant Android LayoutAnimation Setup
* **Location:** [DoctorDetailPage.tsx](src/features/doctor/detail/DoctorDetailPage.tsx#L43)
* **Problem:** `UIManager.setLayoutAnimationEnabledExperimental` is configured inside individual screen components.
* **Refactoring Suggestion:** Move this configuration step to the entry point (e.g., `index.ts` or `App.tsx`) so that it runs once on startup.

### 4.4 Missing Automated Test Configuration
* **Problem:** The codebase does not include any testing libraries or test suites. 
* **Refactoring Suggestion:** Configure a test runner like `Jest` alongside `@testing-library/react-native` to allow components and services to be unit-tested.
