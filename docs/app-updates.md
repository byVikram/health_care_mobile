# App updates

The launch-time check that tells the app a newer build exists (optional) or that this one is too old (mandatory).

## Update check

Checked on every cold start, behind the splash (`features/app-update/`, no new API, no FCM). `useAppUpdateCheck` (run in `App.tsx`) makes ONE call to `GET /api/lookup/app-config?platform=android|ios` (`getAppConfig(platform)` in `homeService.ts`), capped at 3 s (the splash waits for it; offline, slow, failing or no published build all end as "show nothing"), and Home's first config read reuses that result (`seedAppConfigFromLaunch`). The installed build number is `expo-application`'s `nativeBuildVersion` (the Android versionCode, which EAS assigns with remote versioning); it is compared as an INTEGER with `app_update.version_code` (newer exists: optional, "Later" allowed) and `app_update.min_supported_version` (below it: mandatory, no way out but updating) in `appUpdate.ts`; `version_name` is only shown. `AppUpdateModal` is the "1.5 · Update required" design (Offline & Models.html): "Update now" opens `app_update.download_url` (a direct APK link now, a store link later, same code) and the card stays up. Publishing a build = a row in the backend's `app_versions` (see `health_care_backend/CLAUDE.md`); the row's `version_code` must be the versionCode EAS gave that build. `expo-application` is a native module: it needs a new build, and installs older than that build never check. Not run on a device yet: `npx tsc --noEmit` only.

## Not built / TODO

- Not run on a device yet: `npx tsc --noEmit` only.
