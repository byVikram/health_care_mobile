import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { AppTypography } from '../../components/common';
import { Video, ResizeMode } from 'expo-av';

import EmergencyIcon from '../../assets/quick-services/emergency.svg';
import AmbulanceIcon from '../../assets/quick-services/ambulance.svg';
import BloodBankIcon from '../../assets/quick-services/blood-bank.svg';
import IcuIcon from '../../assets/quick-services/icu.svg';
import AppointmentsIcon from '../../assets/quick-services/appointments.svg';
import PharmacyIcon from '../../assets/quick-services/pharmacy.svg';
import LabIcon from '../../assets/quick-services/lab.svg';
import RadiologyIcon from '../../assets/quick-services/radiology.svg';
import AncilaryIcon from '../../assets/quick-services/ancilary.svg';

const VIDEO_SOURCE = require('../../assets/blog-and-community/video.mp4');
const AD_IMAGE = require('../../assets/blog-and-community/ad-image.png');

// ─── Isolated Video Slide ─────────────────────────────────────────────────────
function VideoSlide({
  width,
  onPlayStateChange,
  onVideoFinish,
}: {
  width: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onVideoFinish?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<any>(null);

  const handlePlay = async () => {
    setIsPlaying(true);
    onPlayStateChange?.(true);
    await videoRef.current?.playAsync();
  };

  const handlePause = async () => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
    await videoRef.current?.pauseAsync();
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    // When video finishes (didJustFinish), notify parent to resume auto-scroll
    if (status?.didJustFinish) {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      onVideoFinish?.();
    }
  };

  return (
    <View style={[styles.videoImageWrapper, { width }]}>
      <Video
        ref={videoRef}
        source={VIDEO_SOURCE}
        style={styles.videoPlayer}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isPlaying}
        isLooping={false}           // ← disabled so didJustFinish fires
        isMuted={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      {!isPlaying && (
        <TouchableOpacity style={styles.playButtonOverlay} onPress={handlePlay}>
          <View style={styles.playCircle}>
            <View style={styles.playTriangle} />
          </View>
        </TouchableOpacity>
      )}
      {isPlaying && (
        <TouchableOpacity
          style={styles.playButtonOverlay}
          activeOpacity={1}
          onPress={handlePause}
        />
      )}
    </View>
  );
}

// ─── Ad Image Slide ───────────────────────────────────────────────────────────
function AdSlide({ width }: { width: number }) {
  return <Image source={AD_IMAGE} style={[styles.adImage, { width }]} />;
}

// ─── Ping-Pong auto-scroll hook ───────────────────────────────────────────────
function usePingPongScroll(
  length: number,
  intervalMs: number,
  enabled: boolean,
  flatListRef: React.RefObject<FlatList | null>,
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>,
) {
  const directionRef = useRef<1 | -1>(1); // 1 = forward, -1 = backward

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        let next = prev + directionRef.current;

        // Reverse direction at the ends
        if (next >= length) {
          directionRef.current = -1;
          next = length - 2; // step back from last
        } else if (next < 0) {
          directionRef.current = 1;
          next = 1; // step forward from first
        }

        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, length, intervalMs]);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HeroSection() {

  // ── Video carousel ──
  const [activeIndex, setActiveIndex] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const videos = [1, 2, 3, 4, 5];

  // Track if any video slide is currently playing
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // Ping-pong auto-scroll — paused while video is playing
  usePingPongScroll(
    videos.length,
    4000,
    boxWidth > 0 && !isVideoPlaying, // ← paused when video plays
    flatListRef,
    setActiveIndex,
  );

  // ── Ad carousel ──
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [adBoxWidth, setAdBoxWidth] = useState(0);
  const adFlatListRef = useRef<FlatList>(null);
  const ads = [1, 2, 3];

  const onAdViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveAdIndex(viewableItems[0].index ?? 0);
  });
  const adViewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleAdDotPress = (index: number) => {
    setActiveAdIndex(index);
    adFlatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // Ping-pong auto-scroll for ads
  usePingPongScroll(
    ads.length,
    3000,
    adBoxWidth > 0,
    adFlatListRef,
    setActiveAdIndex,
  );

  // const verticalServices = [
  //   { title: 'Emergency',  Component: EmergencyIcon },
  //   { title: 'Ambulance',  Component: AmbulanceIcon },
  //   { title: 'Blood Bank', Component: BloodBankIcon },
  //   { title: 'ICU',        Component: IcuIcon },
  // ];

  const horizontalServices = [
    { title: 'Appointment', Component: AppointmentsIcon },
    { title: 'Pharmacy',    Component: PharmacyIcon },
    { title: 'Laboratory',  Component: LabIcon },
    { title: 'Radiology',   Component: RadiologyIcon },
    { title: 'Ancillary',   Component: AncilaryIcon },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.horizontalServicesRow}>
        {horizontalServices.map((s) => (
          <TouchableOpacity key={s.title} style={styles.hServiceCard}>
            <s.Component width={30} height={30} />
            <AppTypography style={styles.hServiceTitle} numberOfLines={1}>
              {s.title}
            </AppTypography>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Top Section ─────────────────────────────────────────────────────── */}
      <View style={styles.topRow}>

        <View
          style={styles.videoBox}
          onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
        >
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

        {/* <View style={styles.verticalServicesBox}>
          {verticalServices.map((s, idx) => (
            <TouchableOpacity
              key={s.title}
              style={[
                styles.vServiceCard,
                idx === verticalServices.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <s.Component width={28} height={28} />
              <AppTypography style={styles.vServiceTitle}>{s.title}</AppTypography>
            </TouchableOpacity>
          ))}
        </View> */}

      </View>

      {/* ── Ad Section ───────────────────────────────────────────────────────── */}
      <View
        style={styles.adBox}
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
  );
}

// ─── Styles — unchanged ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
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
    top: 0, left: 0, right: 0, bottom: 0,
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
  verticalServicesBox: {
    flexDirection: 'column',
    paddingTop: 8,
    width: 80,
  },
  vServiceCard: {
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  vServiceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
  horizontalServicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  hServiceCard: {
    alignItems: 'center',
    width: 60,
  },
  hServiceTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
  },
  adBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
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
});
