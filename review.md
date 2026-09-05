# Comprehensive Code Review & Architecture Report: Ancillary Healthcare Module

**Module Reviewed:** Ancillary Healthcare Services & Provider Dispatch System  
**Reviewer:** Senior Software Architect (15+ Years Systems & UI/UX Experience)  
**Date:** August 31, 2026  
**Scope:** Frontend (`gemini-mobile-app/src/features/ancillary`) & Backend (`backend/app/ancillary`)

---

## Executive Summary

The Ancillary Healthcare module provides critical in-home medical service dispatching (wound care, IV therapy, physiotherapy, elder care). The implementation features strong security boundaries (Tiered PHI protection), atomic MySQL 8.0+ InnoDB locking for zero double-bookings, and an Ola/Uber-style live radar dispatch tracking experience.

This review highlights key technical debt, naming anti-patterns, file redundancies, and architectural refactoring recommendations to make the codebase enterprise-ready and maintainable.

---

## Key Recommendations Summary

1. **Remove `Backend` Suffix from Function Names:** Suffixes like `fetchAncillaryCategoriesBackend` are redundant. In a client-side service module (`ancillaryService.ts`), communicating with the backend is implied.
2. **Modularize Large Files:** `ancillaryService.ts` (37.2 KB) and `backend/app/ancillary/service.py` (84.7 KB) are monolithic files that should be broken down into clean domain sub-modules.
3. **Consolidate Duplicate/Stub Screen Files:** Merge overlapping files like `NurseHistoryPage.tsx` into `NurseBookingHistoryPage.tsx` and eliminate stub files like `AncillaryServicesPage.tsx`.
4. **Standardize Screen Naming Conventions:** Adopt standard React Native routing conventions by using the `Screen` suffix (e.g., `NursingCareScreen.tsx` instead of `NursingCarePage.tsx`).
5. **Standardize Status Vocabulary:** Ensure uppercase canonical 13-state machine vocabulary is used consistently across both backend queries and React Native UI status badges.

---

## Detailed Function Name Changes (`ancillaryService.ts`)

| Existing Function Name | Proposed Clean Function Name | Rationale |
| :--- | :--- | :--- |
| `fetchAncillaryCategoriesBackend` | `getCategories` or `fetchCategories` | Eliminates redundant `Backend` suffix. Clean & concise. |
| `fetchAncillaryServicesBackend` | `getServices` or `fetchServices` | Standard service query convention. |
| `createAncillaryRequestBackend` | `createCareRequest` | Describes the business action directly. |
| `acceptCareRequestBackend` | `acceptCareRequest` | Clear provider action signature. |
| `verifyPatientOtpBackend` | `verifyPatientOtp` | Clean doorstep OTP verification wrapper. |
| `updateNurseStatusBackend` | `updateNurseStatus` | Concise provider status update helper. |
| `fetchAvailableRequestsBackend` | `fetchAvailableRequests` | Standard live request discovery wrapper. |
| `fetchMyNurseAppointmentsBackend` | `getNurseAppointments` | Professional provider schedule accessor. |
| `fetchPatientActiveRequestBackend` | `getActivePatientRequest` | Concise patient state lookup. |
| `updateProviderLocationBackend` | `updateProviderLocation` | Clean spatial telemetry update. |

---

## Recommended File Name Changes & Structural Cleanup

### 1. Frontend Patient Screens (`src/features/ancillary/patient/`)

| Current File Name | Recommended File Name | Multi-Specialty Recommendation & Rationale |
| :--- | :--- | :--- |
| `AncillaryDashboard.tsx` | `PatientAncillaryHomeScreen.tsx` | Main patient hub displaying all specialty shortcuts (Nursing, Physio, Rehab, Elder Care). |
| `NursingCarePage.tsx` | **`AncillaryServiceCatalogScreen.tsx`** | **Dynamic Multi-Specialty Catalog:** Instead of hardcoding to Nursing Care, this screen should accept `specialtyCode` in `route.params` (`nursing-care`, `physiotherapy`, `rehab-care`, `elder-care`) and fetch procedures dynamically from backend `lookup_ancillary_procedures`. |
| `AncillaryBookingStatusPage.tsx` | `BookingSummaryDetailsScreen.tsx` | Distinguishes summary details from live Ola/Uber map tracking. |
| `TrackAppointmentPage.tsx` | `LiveDispatchTrackerScreen.tsx` | Moved out of root ancillary directory into `patient/` folder. |
| `AncillaryServicesPage.tsx` | **[DELETE / DEPRECATE]** | 377-byte stub file that merely forwards to `NursingCarePage.tsx`. |
| `ServiceMatchingPage.tsx` | `NurseSearchProgressScreen.tsx` | Clarifies searching radar screen. |

### 2. Frontend Staff Screens (`src/features/ancillary/staff/`)

| Current File Name | Recommended File Name | Recommendation / Action |
| :--- | :--- | :--- |
| `StaffAncillaryDashboard.tsx` | `NurseDashboardScreen.tsx` | Replaces verbose name with standard role screen name. |
| `NurseHistoryPage.tsx` | **[MERGE / DELETE]** | 4.5 KB duplicate file. Merge logic into `NurseBookingHistoryPage.tsx`. |
| `NurseBookingHistoryPage.tsx` | `NurseVisitHistoryScreen.tsx` | Standardizes naming convention. |
| `ActiveBookingPage.tsx` | `NurseEnRouteScreen.tsx` | Clarifies nurse travel navigation screen. |
| `PatientVerificationPage.tsx` | `DoorstepOtpVerificationScreen.tsx` | Describes security boundary verification screen. |
| `ServiceInProgressPage.tsx` | `ClinicalTreatmentScreen.tsx` | Reflects active procedure execution. |
| `CompleteServicePage.tsx` | `ServiceCompletionScreen.tsx` | Standardizes completion screen naming. |

---

## Code Architecture Refactoring Plan

### 1. Frontend Modularization (`gemini-mobile-app/src/features/ancillary/`)

Currently, `ancillaryService.ts` contains 37.2 KB of mixed concerns. It is recommended to split it into:

```
src/features/ancillary/
├── types/
│   └── ancillary.types.ts          # Canonical 13-state types, NurseBooking, AncillaryBooking
├── services/
│   ├── patientAncillaryService.ts  # Patient booking creation, catalog lookups, tracking
│   ├── providerAncillaryService.ts # Nurse dispatch, 1-tap accept, OTP verification, completion
│   └── mockData.ts                # Seeded constants & demo fallback data
├── screens/
│   ├── patient/                   # Renamed patient screens
│   └── staff/                     # Renamed nurse/staff screens
└── components/                    # Shared UI cards & pulse radar view
```

### 2. Backend Modularization (`backend/app/ancillary/`)

Currently, `service.py` is 84.7 KB containing DB queries for both patient & nurse domains. It should be split into focused domain services:

```
backend/app/ancillary/
├── router.py                      # FastAPI API endpoint routes
├── schema.py                      # Pydantic request/response validation models
├── websocket.py                   # Real-time WebSocket dispatch gateway
└── services/
    ├── catalog_service.py         # Category & procedure lookup queries
    ├── request_service.py         # Booking creation & atomic state transitions
    ├── provider_service.py        # Provider profile, availability, assignments
    └── clinical_service.py        # PHI doorstep OTP verification & clinical notes
```

---

## Detailed Code Review Findings

### 1. Strengths
- **Tiered PHI Security Boundaries:** Excellent enforcement of data privacy. Pre-assignment requests reveal no patient identifiers (Tier 1). Acceptance reveals travel location only (Tier 2). Full clinical PHI is strictly locked behind 4-digit doorstep OTP verification (Tier 3).
- **Atomic Concurrency Control:** Backend uses InnoDB row-level locking (`FOR UPDATE`) and unique keys to prevent double-booking or race conditions when multiple nurses attempt to accept the same request.
- **Ola/Uber Live Dispatch UX:** The patient tracking screen features an animated pulsing medical radar (`NursePulseRadarView.tsx`) with real-time polling to create a smooth, responsive match experience.

### 2. Areas for Improvement
- **Monolithic Service Files:** Refactoring `ancillaryService.ts` and `service.py` into smaller files will significantly improve readability, maintainability, and unit testability.
- **Type Safety & Status Normalization:** Ensure uppercase canonical status strings (`SEARCHING`, `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`) are consistently used in state comparisons to avoid string mismatch bugs.
- **Dead Code Cleanup:** Remove legacy stub files (`AncillaryServicesPage.tsx`) and merge redundant screens (`NurseHistoryPage.tsx`).

---

## Conclusion

The Ancillary Healthcare module has a robust foundation with high security compliance and strong dispatch mechanics. Applying the function renaming, structural file reorganization, and modular service separation outlined in this report will bring the codebase up to top-tier enterprise standards.
