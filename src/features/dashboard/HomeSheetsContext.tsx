// src/features/dashboard/HomeSheetsContext.tsx
//
// Which patient-home sheet is open: "More services" (1b), "Healthcare at home" (1c) or "My health QR".
// Opened from the Home quick actions / offers, the floating tab bar and the drawer; the sheets themselves
// are rendered once by <HomeSheetsHost /> (mounted inside this provider).
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type HomeSheetKey = 'more' | 'ancillary' | 'qr'

interface HomeSheetsContextValue {
	openSheet: HomeSheetKey | null
	open: (sheet: HomeSheetKey) => void
	close: () => void
}

const HomeSheetsContext = createContext<HomeSheetsContextValue>({
	openSheet: null,
	open: () => {},
	close: () => {},
})

export function HomeSheetsProvider({ children }: { children: React.ReactNode }) {
	const [openSheet, setOpenSheet] = useState<HomeSheetKey | null>(null)
	const open = useCallback((sheet: HomeSheetKey) => setOpenSheet(sheet), [])
	const close = useCallback(() => setOpenSheet(null), [])
	const value = useMemo(() => ({ openSheet, open, close }), [openSheet, open, close])
	return <HomeSheetsContext.Provider value={value}>{children}</HomeSheetsContext.Provider>
}

export const useHomeSheets = () => useContext(HomeSheetsContext)
