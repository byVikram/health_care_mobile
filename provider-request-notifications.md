# Provider incoming-request notifications — decisions (2026-10-02)

Scope: how an ancillary provider (nurse, physio, attendant, …) finds out about a new request in the mobile app.
Design source: `ancillary-provider.html` (Nursing · 1 Today, 1a Booking request, 8 Lock screen, 9 Banner over another app).

## Decision

**Requests reach the provider over the backend dispatch WebSocket, only while the app is open (foreground). No polling.**

- Endpoint: `/api/ancillary/ws/provider/dispatch`, authenticated by an `{"type":"auth","token":<JWT>}` first frame (token never in the URL).
- Client: `src/features/ancillary/staff/today/useProviderDispatchSocket.ts`, built on `openAuthedSocket` (`src/utils/authedSocket.ts`).
- Connects only while the provider **Today** screen is focused **and** the app is foregrounded (`AppState`); closes on blur, background, unmount and logout.
- Reconnect: exponential backoff 1 s → 30 s, token re-read on each attempt, no retry on fatal close codes (4401, 4403, 4404). Keepalive `{"type":"ping"}` every 25 s.
- On connect the backend pushes every open offer in the provider's geofence, so there is no catch-up fetch.
- The earlier 15-second `GET /provider/requests/available` poll was removed.

### Events handled

| Event | Behaviour |
|---|---|
| `NEW_CARE_REQUEST_OFFER` | Show the incoming-request sheet (instant) or a banner (per-visit scheduled offer). Deduped on `requestId`; a tip change re-sends the same id and updates the sheet in place. |
| `CARE_REQUEST_STATUS_CHANGE` | Cancelled / expired / failed / no-provider / unassigned → remove the offer; an open sheet switches to "Request missed". Also re-reads Today. |
| `OFFER_WITHDRAWN` | `data = {requestId, reason: ACCEPTED_BY_OTHER | CANCELLED | EXPIRED, visitPublicId?}`, sent to the OTHER providers. The offer is removed (requestId, and visitPublicId for per-visit offers); an open sheet switches to "Taken by another provider" (ACCEPTED_BY_OTHER) or "Request missed" (CANCELLED / EXPIRED) and is then dismissed normally. Ignored when this provider already accepted or declined it. |
| `NEW_SCHEDULED_ORDER_REQUEST` | Re-read Today. |

The 30-second accept window is counted on the device from first receipt (not restarted by re-sends or reconnects). The backend's own `expiresAt` is ignored because it is 60 s and subject to device clock skew.

## Explicitly NOT done (decided with the user)

- **Lock-screen notification and heads-up banner over other apps (design screens 8 and 9): skipped for now.** Foreground-only delivery is acceptable for this phase.
- **Backend FCM data push for request offers: built and then reverted.** Nothing in the app consumes it yet. (Findings if it returns: sessions already store FCM tokens in `UserSession.fcm_token` via `PUT /api/auth/session/fcm-token`; the backend has no push sender, no `firebase_admin` dependency and no credentials config; offers are not stored as assignments, so a dismiss push would need to recompute eligible providers.)
- **Ola-style "draw over other apps" overlay: not planned.** Needs a custom Kotlin module, the user-granted "Display over other apps" permission and a way to run while the app is closed. The lock-screen/heads-up alert (screens 8 and 9) should come first.
- Online switch: **restored** (2026-10, per the updated design; supersedes the 2026-09-29 "no switch" note). The Availability card sits at the top of Today. The "Before you go online" permissions screen (7) is still out of scope.

## Known limitations (consequences of foreground-only)

- A provider with the app closed, backgrounded or the phone locked receives **nothing** until they open the app.
- Closing the gap needs a high-priority FCM data push plus a full-screen-intent notification (Android) — the work in screens 8/9. Suggested library: `react-native-notify-kit` (maintained Notifee-compatible fork). `@notifee/react-native` is archived (April 2026), last released December 2024, and is likely incompatible with RN 0.86 / Expo SDK 57. `expo-notifications` has no full-screen intent or killed-app action handling. Needs a native rebuild (`npx expo run:android`) and approval to touch `android/`.

## Open follow-ups (not applied — need an OK)

Backend (`health_care_backend/app/ancillary`):

1. **Offer payload gaps** in `_build_care_offer_payload`: add `patientName` (first name) and optionally `durationLabel`. Currently missing: patient name, gender, age, duration, area name. `generalLocation` is the full street address and is deliberately not shown ("Full address after you accept").
2. **Per-provider expiry** of 30 s to match the design (currently 60 s, ignored by the app).

Online state:

4. **Online state is driven by the Today switch (decision: switch restored).** The WebSocket only pushes offers to providers the backend has as `is_verified`, `is_online` and with `current_lat`/`current_lng` set. Initial state is read from `GET /provider/status`. Going online asks for location permission, reads the position and POSTs `{isOnline:true, latitude, longitude}` to `/provider/status`; going offline POSTs `{isOnline:false}`, closes the socket and clears open offers. The socket connects only while online, the screen is focused and the app is in the foreground. Location is re-sent to `/provider/location` on return to foreground (throttled to once per 5 min). On failure or denied permission the switch rolls back with a toast. Not verified on a device.

Visit payload (`/me/today`, visit details): `tipAmount` and `booking_type` are missing, so tips show only on live offers, not on pending requests loaded from Today.

## Related

- Provider screens are common to all specialities via `src/features/ancillary/staff/providerSpecialityCopy.ts`.
- Booking rules: pay after each visit, no gateway, no earnings screen, no resend-code, chat = "coming soon".

## Today stats

The provider Today screen matches the design (Nursing · 1): greeting header, Availability card, a three-tile stats row, then the Next visit card. The schedule / "Coming up" lists were removed from this screen. Booking-request and per-visit offer banners stay. **User decision (overrides the earlier "no earnings / no ratings" scope, for this stats row only):**

- **Visits today**: `stats.visits_done of visits_total` from `/provider/me/today`.
- **Earned today**: `todayEarnings` from `GET /provider/dashboard-metrics` (a string like "₹120.00"; the provider's cut of orders completed today). Shown as "—" if the call fails. Caveat: it counts orders (not visits) completed today, and the existing `fetchProviderDashboardMetrics` helper mis-parses the string to 0, so Today parses it itself.
- **Rating**: always "—". No ancillary rating exists in the provider profile or metrics, there is no `ancillary_reviews` table in the dev DB, and ancillary ratings are deferred by product rule.
