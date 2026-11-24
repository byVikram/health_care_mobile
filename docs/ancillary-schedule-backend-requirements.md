# Home-care provider app: backend work needed for the new Schedule and Home

**Status: PENDING INTEGRATION.** The home-care (ancillary) provider app was redesigned: the **Schedule** tab, the **Today (Home)** screen and the visit screens. The app side is built. This document lists what the **backend** must add so the parts that are waiting can be switched on. **No backend code was changed for the redesign.**

Who this is for: the backend developer. Everything the app needs is written as an endpoint, a rule, an error code, a test and an item id (`PB-01` to `PB-16`).

## 0. Conventions used below

- Paths are under `/api/ancillary`; answers use the usual `{ "success": true, "message": "...", "data": ... }` envelope.
- Errors are `409 { "detail": { "code": "...", "message": "..." } }`, like the existing accept / cancel routes.
- Time is the clinic's clock (IST). A date is `YYYY-MM-DD`, a time `HH:MM`.
- Anything told to a user goes through a `notify_*` function, called after the commit, with names, dates and times only (no free text, no health details).
- **Anything marked "schema change" needs a migration and should be agreed before it is built** (keep one Alembic head).
- Field names in the new `open-jobs` contract are camelCase because that is the shape the app's types use. If you prefer snake_case like the other `/provider/me/*` endpoints, say so: the app maps it in one function.

## 1. At a glance

| Group | What | Items | Schema change? | What it unlocks in the app |
|---|---|---|---|---|
| **A** | List open jobs ahead of time; keep missed ones open; busy check | PB-01, PB-02, PB-06, PB-10, PB-11 | Maybe (home position) | "Open near you", "Needed now", the "Open jobs" row on Home, the orange dots on the day strip |
| **B** | Pick some days of a booking; hide a job | PB-03, PB-04 | Yes (per-nurse hide) | The Open job screen (pick days, "Not for me") |
| **C** | Give back one day, or the rest | PB-05 | Maybe (hand-back time) | The ⋮ menu's "Can't make this day" |
| **D** | Early-accept safety: reminders and the "on the way" deadline | PB-12 | Maybe (sent stamps) | Nothing visible; keeps early accepts safe |
| **E** | "Running late" tells the patient | PB-07 | No | The ⋮ menu's "Running late" |
| **F** | More on the request card and sheet | PB-08, PB-16 | No | Age, area, ETA, services, note, "You earn" |
| **G** | Richer rows and cards | PB-09, PB-14, PB-15 | No | Fewer calls, instant visits on the right day, the area name |
| **H** | Notes after a visit | PB-13 | No | "Visit notes to finish" row |

**Suggested order:** F and G first (small, safe). Then A together with D (an early list without reminders is worse than today). Then B, then C, E and H.

## 2. What works today without any backend change

- Today: the header, "Up next" cards from `GET /provider/me/today` (plus each visit's details for the first four cards), the offer sheet and banners from the dispatch socket, the Online / Offline switch.
- Schedule: the nurse's visits from `GET /provider/me/orders`, the request card from `GET /provider/requests/available`, navigate / call / "on my way", "running late" (filed as a visit issue), giving back the **whole** order, and past visits with filters (done in the app).
- Until `open-jobs` exists, a development build of the app shows **sample** open jobs so the screens can be seen. A release build shows nothing there.

---

## 3. The requirements

### A. Open jobs (PB-01, PB-02, PB-06, PB-10, PB-11)

**Why.** The Schedule shows bookings "open near you" days ahead, and instant requests that stay available after the nurse's own 30 seconds ("Needed now"). Today a scheduled visit is first offered 60 minutes before it starts (`process_scheduled_dispatch_cron`), and an instant request is in a nurse's list only while **her** offer is open (`offer_service`).

**Endpoint**

```
GET /api/ancillary/provider/me/open-jobs?from=2026-11-24&to=2026-11-26
```

```json
{
  "success": true,
  "data": {
    "needed": [ OpenJob ],
    "nearby": [ OpenJob ]
  }
}
```

`OpenJob`:

```json
{
  "id": "request public id",
  "kind": "scheduled",
  "patientName": "Lakshmi R.",
  "ageGender": "68 F",
  "area": "Koramangala 4th Block",
  "distanceKm": 3.4,
  "services": [
    { "name": "Wound dressing", "minutes": 30 },
    { "name": "IV injection", "minutes": 15 },
    { "name": "Vitals check", "minutes": 15 }
  ],
  "minutesPerVisit": 60,
  "days": [
    { "date": "2026-11-24", "startTime": "10:00", "clash": null },
    { "date": "2026-11-25", "startTime": "10:00", "clash": "Clashes with Meena J. · 9:30–10:30 AM" }
  ],
  "note": "Knee replacement 10 days ago. Dressing on the left knee.",
  "bookedBy": "Booked by her son, Arun R.",
  "postedAgo": "Posted 2 h ago",
  "respondBy": "Respond by 9:00 PM today",
  "waiting": null,
  "feePerVisit": 399
}
```

`kind` is `instant` or `scheduled`. `waiting` (instant only) is how long the request has been searching, e.g. `"6 min"`.

**Rules**

1. **`nearby`**: scheduled bookings no nurse has taken, in the nurse's speciality, inside her service radius of the patient, starting inside the listing window (setting `SCHEDULED_LISTING_HOURS`, suggested 48), not hidden (group B) or released by her. **Online is not required to browse.** A day she already has something on carries `clash` (the text) instead of being dropped.
2. **`needed`**: every instant request still `SEARCHING`, and every scheduled visit already sent out and not taken, near her (same radius rule). Taking one is the existing `POST /provider/requests/{id}/accept`, which must work **without a live offer** for these (as accepting a scheduled visit does today).
3. **Position.** The radius needs a position. Today only her last GPS is stored (`current_lat`, `current_lng`). A saved home base would be better (**schema change**: decide first); until then use the last GPS.
4. **Busy check (PB-06).** One shared helper answering "does she hold something overlapping `[start − buffer, end + buffer]`?" over her accepted visits and her active instant job. Use it in: this list (`days[].clash`), every accept (`409 NURSE_BUSY`, message names the clashing visit) and the choice of who is offered an instant request. Buffer: `NURSE_JOB_BUFFER_MINUTES` (30) either side; an instant job counts as the sum of its procedures' `estimated_duration_mins`, else `INSTANT_JOB_MINUTES` (90). A held visit wins over an instant request.
5. **`feePerVisit` (PB-10)** is `provider_service.provider_payout` for one visit.
6. **`respondBy` (PB-11)** is the time the booking stops being listed or is sent out like an instant request. What it means is the team's decision.
7. **Passive:** no push, no ring and no `ancillary_offers` row for the early list. The 60-minute broadcast stays as the safety net and still writes offers.

**Tests.** Window edges (47:59 and 48:01); an offline nurse sees the list; an out-of-radius nurse does not; a clash is flagged; hidden and released jobs are absent; an accepted job leaves every nurse's list; a missed instant request is still in `needed`.

### B. Pick days, hide a job (PB-03, PB-04)

```
POST /api/ancillary/provider/me/open-jobs/{id}/accept
{ "dates": ["2026-11-24", "2026-11-26"] }
```
- Assign her to exactly those days (one assignment per visit, as a per-visit dispatched order does today). The other days stay open for other nurses. Tell the family who visits each day (`notify_*`).
- Errors: `409 ALREADY_TAKEN` (a day is already assigned), `409 NURSE_BUSY` (overlap), `409 DAY_NOT_OPEN`.

```
POST /api/ancillary/provider/me/open-jobs/{id}/hide
{ "reason": "Too far from me" }
```
- Reasons: Too far from me / Timing doesn't suit me / Needs skills I don't have / Other reason.
- The job stays open for others and no longer shows for her. **Schema change:** a per-nurse hide (or reuse an offer outcome if the team prefers). Keep the reason.

### C. Give back one day or the rest (PB-05)

```
POST /api/ancillary/provider/me/visits/{visitId}/release
{ "scope": "DAY", "reason": "Emergency / unwell", "note": null }
```
`scope`: `DAY` (that day) or `REMAINING` (that day and every later day she holds).

- Today the only give-back is `POST /provider/requests/{id}/cancel`, which hands back **every** day she holds of the order. So the app offers only "Release all remaining days" for a multi-day order and cannot offer "release this one day".
- Offer the released days to other nurses nearby through the existing broadcast (without her), tell the family who is coming, and record the **hand-back time** (so a late-release rule can be added later).
- The app's sheet says "Release at least 12 hours before the visit when you can." A server rule for it is a team decision.

### D. Early-accept safety (PB-12)

An early accept is worse than today unless these exist:
1. **Reminders:** a `notify_*` push to the nurse 2 hours and 30 minutes before the start, once each (store which were sent).
2. **Deadline:** a visit still `ACCEPTED` (not `EN_ROUTE`) 30 minutes before the start goes back out to other nurses through the existing broadcast, without her. The patient is told only if nobody takes it by the start (the existing `UNASSIGNED` path).

Both belong in `process_scheduled_dispatch_cron`. Ship them together with group A.

### E. "Running late" (PB-07)

```
POST /api/ancillary/provider/me/visits/{visitId}/running-late
{ "minutes": 10 }
```
A `notify_*` push to the patient with names and times only. Today the app files a `RUNNING_LATE` visit issue for the care team and the patient is not told.

### F. More on the request card and sheet (PB-08, PB-16)

Extend each item of `GET /provider/requests/available`, and the dispatch push payload:

```json
{
  "expiresInMs": 21000,
  "ageGender": "29 yrs · Female",
  "area": "Koramangala 5th Block",
  "etaMinutes": 14,
  "services": [ { "name": "IM injection", "minutes": 15 } ],
  "note": "Antibiotic injection prescribed this afternoon.",
  "providerPayout": 199
}
```
- `expiresInMs` is the time left on **her** offer. The push already has `expiresAt`; the polled list has none, so the app counts 30 s from when it first sees the offer.
- `providerPayout` is `provider_payout` ("You earn"). The app shows what she collects after the visit until this exists.
- Keep the patient's full address and phone out of a broadcast offer (as now).

### G. Richer rows and cards (PB-09, PB-14, PB-15)

On `GET /provider/me/orders` and the visits of `GET /provider/me/today`, per visit:

```json
{
  "booking_type": "INSTANT",
  "accepted_at": "2026-11-23T11:40:00+05:30",
  "started_at": null,
  "patient": { "age": 34, "gender": "Male" },
  "services": [ { "name": "Injection", "minutes": 15 } ],
  "care_tags": [ "Diabetic", "Left foot ulcer" ],
  "end_reason": "CANCELLED_BY_FAMILY"
}
```
- `booking_type` per visit: the app recognises an instant visit today only by its missing start time.
- `accepted_at` / `started_at`: an accepted instant visit has no slot, so the app shows it as "Now" on today. A finished one currently appears under today even if it was last week.
- `patient.age`, `patient.gender`, `services`, `care_tags` replace the app's extra call to each visit's details for the first four "Up next" cards (up to four extra calls per refresh today).
- `end_reason` distinguishes "cancelled by family" from "released by her" for the Past list.
- **Past visits:** server-side filters and paging on the orders endpoint (`from`, `to`, `status`, `type`, `q` for the patient name, `page`, `page_size`) instead of filtering in the app.
- **Optional:** the nurse's area label (the neighbourhood of the last location the server holds) on `/ancillary/me/profile-hub` or `/provider/me/today`. Today the header pill gets the name from the phone's own position.

### H. Notes after a visit (PB-13)

`update_visit_progress` saves notes only while the visit is `IN_PROGRESS` (`409 VISIT_NOT_IN_PROGRESS` afterwards). Allow **notes only** on a `COMPLETED` visit for a limited time (suggested 24 hours), and extend `GET /provider/me/today`:

```json
{
  "notes_pending": [
    { "visit_public_id": "…", "patient_name": "Rekha M.", "service_name": "Injection", "completed_at": "…" }
  ]
}
```
(visits completed in the last 7 days with no notes yet). The app then shows a "Visit notes to finish" row on Home. Until then that row is left out, because it would lead nowhere.

---

## 4. Decisions needed from the team

| Decision | Suggested |
|---|---|
| Listing window for early jobs | 48 hours (`SCHEDULED_LISTING_HOURS`) |
| Where the service radius is measured from | Last GPS now; a saved home base later (schema change) |
| Busy buffer | 30 min either side; an instant job counts as its procedures' durations, else 90 min |
| Instant request vs a held visit | The held visit wins; never offer an instant request inside the buffer |
| Reminders / "on the way" deadline | 2 h and 30 min before / 30 min before the start |
| Late release | Record the hand-back time now; add a rule later |
| Respond-by | Decide what it means (stops being listed, or is sent out like an instant request) |
| Notes window after completion | 24 hours |

## 5. Acceptance checklist

- [ ] `GET /provider/me/open-jobs` returns `nearby` and `needed` as above and respects radius, window, hidden and clash rules.
- [ ] A missed instant request is still in `needed`, and can be accepted without a live offer.
- [ ] `accept` with `dates` assigns only those days; the other days stay open; the family is told.
- [ ] `hide` removes the job for that nurse only, and keeps the reason.
- [ ] `release` with `DAY` / `REMAINING` re-offers the days without her and records the hand-back time.
- [ ] Reminders (2 h, 30 min) and the 30-minute "on the way" deadline run in the dispatch cron, once each.
- [ ] `running-late` notifies the patient with names and times only.
- [ ] The offer payload carries `expiresInMs`, age / gender, area, ETA, services, note and `providerPayout`.
- [ ] Orders and Today carry `booking_type`, `accepted_at`, `patient.age/gender`, `services`, `care_tags`, `end_reason`; the orders endpoint filters and pages.
- [ ] Notes can be saved on a just-completed visit; Today returns `notes_pending`.
- [ ] Tests for each item; one Alembic head; `ruff` and `pytest` pass.

## 6. Testing against the app

`scripts/seed_ancillary_provider_demo_data.py` (backend repo) seeds a provider (default `users.id = 201`; start and completion code `1234`) with today's visits, a 5-day course, a 2-day booking, single visits and past visits of every ending (completed, patient not home, cancelled by the family, released by the nurse). Re-run it each day. It cannot create open jobs, picked days or released days, because the work above does not exist yet.
