// src/components/common/display/AppCarousel.tsx
//
// Horizontal paging carousel from the KarolaHealth designs (Home "Offers" banner): full-bleed
// cards snapped one at a time, optional auto-play (design: every 4500ms) that pauses while the
// user drags and resumes afterwards, and pill page dots (active 20px wide in primary).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	FlatList,
	LayoutChangeEvent,
	ListRenderItemInfo,
	NativeScrollEvent,
	NativeSyntheticEvent,
	StyleProp,
	StyleSheet,
	TouchableOpacity,
	useWindowDimensions,
	View,
	ViewStyle,
} from 'react-native'
import { APP_COLORS } from '../../../config/theme'


export interface AppCarouselRenderInfo<T> {
	item: T
	index: number
	/** True for the slide currently snapped into view. */
	active: boolean
}

export interface AppCarouselProps<T> {
	data: readonly T[]
	renderItem: (info: AppCarouselRenderInfo<T>) => React.ReactElement | null
	keyExtractor?: (item: T, index: number) => string
	/** Slide width. Defaults to the window width minus 32 (16px gutters). */
	itemWidth?: number
	/** Space between slides (default 12, as in the design). */
	gap?: number
	/** Advance automatically every `autoPlayInterval` ms. */
	autoPlay?: boolean
	autoPlayInterval?: number
	/** Wrap from the last slide back to the first when auto-playing. */
	loop?: boolean
	/** Show the page dots (default true when there is more than one slide). */
	dots?: boolean
	onIndexChange?: (index: number) => void
	/** Accessibility label for the carousel, e.g. "Offers". */
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppCarousel<T>({
	data,
	renderItem,
	keyExtractor,
	itemWidth,
	gap = 12,
	autoPlay = false,
	autoPlayInterval = 4500,
	loop = true,
	dots = true,
	onIndexChange,
	accessibilityLabel,
	style,
}: AppCarouselProps<T>) {
	const { width: windowWidth } = useWindowDimensions()
	const [containerWidth, setContainerWidth] = useState(windowWidth)
	const [index, setIndex] = useState(0)
	const [dragging, setDragging] = useState(false)
	const listRef = useRef<FlatList<T>>(null)
	const indexRef = useRef(0)
	const onIndexChangeRef = useRef(onIndexChange)
	onIndexChangeRef.current = onIndexChange

	const count = data.length
	const slideWidth = itemWidth ?? windowWidth - 32
	const interval = slideWidth + gap
	const inset = Math.max(0, (containerWidth - slideWidth) / 2)

	const updateIndex = useCallback((next: number) => {
		if (next === indexRef.current) return
		indexRef.current = next
		setIndex(next)
		onIndexChangeRef.current?.(next)
	}, [])

	const goTo = useCallback(
		(next: number, animated = true) => {
			listRef.current?.scrollToOffset({ offset: next * interval, animated })
			updateIndex(next)
		},
		[interval, updateIndex]
	)

	// Keep the index valid if the data shrinks.
	useEffect(() => {
		if (count > 0 && indexRef.current > count - 1) goTo(count - 1, false)
	}, [count, goTo])

	// Auto-play: one timeout per slide, re-armed whenever the index changes; cleared while
	// dragging and on unmount.
	useEffect(() => {
		if (!autoPlay || dragging || count < 2) return
		const timer = setTimeout(() => {
			const next = index + 1
			if (next < count) goTo(next)
			else if (loop) goTo(0)
		}, autoPlayInterval)
		return () => clearTimeout(timer)
	}, [autoPlay, autoPlayInterval, count, dragging, goTo, index, loop])

	const indexFromEvent = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const raw = Math.round(e.nativeEvent.contentOffset.x / interval)
		return Math.max(0, Math.min(count - 1, raw))
	}

	const handleLayout = (e: LayoutChangeEvent) => {
		const w = e.nativeEvent.layout.width
		if (w > 0 && w !== containerWidth) setContainerWidth(w)
	}

	const Separator = useMemo(() => {
		const Gap = () => <View style={{ width: gap }} />
		return Gap
	}, [gap])

	const renderSlide = ({ item, index: i }: ListRenderItemInfo<T>) => (
		<View style={{ width: slideWidth }}>{renderItem({ item, index: i, active: i === index })}</View>
	)

	const showDots = dots && count > 1

	return (
		<View style={[styles.root, style]} accessibilityLabel={accessibilityLabel} onLayout={handleLayout}>
			<FlatList
				ref={listRef}
				data={data as T[]}
				renderItem={renderSlide}
				keyExtractor={keyExtractor ?? ((_, i) => String(i))}
				horizontal
				showsHorizontalScrollIndicator={false}
				snapToInterval={interval}
				snapToAlignment="start"
				decelerationRate="fast"
				disableIntervalMomentum
				contentContainerStyle={{ paddingHorizontal: inset }}
				ItemSeparatorComponent={Separator}
				getItemLayout={(_, i) => ({ length: interval, offset: inset + i * interval, index: i })}
				onScrollBeginDrag={() => setDragging(true)}
				onScrollEndDrag={(e) => {
					setDragging(false)
					updateIndex(indexFromEvent(e))
				}}
				onMomentumScrollEnd={(e) => updateIndex(indexFromEvent(e))}
				extraData={index}
			/>
			{showDots ? (
				<View style={styles.dots}>
					{data.map((_, i) => {
						const on = i === index
						return (
							<TouchableOpacity
								key={i}
								style={styles.dotHit}
								onPress={() => goTo(i)}
								accessibilityRole="button"
								accessibilityLabel={`Show slide ${i + 1} of ${count}`}
								accessibilityState={{ selected: on }}
							>
								<View style={[styles.dot, on ? styles.dotActive : styles.dotInactive]} />
							</TouchableOpacity>
						)
					})}
				</View>
			) : null}
		</View>
	)
}

export default AppCarousel

const styles = StyleSheet.create({
	root: {
		gap: 6,
	},
	dots: {
		flexDirection: 'row',
		justifyContent: 'center',
	},
	dotHit: {
		width: 24,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: {
		height: 6,
		borderRadius: 9999,
	},
	dotActive: {
		width: 20,
		backgroundColor: APP_COLORS.primary,
	},
	dotInactive: {
		width: 6,
		backgroundColor: APP_COLORS.dotInactive,
	},
})
