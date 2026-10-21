// src/navigation/tabBar.ts
//
// Geometry of the floating labelled tab bar (MainTabNavigator's LabelledTabBar, used by patient, doctor and
// ancillary provider): a 66-high pill, 16 + safe-area from the bottom. On floating routes (Home, patient Bookings) the bar overlays the screen, so
// scrollable content should end with `useTabBarClearance()` (or TAB_BAR_CLEARANCE + insets.bottom) of
// bottom padding to scroll clear of the pill.
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from './routes'

export const FLOATING_TAB_BAR_HEIGHT = 66
export const FLOATING_TAB_BAR_BOTTOM = 16

/** Bottom padding (excluding the safe-area inset) that keeps the last item clear of the floating pill. */
export const TAB_BAR_CLEARANCE = FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_BOTTOM + 16

/** Tab routes whose content scrolls underneath the pill (others get an in-flow band instead). */
export const FLOATING_TAB_ROUTES: readonly string[] = [
	ROUTES.MAIN.HOME,
	ROUTES.MAIN.PORTAL,
	ROUTES.MAIN.SCHEDULE,
	ROUTES.MAIN.ENGAGE,
]

/** TAB_BAR_CLEARANCE plus the device's bottom safe-area inset. */
export function useTabBarClearance() {
	const insets = useSafeAreaInsets()
	return TAB_BAR_CLEARANCE + insets.bottom
}
