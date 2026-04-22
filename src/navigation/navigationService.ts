import React from 'react'

// Create navigationRef in a separate file to avoid circular dependencies
export const navigationRef = React.createRef<any>()

export const navigate = (name: string, params?: any) => {
	if (navigationRef.current) {
		navigationRef.current.navigate(name, params)
	}
}

export const reset = (name: string) => {
	if (navigationRef.current) {
		navigationRef.current.reset({
			index: 0,
			routes: [{ name }],
		})
	}
}
