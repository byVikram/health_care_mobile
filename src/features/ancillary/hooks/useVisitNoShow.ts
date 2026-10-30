// src/features/ancillary/hooks/useVisitNoShow.ts
//
// What the patient has answered about a visit the provider reported as a no-show (GET /patient/visits/{id}/no-show):
// still to answer, recorded as missed (valid), not counted (invalid) or being reviewed. Loaded when the screen opens;
// `reload` after the patient replies. A failed load keeps `info` empty and the banner shows its first state.
import { useCallback, useEffect, useState } from 'react'
import { getVisitNoShow, type VisitNoShowInfo } from '../ancillaryNoShowService'

export function useVisitNoShow(visitId: string | null) {
	const [info, setInfo] = useState<VisitNoShowInfo | null>(null)

	const reload = useCallback(async () => {
		if (!visitId) return
		try {
			setInfo(await getVisitNoShow(visitId))
		} catch {
			// Keep what we had: the banner still lets the patient answer.
		}
	}, [visitId])

	useEffect(() => {
		void reload()
	}, [reload])

	return { info, reload }
}
