import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from './types'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function navigate<RouteName extends keyof RootStackParamList>(
	name: RouteName,
	params?: RootStackParamList[RouteName],
) {
	if (navigationRef.isReady()) {
		;(navigationRef as any).navigate(name, params)
	}
}

export function reset<RouteName extends keyof RootStackParamList>(
	name: RouteName,
	params?: RootStackParamList[RouteName]
) {
	if (navigationRef.isReady()) {
		navigationRef.reset({
			index: 0,
			routes: [{ name, params: params as any }],
		})
	}
}
