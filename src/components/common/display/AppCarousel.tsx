// src/components/common/display/AppCarousel.tsx
//
// Horizontal paging carousel from the KarolaHealth designs (Home "Offers" banner): full-bleed
// cards snapped one at a time, optional auto-play (design: every 4500ms) that pauses while the
// user drags and resumes afterwards, and pill page dots (active 20px wide in primary).
//
// With `loop` (the default) and more than one slide the carousel is truly endless in both
// directions: the slides are rendered as three back-to-back copies and the list always rests in the
// middle copy -- after every swipe or auto-advance that lands in an outer copy it silently jumps (no
// animation) to the same slide in the middle one, so 1 -> 2 -> 3 -> 1 -> 2 ... never hits an end.

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
	/** Endless looping: swiping or auto-playing past the last slide continues with the first (and vice versa). */
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
	// Position in the rendered (virtual) list; equals `index` when not looping.
	const vIndexRef = useRef(0)
	const offsetRef = useRef(0)
	const positionedRef = useRef(false)
	const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const onIndexChangeRef = useRef(onIndexChange)
	onIndexChangeRef.current = onIndexChange

	const count = data.length
	const loopOn = loop && count > 1
	// Three copies when looping; the middle one (indexes count..2count-1) is "home".
	const virtualData = useMemo(() => (loopOn ? ([...data, ...data, ...data] as T[]) : (data as T[])), [data, loopOn])
	const slideWidth = itemWidth ?? windowWidth - 32
	const interval = slideWidth + gap
	const inset = Math.max(0, (containerWidth - slideWidth) / 2)

	const updateIndex = useCallback((next: number) => {
		if (next === indexRef.current) return
		indexRef.current = next
		setIndex(next)
		onIndexChangeRef.current?.(next)
	}, [])

	const jumpTo = useCallback(
		(virtual: number, animated: boolean) => {
			vIndexRef.current = virtual
			offsetRef.current = virtual * interval
			listRef.current?.scrollToOffset({ offset: virtual * interval, animated })
		},
		[interval]
	)

	// If the list has come to rest in an outer copy, jump to the same slide in the middle copy.
	const settle = useCallback(() => {
		if (!loopOn) return
		const raw = Math.max(0, Math.round(offsetRef.current / interval))
		const real = ((raw % count) + count) % count
		vIndexRef.current = raw
		if (raw < count || raw >= 2 * count) jumpTo(count + real, false)
		updateIndex(real)
	}, [count, interval, jumpTo, loopOn, updateIndex])

	const clearSettleTimer = () => {
		if (settleTimer.current) clearTimeout(settleTimer.current)
		settleTimer.current = null
	}
	useEffect(() => clearSettleTimer, [])

	/** Go to real slide `next`; when looping, `virtual` may name a slide in any copy. */
	const goTo = useCallback(
		(next: number, animated = true, virtual?: number) => {
			if (loopOn) {
				const target = virtual ?? count + next
				vIndexRef.current = target
				listRef.current?.scrollToOffset({ offset: target * interval, animated })
				updateIndex(next)
				if (animated) {
					clearSettleTimer()
					// An animated programmatic scroll doesn't always report its end -- settle on a timer too.
					settleTimer.current = setTimeout(() => {
						offsetRef.current = target * interval
						settle()
					}, 450)
				}
				return
			}
			listRef.current?.scrollToOffset({ offset: next * interval, animated })
			vIndexRef.current = next
			updateIndex(next)
		},
		[count, interval, loopOn, settle, updateIndex]
	)

	// (Re)position on the middle copy whenever the layout of the endless list changes.
	useEffect(() => {
		positionedRef.current = false
	}, [count, interval, loopOn])
	const handleContentSizeChange = () => {
		if (!loopOn || positionedRef.current) return
		positionedRef.current = true
		const real = Math.min(indexRef.current, count - 1)
		jumpTo(count + real, false)
	}

	// Keep the index valid if the data shrinks.
	useEffect(() => {
		if (count > 0 && indexRef.current > count - 1) goTo(count - 1, false)
	}, [count, goTo])

	// Auto-play: one timeout per slide, re-armed whenever the index changes; cleared while
	// dragging and on unmount. Looping always moves forward one slide, wrapping seamlessly.
	useEffect(() => {
		if (!autoPlay || dragging || count < 2) return
		const timer = setTimeout(() => {
			if (loopOn) {
				const current = vIndexRef.current
				goTo((((current + 1) % count) + count) % count, true, current + 1)
				return
			}
			const next = index + 1
			if (next < count) goTo(next)
		}, autoPlayInterval)
		return () => clearTimeout(timer)
	}, [autoPlay, autoPlayInterval, count, dragging, goTo, index, loopOn])

	// `e` is the real scroll-end event; without it (the drag-end safety timer) the latest offset seen by
	// onScroll is used.
	const handleScrollEnd = (e?: NativeSyntheticEvent<NativeScrollEvent>) => {
		clearSettleTimer()
		if (e) offsetRef.current = e.nativeEvent.contentOffset.x
		if (loopOn) {
			settle()
			return
		}
		const raw = Math.round(offsetRef.current / interval)
		const clamped = Math.max(0, Math.min(count - 1, raw))
		vIndexRef.current = clamped
		updateIndex(clamped)
	}

	const handleLayout = (e: LayoutChangeEvent) => {
		const w = e.nativeEvent.layout.width
		if (w > 0 && w !== containerWidth) setContainerWidth(w)
	}

	const Separator = useMemo(() => {
		const Gap = () => <View style={{ width: gap }} />
		return Gap
	}, [gap])

	const renderSlide = ({ item, index: vi }: ListRenderItemInfo<T>) => {
		const i = loopOn ? vi % count : vi
		return <View style={{ width: slideWidth }}>{renderItem({ item, index: i, active: i === index })}</View>
	}

	const showDots = dots && count > 1

	return (
		<View style={[styles.root, style]} accessibilityLabel={accessibilityLabel} onLayout={handleLayout}>
			<FlatList
				ref={listRef}
				data={virtualData}
				renderItem={renderSlide}
				keyExtractor={(item, vi) => {
					const i = loopOn ? vi % count : vi
					const base = keyExtractor ? keyExtractor(item, i) : String(i)
					return loopOn ? `${Math.floor(vi / count)}-${base}` : base
				}}
				horizontal
				showsHorizontalScrollIndicator={false}
				snapToInterval={interval}
				snapToAlignment="start"
				decelerationRate="fast"
				disableIntervalMomentum
				contentContainerStyle={{ paddingHorizontal: inset }}
				ItemSeparatorComponent={Separator}
				getItemLayout={(_, i) => ({ length: interval, offset: inset + i * interval, index: i })}
				scrollEventThrottle={16}
				onScroll={(e) => {
					offsetRef.current = e.nativeEvent.contentOffset.x
				}}
				onContentSizeChange={handleContentSizeChange}
				onScrollBeginDrag={() => {
					clearSettleTimer()
					setDragging(true)
				}}
				onScrollEndDrag={() => {
					setDragging(false)
					// Momentum (the snap) follows and settles the loop; a drag that ends exactly on a slide
					// may not produce one, so also settle later if nothing else has.
					clearSettleTimer()
					settleTimer.current = setTimeout(() => handleScrollEnd(), 800)
				}}
				onMomentumScrollEnd={handleScrollEnd}
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
