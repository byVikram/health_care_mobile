import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { VitalHistoryRow, VitalStat } from '../../types/consultation'

export interface VitalsPayload {
	stats: VitalStat[]
	history: Record<string, VitalHistoryRow[]>
}

const isObject = (value: unknown): value is Record<string, any> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown, fallback = '') => {
	if (value === null || value === undefined) return fallback
	return String(value)
}

const normalizeStatus = (value: unknown): 'normal' | 'abnormal' | undefined => {
	if (value === 'normal' || value === 'abnormal') return value
	if (value === true) return 'normal'
	if (value === false) return 'abnormal'
	return undefined
}

const normalizeStat = (raw: unknown, index: number): VitalStat | null => {
	if (!isObject(raw)) return null

	const id = asString(raw.id ?? raw.key ?? raw.type ?? raw.vital_type, `vital-${index}`)
	const value = raw.value ?? raw.latest_value ?? raw.reading

	if (value === undefined || value === null) return null

	return {
		id,
		label: asString(raw.label ?? raw.name ?? raw.title ?? id),
		value: asString(value),
		unit: asString(raw.unit ?? raw.units),
		date: asString(raw.date ?? raw.recorded_at ?? raw.created_at),
	}
}

const normalizeHistoryRow = (raw: unknown, index: number): VitalHistoryRow | null => {
	if (!isObject(raw)) return null

	const cellsSource = raw.cells ?? raw.readings ?? raw.values ?? {}
	const cells: Record<string, string> = {}
	const cellStatus: Record<string, 'normal' | 'abnormal'> = {}

	if (isObject(cellsSource)) {
		Object.entries(cellsSource).forEach(([key, cellValue]) => {
			if (isObject(cellValue)) {
				cells[key] = asString(cellValue.value ?? cellValue.reading ?? cellValue.label, '-')
				const status = normalizeStatus(cellValue.status ?? cellValue.is_normal)
				if (status) cellStatus[key] = status
				return
			}

			cells[key] = asString(cellValue, '-')
		})
	}

	if (isObject(raw.cellStatus)) {
		Object.entries(raw.cellStatus).forEach(([key, value]) => {
			const status = normalizeStatus(value)
			if (status) cellStatus[key] = status
		})
	}

	return {
		id: asString(raw.id ?? raw.uuid ?? index),
		date: asString(raw.date ?? raw.recorded_at ?? raw.created_at),
		cells,
		cellStatus: Object.keys(cellStatus).length > 0 ? cellStatus : undefined,
		hasDownload: Boolean(raw.hasDownload ?? raw.has_download ?? raw.report_url),
	}
}

const normalizeHistory = (rawHistory: unknown): Record<string, VitalHistoryRow[]> => {
	if (!rawHistory) return {}

	if (Array.isArray(rawHistory)) {
		return {
			bp: rawHistory.map(normalizeHistoryRow).filter((row): row is VitalHistoryRow => Boolean(row)),
		}
	}

	if (!isObject(rawHistory)) return {}

	return Object.entries(rawHistory).reduce<Record<string, VitalHistoryRow[]>>((acc, [key, rows]) => {
		if (!Array.isArray(rows)) return acc
		acc[key] = rows.map(normalizeHistoryRow).filter((row): row is VitalHistoryRow => Boolean(row))
		return acc
	}, {})
}

const unwrapVitalsResponse = (response: any) =>
	response?.data?.data?.vitals ??
	response?.data?.data ??
	response?.data?.vitals ??
	response?.data ??
	response?.vitals ??
	response

export const vitalsService = {
	getPatientVitals: async (patientId: string, period: string): Promise<VitalsPayload> => {
		const response = await ApiService.get(API_ENDPOINTS.VITALS.GET_BY_PATIENT(patientId), {
			params: { period },
		})
		const raw = unwrapVitalsResponse(response)
		const rawStats = raw?.stats ?? raw?.summary ?? raw?.latest ?? raw?.vital_stats ?? []
		const rawHistory = raw?.history ?? raw?.histories ?? raw?.rows ?? raw?.vital_history

		return {
			stats: Array.isArray(rawStats)
				? rawStats.map(normalizeStat).filter((stat): stat is VitalStat => Boolean(stat))
				: [],
			history: normalizeHistory(rawHistory),
		}
	},
}
