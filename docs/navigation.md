# Navigation and the server-driven menu

How the app picks its navigators, and how the sidebar and bottom tab bar are served by the backend.

## Navigators

`App.tsx` → `AppNavigator` picks `AuthNavigator` (login → role selection → specialty selection → onboarding → register) or the authenticated `AppStack`, based on `useAuth().accessToken`. Authenticated stack's initial route is `MainTabNavigator` (bottom tabs: Home/Search/Portal-Bookings/Ancillary/Wallet/Profile, tab set varies by `role`), with ~50 additional stack screens reachable per domain (search/doctors, radiology, laboratory, consultation, doctor events, nurse/ancillary staff flows, patient ancillary booking flow, wallet). Route names centralized in `src/navigation/routes.ts`.

## Server-driven sidebar and tab bar

**The sidebar and the bottom tab bar are served by the backend** (`GET /api/lookup/navigation`, per role: patient, doctor, ancillary; see `health_care_backend/docs/navigation.md`). The response is only stable `key`s + label + icon key, already ordered, never a route: the app owns what a key does (`useSidebarMenu.ts` for drawer rows, `TAB_TARGETS` in `MainTabNavigator.tsx` for tabs) and silently skips keys it does not know. To add a menu entry: add the row in the backend DB, and map its key here. `DEFAULT_MENU` (mirrors the backend's shipped data) is shown until the first response, when the request fails, for a list the backend sends empty, and for roles with no server menu (radiology/laboratory, which keep the docked tab bar). The menu is refetched whenever the app returns to the foreground.
