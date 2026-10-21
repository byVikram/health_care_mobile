import React, { useState, useRef, useEffect } from 'react'
import {
	View,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	useWindowDimensions,
} from 'react-native'
import { useEvent, useEventListener } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'

const VIDEO_SOURCE = require('../../../assets/blog-and-community/video.mp4')
const AD_IMAGE = require('../../../assets/blog-and-community/ad-image.png')

type Role = 'doctor' | 'patient' | 'pharmacy' | 'radiology' | 'ancillary' | 'nurse' | null

// ─────────────────────────────────────────────────────────────
// Video Slide
// ─────────────────────────────────────────────────────────────

const VideoSlide = React.memo(function VideoSlide({
	width,
	onPlayStateChange,
	onVideoFinish,
}: {
	width: number
	onPlayStateChange?: (isPlaying: boolean) => void
	onVideoFinish?: () => void
}) {
	const videoPlayer = useVideoPlayer(VIDEO_SOURCE, (player) => {
		player.loop = false
		player.muted = false
	})
	const { isPlaying } = useEvent(videoPlayer, 'playingChange', { isPlaying: videoPlayer.playing })

	useEffect(() => {
		onPlayStateChange?.(isPlaying)
	}, [isPlaying, onPlayStateChange])

	useEventListener(videoPlayer, 'playToEnd', () => {
		onPlayStateChange?.(false)
		onVideoFinish?.()
	})

	const handlePlay = () => {
		videoPlayer.play()
	}

	const handlePause = () => {
		videoPlayer.pause()
	}

	return (
		<View style={[styles.videoImageWrapper, { width }]}>
			<VideoView
				player={videoPlayer}
				style={styles.videoPlayer}
				contentFit="cover"
				nativeControls={false}
			/>

			{!isPlaying && (
				<TouchableOpacity style={styles.playButtonOverlay} onPress={handlePlay}>
					<View style={styles.playCircle}>
						<View style={styles.playTriangle} />
					</View>
				</TouchableOpacity>
			)}

			{isPlaying && <TouchableOpacity style={styles.playButtonOverlay} activeOpacity={1} onPress={handlePause} />}
		</View>
	)
})

// ─────────────────────────────────────────────────────────────
// Ad Slide
// ─────────────────────────────────────────────────────────────

import { Image } from 'react-native'
const AdSlide = React.memo(function AdSlide({ width }: { width: number }) {
	return <Image source={AD_IMAGE} style={[styles.adImage, { width }]} />
})

// ─────────────────────────────────────────────────────────────
// Ping Pong Scroll Hook
// ─────────────────────────────────────────────────────────────

function usePingPongScroll(
	length: number,
	intervalMs: number,
	enabled: boolean,
	flatListRef: React.RefObject<FlatList<any> | null>,
	setActiveIndex: React.Dispatch<React.SetStateAction<number>>
) {
	const directionRef = useRef<1 | -1>(1)

	useEffect(() => {
		if (!enabled) return

		const timer = setInterval(() => {
			setActiveIndex((prev) => {
				let next = prev + directionRef.current

				if (next >= length) {
					directionRef.current = -1
					next = length - 2
				} else if (next < 0) {
					directionRef.current = 1
					next = 1
				}

				flatListRef.current?.scrollToIndex({ index: next, animated: true })
				return next
			})
		}, intervalMs)

		return () => clearInterval(timer)
	}, [enabled, length, intervalMs])
}

export default function MediaPromotionsSection({ role }: { role: Role }) {
	const { width } = useWindowDimensions()
	const isPharmacy = role === 'pharmacy'

	// ── Video Slider ──
	const [activeIndex, setActiveIndex] = useState(0)
	const [boxWidth, setBoxWidth] = useState(0)
	const flatListRef = useRef<FlatList<any>>(null)
	const videos = [1, 2, 3, 4, 5]
	const [isVideoPlaying, setIsVideoPlaying] = useState(false)

	const onViewRef = useRef(({ viewableItems }: any) => {
		if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0)
	})

	const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 })

	const handleDotPress = (index: number) => {
		setActiveIndex(index)
		flatListRef.current?.scrollToIndex({ index, animated: true })
	}

	usePingPongScroll(videos.length, 4000, !isPharmacy && boxWidth > 0 && !isVideoPlaying, flatListRef, setActiveIndex)

	// ── Ad Slider ──
	const [activeAdIndex, setActiveAdIndex] = useState(0)
	const [adBoxWidth, setAdBoxWidth] = useState(0)
	const adFlatListRef = useRef<FlatList<any>>(null)
	const ads = [1, 2, 3]

	const onAdViewRef = useRef(({ viewableItems }: any) => {
		if (viewableItems.length > 0) setActiveAdIndex(viewableItems[0].index ?? 0)
	})

	const adViewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 })

	const handleAdDotPress = (index: number) => {
		setActiveAdIndex(index)
		adFlatListRef.current?.scrollToIndex({ index, animated: true })
	}

	usePingPongScroll(ads.length, 3000, adBoxWidth > 0, adFlatListRef, setActiveAdIndex)

	return (
		<View style={styles.container}>
			{/* ── Video Section ── */}
			{!isPharmacy && (
				<View style={styles.topRow}>
					<View style={styles.videoBox} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
						{boxWidth > 0 && (
							<>
								<FlatList
									ref={flatListRef}
									data={videos}
									keyExtractor={(_, i) => String(i)}
									horizontal
									pagingEnabled
									showsHorizontalScrollIndicator={false}
									onViewableItemsChanged={onViewRef.current}
									viewabilityConfig={viewConfigRef.current}
									getItemLayout={(_, index) => ({
										length: boxWidth,
										offset: boxWidth * index,
										index,
									})}
									renderItem={() => (
										<VideoSlide
											width={boxWidth}
											onPlayStateChange={setIsVideoPlaying}
											onVideoFinish={() => setIsVideoPlaying(false)}
										/>
									)}
								/>

								<View style={styles.dotsRow}>
									{videos.map((_, i) => (
										<TouchableOpacity key={i} onPress={() => handleDotPress(i)}>
											<View style={[styles.dot, i === activeIndex && styles.dotActive]} />
										</TouchableOpacity>
									))}
								</View>
							</>
						)}
					</View>
				</View>
			)}

			{/* ── Ad Section ── */}
			<View
				style={[styles.adBox, !isPharmacy && styles.adBoxMargin]}
				onLayout={(e) => setAdBoxWidth(e.nativeEvent.layout.width)}
			>
				{adBoxWidth > 0 && (
					<>
						<FlatList
							ref={adFlatListRef}
							data={ads}
							keyExtractor={(_, i) => String(i)}
							horizontal
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							onViewableItemsChanged={onAdViewRef.current}
							viewabilityConfig={adViewConfigRef.current}
							getItemLayout={(_, index) => ({
								length: adBoxWidth,
								offset: adBoxWidth * index,
								index,
							})}
							renderItem={() => <AdSlide width={adBoxWidth} />}
						/>

						<View style={styles.adDotsRow}>
							{ads.map((_, i) => (
								<TouchableOpacity key={i} onPress={() => handleAdDotPress(i)}>
									<View style={[styles.adDot, i === activeAdIndex && styles.adDotActive]} />
								</TouchableOpacity>
							))}
						</View>
					</>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	topRow: {
		flexDirection: 'row',
		gap: 16,
	},
	videoBox: {
		flex: 1,
	},
	videoImageWrapper: {
		borderRadius: 16,
		overflow: 'hidden',
		aspectRatio: 1,
		maxHeight: 280,
		position: 'relative',
	},
	videoPlayer: {
		width: '100%',
		height: '100%',
	},
	playButtonOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
	},
	playCircle: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	playTriangle: {
		width: 0,
		height: 0,
		borderLeftWidth: 18,
		borderTopWidth: 10,
		borderBottomWidth: 10,
		borderLeftColor: '#fff',
		borderTopColor: 'transparent',
		borderBottomColor: 'transparent',
		marginLeft: 5,
	},
	dotsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		paddingTop: 12,
		gap: 8,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#d0d0d0',
	},
	dotActive: {
		width: 20,
		backgroundColor: '#0c7c7c',
	},
	adBox: {
		backgroundColor: '#fff',
		borderRadius: 16,
		overflow: 'hidden',
	},
	adBoxMargin: {
		marginTop: 24,
	},
	adImage: {
		height: 240,
		resizeMode: 'cover',
	},
	adDotsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
	},
	adDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#d0d0d0',
	},
	adDotActive: {
		width: 20,
		backgroundColor: '#0c7c7c',
	},
})
