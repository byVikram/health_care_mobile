import React, { createContext, useContext, useState } from 'react'
import { Animated } from 'react-native'

interface ScrollContextType {
	registerScrollY: (value: Animated.Value) => void
	unregisterScrollY: (value: Animated.Value) => void
	scrollY: Animated.Value | null
}

const ScrollContext = createContext<ScrollContextType | null>(null)

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [activeScrollY, setActiveScrollY] = useState<Animated.Value | null>(null)

	const registerScrollY = (value: Animated.Value) => {
		setActiveScrollY(value)
	}

	const unregisterScrollY = (value: Animated.Value) => {
		setActiveScrollY((prev) => (prev === value ? null : prev))
	}

	return (
		<ScrollContext.Provider
			value={{
				registerScrollY,
				unregisterScrollY,
				scrollY: activeScrollY,
			}}
		>
			{children}
		</ScrollContext.Provider>
	)
}

export const useScroll = () => {
	return useContext(ScrollContext)
}
