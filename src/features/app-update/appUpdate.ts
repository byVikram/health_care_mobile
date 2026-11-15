// src/features/app-update/appUpdate.ts
//
// The rule behind the update popup. The backend (GET /api/lookup/app-config?platform=..., `app_update`) sends the newest
// published build; the app compares its OWN build number (expo-application's nativeBuildVersion, an integer) with the
// two integers it carries. Version names ("1.2.0") are only shown, never compared.

import type { AppUpdate } from '../../services/homeService'

export type UpdateKind =
	/** Installed build is supported and up to date (or there is nothing to compare): show nothing. */
	| 'none'
	/** A newer build exists and this one still works: "Later" is allowed. */
	| 'optional'
	/** Installed build is below the minimum supported one: it must update to go on. */
	| 'required'

export const updateKind = (installedBuild: number, update: AppUpdate | null | undefined): UpdateKind => {
	if (!update || !Number.isFinite(installedBuild)) return 'none'
	if (installedBuild < update.min_supported_version) return 'required'
	if (installedBuild < update.version_code) return 'optional'
	return 'none'
}

/** Only web links are opened; the server decides which one (a direct APK link now, a store link later). */
export const isDownloadUrl = (url: string | null | undefined): url is string => /^https?:\/\/\S+$/i.test(url ?? '')
