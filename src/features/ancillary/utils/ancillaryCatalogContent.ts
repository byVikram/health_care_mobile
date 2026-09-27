// src/features/ancillary/utils/ancillaryCatalogContent.ts
//
// Maps catalogue API items (procedures from /services, packages from /packages) into what the home-care
// catalogue shows: row tone/icon, the modern ServiceDetailsSheet content, and the booking cart item.
// Every optional backend field (mrp, duration_minutes, good_for, includes, prep_steps, visits_count,
// validity_days) is left out when missing, so the UI hides that row instead of faking it.
import type { ServiceDetailsContent, ServiceDetailsFact } from '../../../components/common'
import { TONE_ORDER, type ToneKey } from '../../../config/theme'
import type { AncillaryCartItem } from '../../../navigation/types'
import type { AncillaryPackageDetail, AncillaryPackageListItem, AncillaryServiceItem } from '../ancillaryService'
import {
	CATALOG_ICONS,
	categoryIconFor,
	formatDurationMinutes,
	plural,
	type AncillaryCatalogCopy,
	type CatalogIconPath,
} from './ancillaryCatalogCopy'

/** Procedures cycle mint → sky → lilac → peach → sand; packages start at lilac (as in the design). */
export const procedureTone = (index: number): ToneKey => TONE_ORDER[Math.abs(index) % TONE_ORDER.length]
export const packageTone = (index: number): ToneKey => TONE_ORDER[(Math.abs(index) + 2) % TONE_ORDER.length]

export const procedureName = (s: AncillaryServiceItem) => s.title || s.label || ''

export const procedureAbout = (s: AncillaryServiceItem) =>
	(s.about_service || s.aboutService || s.description || '').trim()

/** Icon for a procedure: keyword match on its name / category, else the medical-kit glyph. */
export const procedureIcon = (s: AncillaryServiceItem): CatalogIconPath =>
	categoryIconFor(`${procedureName(s)} ${s.categoryName ?? ''}`)

/** includes[] from the API, falling back to the older whats_included field. */
export const procedureIncludes = (s: AncillaryServiceItem): string[] => {
	if (s.includes && s.includes.length > 0) return s.includes
	const raw = s.whats_included ?? s.whatsIncluded
	if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
	if (typeof raw === 'string' && raw.trim()) {
		return raw
			.split('\n')
			.map((x) => x.trim().replace(/^[-•*]\s*/, ''))
			.filter(Boolean)
	}
	return []
}

const visitByFact = (copy: AncillaryCatalogCopy): ServiceDetailsFact => ({
	key: 'by',
	label: 'Visit by',
	value: copy.providerNoun.charAt(0).toUpperCase() + copy.providerNoun.slice(1),
	icon: CATALOG_ICONS.user,
	tone: 'lilac',
})

const whereFact: ServiceDetailsFact = {
	key: 'where',
	label: 'Where',
	value: 'At your home',
	icon: CATALOG_ICONS.home,
	tone: 'mint',
}

export const buildProcedureSheetContent = (
	s: AncillaryServiceItem,
	copy: AncillaryCatalogCopy,
	tone: ToneKey
): ServiceDetailsContent => {
	const duration = formatDurationMinutes(s.duration_minutes)
	const facts: ServiceDetailsFact[] = []
	if (duration) facts.push({ key: 'duration', label: 'Duration', value: duration, icon: CATALOG_ICONS.clock, tone: 'sky' })
	facts.push(visitByFact(copy), whereFact)
	return {
		id: s.id,
		kindLabel: copy.serviceKind,
		name: procedureName(s),
		tone,
		iconPath: procedureIcon(s),
		price: s.price,
		mrp: s.mrp,
		facts,
		about: procedureAbout(s),
		goodFor: s.good_for,
		includes: procedureIncludes(s).map((label) => ({ label })),
		prepTitle: copy.prepTitle,
		prepSteps: s.prep_steps ?? [],
		trustLine: copy.trustLine,
	}
}

export const buildPackageSheetContent = (
	pkg: AncillaryPackageListItem,
	detail: AncillaryPackageDetail | null,
	copy: AncillaryCatalogCopy,
	toneIndex: number,
	loadingDetail: boolean
): ServiceDetailsContent => {
	// The list item already carries the §1 fields; a non-empty value from the detail call wins.
	const pick = <K extends keyof AncillaryPackageListItem>(key: K): AncillaryPackageListItem[K] => {
		const v = detail?.[key as keyof AncillaryPackageDetail] as AncillaryPackageListItem[K] | undefined
		return v == null || v === '' || (Array.isArray(v) && v.length === 0) ? pkg[key] : v
	}
	const src = {
		duration_minutes: pick('duration_minutes'),
		visits_count: pick('visits_count'),
		validity_days: pick('validity_days'),
		includes: pick('includes'),
		prep_steps: pick('prep_steps'),
		good_for: pick('good_for'),
		mrp: pick('mrp'),
		description: pick('description'),
	}
	const duration = formatDurationMinutes(src.duration_minutes)
	const facts: ServiceDetailsFact[] = []
	if (src.visits_count)
		facts.push({
			key: 'visits',
			label: 'Visits',
			value: plural(src.visits_count, 'visit', 'visits'),
			icon: CATALOG_ICONS.calendar,
			tone: 'sand',
		})
	if (duration)
		facts.push({ key: 'duration', label: 'Per visit', value: duration, icon: CATALOG_ICONS.clock, tone: 'sky' })
	if (src.validity_days)
		facts.push({
			key: 'validity',
			label: 'Valid for',
			value: plural(src.validity_days, 'day', 'days'),
			icon: CATALOG_ICONS.box,
			tone: 'peach',
		})
	facts.push(visitByFact(copy))

	const ownIncludes = (src.includes ?? []).map((label) => ({ label }))
	const procedureIncludesList = (detail?.procedures ?? []).map((p) => ({ key: p.id, label: p.label }))
	const includes = ownIncludes.length > 0 ? ownIncludes : procedureIncludesList

	return {
		id: pkg.id,
		kindLabel: copy.packageKind,
		name: pkg.label,
		tone: packageTone(toneIndex),
		iconPath: CATALOG_ICONS.elder,
		price: pkg.packagePrice,
		mrp: src.mrp,
		facts,
		about: (src.description ?? '').trim(),
		goodFor: src.good_for,
		includes,
		includesLoading: loadingDetail && ownIncludes.length === 0,
		prepTitle: copy.prepTitle,
		prepSteps: src.prep_steps ?? [],
		trustLine: copy.trustLine,
	}
}

export const procedureCartItem = (s: AncillaryServiceItem): AncillaryCartItem => ({
	id: s.id,
	kind: 'procedure',
	name: procedureName(s),
	price: s.price,
	mrp: s.mrp ?? null,
	durationMinutes: s.duration_minutes ?? null,
})

export const packageCartItem = (p: AncillaryPackageListItem): AncillaryCartItem => ({
	id: p.id,
	kind: 'package',
	name: p.label,
	price: p.packagePrice,
	mrp: p.mrp ?? null,
	durationMinutes: p.duration_minutes ?? null,
})
