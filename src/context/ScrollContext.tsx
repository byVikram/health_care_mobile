import React, { createContext, useContext, useState } from 'react'
import { Animated } from 'react-native'

interface ScrollContextType {
	registerScrollY: (value: Animated.Value) => void
	unregisterScrollY: (value: Animated.Value) => void
	scrollY: Animated.Value | null
	headerHeight: number
	setHeaderHeight: (height: number) => void
}

const ScrollContext = createContext<ScrollContextType | null>(null)

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [activeScrollY, setActiveScrollY] = useState<Animated.Value | null>(null)
	const [headerHeight, setHeaderHeight] = useState<number>(0)

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
				headerHeight,
				setHeaderHeight,
			}}
		>
			{children}
		</ScrollContext.Provider>
	)
}

export const useScroll = () => {
	return useContext(ScrollContext)
}
