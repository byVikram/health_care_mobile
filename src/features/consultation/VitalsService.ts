import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { VitalHistoryRow, VitalStat } from '../../types/consultation'

export interface VitalsPayload {
	stats: VitalStat[]
	history: Record<string, VitalHistoryRow[]>
}

export interface VitalRecord {
	id: string
	vital_type: string
	recorded_at: string
	value: Record<string, unknown>
	created_at: string
}

export interface ReportRecord {
	id: string
	report_type: string
	report_date: string
	file_s3_key: string
	notes?: string | null
	created_at: string
}

export interface VitalsHistoryParams {
	vital_type: string
	days?: number
}

interface PatientDetailsMetricsResponse {
	success: boolean
	data?: {
		personal?: {
			height?: string
			weight?: string
		}
	}
}

interface LatestVitalsApiResponse {
	success: boolean
	data: Record<string, VitalRecord | null>
}

interface VitalApiResponse {
	success: boolean
	data: VitalRecord[]
}

interface PatientMetrics {
	heightCm: number | null
	weightKg: number | null
}

type VitalValue = Record<string, unknown>

const OTHER_VITAL_TYPES = ['others', 'temperature', 'spo2'] as const

const SUMMARY_CONFIG: Record<string, { unit: string; getValue: (value: VitalValue) => string }> = {
	temperature: {
		unit: 'F',
		getValue: (value) => String(value.temperature ?? value.value ?? '-'),
	},
	blood_pressure: {
		unit: 'mm/Hg',
		getValue: (value) => {
			const sys = value.systolic ?? value.morning_systolic
			const dia = value.diastolic ?? value.morning_diastolic

			if (sys && dia) return `${sys}/${dia}`
			return String(value.morning ?? '-')
		},
	},
	glucose_level: {
		unit: 'mg/dL',
		getValue: (value) => String(value.fasting ?? value.random ?? value.post_meal ?? value.value ?? '-'),
	},
	spo2: {
		unit: '%',
		getValue: (value) => String(value.spo2 ?? value.value ?? '-'),
	},
}

const ROW_MAPPERS: Record<string, (value: VitalValue) => Record<string, string>> = {
	bp: (value) => ({
		morning:
			hasValue(value.systolic) && hasValue(value.diastolic)
				? `${value.systolic}/${value.diastolic} mmHg`
				: hasValue(value.morning)
					? String(value.morning)
					: '-',
		evening: hasValue(value.evening) ? String(value.evening) : '-',
	}),
	glucose: (value) => ({
		fasting: formatValueWithUnit(value.fasting, 'mg/dL'),
		random: formatValueWithUnit(value.random ?? value.post_meal, 'mg/dL'),
	}),
	weight: (value) => ({
		weight: formatValueWithUnit(value.weight ?? value.value, 'Kg'),
	}),
	others: (value) => ({
		waist: hasValue(value.waist) ? String(value.waist) : '-',
		hba1c: hasValue(value.hba1c) ? String(value.hba1c) : '-',
		ldl: hasValue(value.ldl) ? String(value.ldl) : '-',
		hdl: hasValue(value.hdl) ? String(value.hdl) : '-',
		tgl: hasValue(value.tgl) ? String(value.tgl) : '-',
		respRate: hasValue(value.resp_rate) ? String(value.resp_rate) : '-',
		pulseRate: hasValue(value.pulse_rate) ? String(value.pulse_rate) : '-',
		spo2: hasValue(value.spo2) ? String(value.spo2) : '-',
		temp: hasValue(value.temperature) ? String(value.temperature) : '-',
	}),
}

function hasValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== ''
}

function toNumber(value: unknown): number | null {
	if (!hasValue(value)) return null

	const numericValue = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numericValue) ? numericValue : null
}

function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
	if (!weightKg || !heightCm || heightCm <= 0) return null
	return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1))
}

function formatShortDate(dateStr?: string): string {
	if (!dateStr) return ''
	const date = new Date(dateStr)
	if (Number.isNaN(date.getTime())) return ''

	return date.toLocaleDateString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit',
	})
}

function formatRecordedAt(dateStr?: string): string {
	if (!dateStr) return ''
	const date = new Date(dateStr)
	if (Number.isNaN(date.getTime())) return ''

	return `${date.toLocaleDateString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function formatValueWithUnit(value: unknown, unit: string): string {
	return hasValue(value) ? `${value} ${unit}` : '-'
}

function normalizeVitalValue(
	vitalType: string,
	value: Record<string, unknown>,
	metrics?: PatientMetrics
): Record<string, unknown> {
	const normalizedValue = { ...value }

	switch (vitalType) {
		case 'glucose_level': {
			const randomValue = normalizedValue.random ?? normalizedValue.post_meal ?? normalizedValue.value

			if (hasValue(randomValue)) {
				normalizedValue.random = randomValue
				normalizedValue.post_meal = normalizedValue.post_meal ?? randomValue
			}

			normalizedValue.unit = normalizedValue.unit ?? 'mg/dL'
			return normalizedValue
		}

		case 'temperature': {
			const temperatureValue = normalizedValue.temperature ?? normalizedValue.value

			if (hasValue(temperatureValue)) {
				normalizedValue.temperature = temperatureValue
				normalizedValue.value = temperatureValue
			}

			normalizedValue.unit = normalizedValue.unit ?? 'F'
			return normalizedValue
		}

		case 'spo2': {
			const spo2Value = normalizedValue.spo2 ?? normalizedValue.value

			if (hasValue(spo2Value)) {
				normalizedValue.spo2 = spo2Value
				normalizedValue.value = spo2Value
			}

			normalizedValue.unit = normalizedValue.unit ?? '%'
			return normalizedValue
		}

		case 'weight': {
			const weightKg = toNumber(normalizedValue.value ?? normalizedValue.weight) ?? metrics?.weightKg ?? null
			const heightCm = toNumber(normalizedValue.height) ?? metrics?.heightCm ?? null
			const bmi = calculateBmi(weightKg, heightCm)

			if (weightKg !== null) {
				normalizedValue.value = weightKg
				normalizedValue.weight = weightKg
			}

			if (heightCm !== null) {
				normalizedValue.height = heightCm
			}

			if (bmi !== null) {
				normalizedValue.bmi = bmi
			}

			normalizedValue.unit = normalizedValue.unit ?? 'kg'
			return normalizedValue
		}

		default:
			return normalizedValue
	}
}

function normalizeVitalRecord(record: VitalRecord, metrics?: PatientMetrics): VitalRecord {
	return {
		...record,
		value: normalizeVitalValue(record.vital_type, record.value ?? {}, metrics),
	}
}

function sortByRecordedAtDesc(a: VitalRecord, b: VitalRecord): number {
	return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
}

function mergeOtherVitals(records: VitalRecord[]): VitalRecord[] {
	const mergedRecords = new Map<string, VitalRecord>()

	for (const record of records) {
		const existingRecord = mergedRecords.get(record.recorded_at)

		if (!existingRecord) {
			mergedRecords.set(record.recorded_at, {
				...record,
				vital_type: 'others',
				value: { ...record.value },
			})
			continue
		}

		mergedRecords.set(record.recorded_at, {
			...existingRecord,
			value: {
				...existingRecord.value,
				...record.value,
			},
		})
	}

	return Array.from(mergedRecords.values()).sort(sortByRecordedAtDesc)
}

async function getPatientMetrics(patientPublicId: string): Promise<PatientMetrics> {
	const response = await ApiService.get<PatientDetailsMetricsResponse>(API_ENDPOINTS.PATIENT.GET_BY_PUBLIC_ID(patientPublicId))
	const personal = response.data.data?.personal

	return {
		heightCm: toNumber(personal?.height) ?? null,
		weightKg: toNumber(personal?.weight) ?? null,
	}
}

async function fetchVitalsHistory(
	patientPublicId: string,
	params: VitalsHistoryParams
): Promise<VitalRecord[]> {
	const queryParams: Record<string, unknown> = { vital_type: params.vital_type }

	if (params.days !== undefined) {
		queryParams.days = params.days
	}

	const response = await ApiService.getWithParams<VitalApiResponse>(
		API_ENDPOINTS.PATIENT.VITALS_HISTORY(patientPublicId),
		queryParams
	)

	return response.data.data ?? []
}

export async function getLatestVitals(
	patientPublicId: string,
	metrics?: PatientMetrics | null
): Promise<Record<string, VitalRecord | null>> {
	const [response, resolvedMetrics] = await Promise.all([
		ApiService.get<LatestVitalsApiResponse>(API_ENDPOINTS.PATIENT.VITALS_LATEST(patientPublicId)),
		metrics !== undefined ? Promise.resolve(metrics) : getPatientMetrics(patientPublicId).catch(() => null),
	])

	return Object.fromEntries(
		Object.entries(response.data.data ?? {}).map(([vitalType, record]) => [
			vitalType,
			record ? normalizeVitalRecord(record, resolvedMetrics ?? undefined) : null,
		])
	)
}

export async function getVitalsHistory(
	patientPublicId: string,
	params: VitalsHistoryParams,
	metrics?: PatientMetrics | null
): Promise<VitalRecord[]> {
	const metricsPromise = metrics !== undefined ? Promise.resolve(metrics) : getPatientMetrics(patientPublicId).catch(() => null)

	if (params.vital_type === 'others') {
		const [resolvedMetrics, vitalGroups] = await Promise.all([
			metricsPromise,
			Promise.all(
				OTHER_VITAL_TYPES.map((vitalType) =>
					fetchVitalsHistory(patientPublicId, { vital_type: vitalType, days: params.days })
				)
			),
		])

		return mergeOtherVitals(
			vitalGroups
				.flat()
				.map((record) => normalizeVitalRecord(record, resolvedMetrics ?? undefined))
		)
	}

	const [resolvedMetrics, records] = await Promise.all([
		metricsPromise,
		fetchVitalsHistory(patientPublicId, params),
	])

	return records.map((record) => normalizeVitalRecord(record, resolvedMetrics ?? undefined))
}

function getLatestSummary(record: VitalRecord | null, type: string): { value: string; unit: string; date: string } {
	if (!record) {
		return {
			value: '-',
			unit: '',
			date: '',
		}
	}

	const config = SUMMARY_CONFIG[type]

	if (!config) {
		return {
			value: '-',
			unit: '',
			date: '',
		}
	}

	return {
		value: config.getValue(record.value),
		unit: config.unit,
		date: formatShortDate(record.recorded_at),
	}
}

function getBmiCategory(bmi: number): string {
	if (bmi < 18.5) return 'Underweight'
	if (bmi < 25) return 'Normal'
	if (bmi < 30) return 'Overweight'
	return 'Obese'
}

export function mapLatestVitalsToStats(latestVitals: Record<string, VitalRecord | null>): VitalStat[] {
	const tempSummary = getLatestSummary(latestVitals.temperature ?? null, 'temperature')
	const bpSummary = getLatestSummary(latestVitals.blood_pressure ?? null, 'blood_pressure')
	const glucoseSummary = getLatestSummary(latestVitals.glucose_level ?? null, 'glucose_level')
	const spo2Summary = getLatestSummary(latestVitals.spo2 ?? null, 'spo2')
	const weightRecord = latestVitals.weight ?? null
	const weightValue = weightRecord?.value ?? {}
	const weightKg = toNumber(weightValue.value ?? weightValue.weight)
	const heightCm = toNumber(weightValue.height)
	const bmi = toNumber(weightValue.bmi) ?? calculateBmi(weightKg, heightCm)

	const stats: VitalStat[] = [
		{ id: 'temp', label: 'Body Temperature', value: tempSummary.value, unit: tempSummary.unit, date: tempSummary.date },
		{ id: 'bp', label: 'Blood Pressure', value: bpSummary.value, unit: bpSummary.unit, date: bpSummary.date },
		{
			id: 'glucose',
			label: 'Blood Glucose Level',
			value: glucoseSummary.value,
			unit: glucoseSummary.unit,
			date: glucoseSummary.date,
		},
		{
			id: 'weight',
			label: 'Weight',
			value: weightKg !== null ? String(weightKg) : '-',
			unit: weightRecord ? 'Kg' : '',
			date: weightRecord ? formatShortDate(weightRecord.recorded_at) : '',
		},
		{
			id: 'heightBmi',
			label: 'Height',
			value: heightCm !== null ? String(heightCm) : '-',
			unit: heightCm !== null ? 'cm' : '',
			date: weightRecord ? formatShortDate(weightRecord.recorded_at) : '',
			bmiValue: bmi !== null ? String(bmi) : '-',
			bmiCategory: bmi !== null ? getBmiCategory(bmi) : '-',
		},
		{
			id: 'spo2',
			label: 'Oxygen Saturation (spO2)',
			value: spo2Summary.value,
			unit: spo2Summary.unit,
			date: spo2Summary.date,
		},
	]

	return stats
}

export function mapVitalToRow(vital: VitalRecord, tabId: string, index: number): VitalHistoryRow {
	const mapper = ROW_MAPPERS[tabId]

	return {
		id: String(vital.id ?? index),
		date: formatRecordedAt(vital.recorded_at),
		cells: mapper ? mapper(vital.value) : {},
	}
}

export async function getPatientReports(patientPublicId: string): Promise<ReportRecord[]> {
	const response = await ApiService.get<{
		success: boolean
		data: ReportRecord[]
	}>(API_ENDPOINTS.PATIENT.REPORTS(patientPublicId))

	return response.data.data ?? []
}

export const vitalsService = {
	getLatestVitals,
	getVitalsHistory,
	getPatientReports,
	mapLatestVitalsToStats,
	mapVitalToRow,
}
