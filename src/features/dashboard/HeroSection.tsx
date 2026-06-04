import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';

import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { AppTypography } from '../../components/common';
import { ROUTES } from '../../navigation/routes';
import { navigate as navigateRoot } from '../../navigation/navigationService';

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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Role = 'doctor' | 'patient' | 'pharmacy' | null;

// ─────────────────────────────────────────────────────────────
// Video Slide
// ─────────────────────────────────────────────────────────────

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
        isLooping={false}
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

// ─────────────────────────────────────────────────────────────
// Ad Slide
// ─────────────────────────────────────────────────────────────

function AdSlide({ width }: { width: number }) {
  return (
    <Image
      source={AD_IMAGE}
      style={[styles.adImage, { width }]}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Ping Pong Scroll Hook
// ─────────────────────────────────────────────────────────────

function usePingPongScroll(
  length: number,
  intervalMs: number,
  enabled: boolean,
  flatListRef: React.RefObject<FlatList | null>,
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
) {
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        let next = prev + directionRef.current;

        if (next >= length) {
          directionRef.current = -1;
          next = length - 2;
        } else if (next < 0) {
          directionRef.current = 1;
          next = 1;
        }

        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, length, intervalMs]);
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function HeroSection({ role }: { role: Role }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isPharmacy = role === 'pharmacy';
  const serviceIconSize = isTablet ? 40 : 30;
  const othersSquareSize = isTablet ? 17 : 12;

  // ───────────────────────────────────────────────────────────
  // Video Carousel (doctor & patient only)
  // ───────────────────────────────────────────────────────────

  const [activeIndex, setActiveIndex] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const videos = [1, 2, 3, 4, 5];
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // ───────────────────────────────────────────────────────────
  // Others Popup (doctor & patient only)
  // ───────────────────────────────────────────────────────────

  const [showOthersModal, setShowOthersModal] = useState(false);
  const popupScale = useRef(new Animated.Value(0.7)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslateY = useRef(new Animated.Value(25)).current;

  const openOthersModal = () => {
    setShowOthersModal(true);
    popupScale.setValue(0.7);
    popupOpacity.setValue(0);
    popupTranslateY.setValue(25);

    Animated.parallel([
      Animated.spring(popupScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(popupOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(popupTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeOthersModal = () => {
    Animated.parallel([
      Animated.timing(popupScale, { toValue: 0.7, duration: 180, useNativeDriver: true }),
      Animated.timing(popupOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(popupTranslateY, { toValue: 25, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowOthersModal(false));
  };

  // ───────────────────────────────────────────────────────────
  // Video View Config
  // ───────────────────────────────────────────────────────────

  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  usePingPongScroll(
    videos.length,
    4000,
    !isPharmacy && boxWidth > 0 && !isVideoPlaying,
    flatListRef,
    setActiveIndex
  );

  // ───────────────────────────────────────────────────────────
  // Ad Carousel
  // ───────────────────────────────────────────────────────────

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

  usePingPongScroll(ads.length, 3000, adBoxWidth > 0, adFlatListRef, setActiveAdIndex);

  // ───────────────────────────────────────────────────────────
  // Services
  // ───────────────────────────────────────────────────────────

  const horizontalServices = [
    { title: 'Appointment', Component: AppointmentsIcon },
    { title: 'Pharmacy', Component: PharmacyIcon },
    { title: 'Laboratory', Component: LabIcon },
    { title: 'Radiology', Component: RadiologyIcon },
    { title: 'Others', Component: null },
  ];

  const othersPopupItems = [
    { title: 'Ancillary', Component: AncilaryIcon },
    { title: 'Ambulance', Component: AmbulanceIcon },
    { title: 'Blood Bank', Component: BloodBankIcon },
    { title: 'ICU', Component: IcuIcon },
    { title: 'Emergency', Component: EmergencyIcon },
  ];

  const handleServicePress = (title: string) => {
    if (title === 'Appointment') {
      navigateRoot(ROUTES.STACK.APPOINTMENTS);
    }
  };

  return (
    <View style={styles.container}>

      {/* ─────────────────────────────────────────────
          Quick Services — doctor & patient only
      ───────────────────────────────────────────── */}

      {!isPharmacy && (
        <View style={[styles.horizontalServicesRow, isTablet && styles.horizontalServicesRowTablet]}>
          {horizontalServices.map((s) => {
            if (s.title === 'Others' || !s.Component) {
              return (
                <TouchableOpacity
                  key={s.title}
                  style={[styles.hServiceCard, isTablet && styles.hServiceCardTablet]}
                  activeOpacity={0.8}
                  onPress={openOthersModal}
                >
                  <View
                    style={[
                      styles.othersIconContainer,
                      { width: serviceIconSize, height: serviceIconSize },
                    ]}
                  >
                    <View style={[styles.othersSquare, { width: othersSquareSize, height: othersSquareSize, backgroundColor: '#0c7c7c' }]} />
                    <View style={[styles.othersSquare, { width: othersSquareSize, height: othersSquareSize, backgroundColor: '#4264D0' }]} />
                    <View style={[styles.othersSquare, { width: othersSquareSize, height: othersSquareSize, backgroundColor: '#EA7F06' }]} />
                    <View style={[styles.othersSquare, { width: othersSquareSize, height: othersSquareSize, backgroundColor: '#DE3B40' }]} />
                  </View>
                  <AppTypography
                    style={[styles.hServiceTitle, isTablet && styles.hServiceTitleTablet]}
                    numberOfLines={1}
                  >
                    Others
                  </AppTypography>
                </TouchableOpacity>
              );
            }

            const ServiceIcon = s.Component;

            return (
              <TouchableOpacity
                key={s.title}
                style={[styles.hServiceCard, isTablet && styles.hServiceCardTablet]}
                activeOpacity={0.8}
                onPress={() => handleServicePress(s.title)}
              >
                <ServiceIcon width={serviceIconSize} height={serviceIconSize} />
                <AppTypography
                  style={[styles.hServiceTitle, isTablet && styles.hServiceTitleTablet]}
                  numberOfLines={1}
                >
                  {s.title}
                </AppTypography>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ─────────────────────────────────────────────
          Others Popup — doctor & patient only
      ───────────────────────────────────────────── */}

      {!isPharmacy && (
        <Modal
          visible={showOthersModal}
          transparent
          animationType="none"
          onRequestClose={closeOthersModal}
        >
          <Pressable style={styles.overlay} onPress={closeOthersModal}>
            <Animated.View
              style={[StyleSheet.absoluteFillObject, { opacity: popupOpacity }]}
            >
              <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
            </Animated.View>

            <Animated.View
              style={[
                styles.popupMenu,
                {
                  opacity: popupOpacity,
                  transform: [{ scale: popupScale }, { translateY: popupTranslateY }],
                },
              ]}
            >
              <Pressable onPress={() => {}}>
                <View style={styles.popupRow}>
                  {othersPopupItems.map((item) => (
                    <TouchableOpacity
                      key={item.title}
                      style={styles.popupItem}
                      activeOpacity={0.8}
                      onPress={closeOthersModal}
                    >
                      <View style={styles.popupIconCircle}>
                        <item.Component width={30} height={30} />
                      </View>
                      <AppTypography style={styles.popupText}>{item.title}</AppTypography>
                    </TouchableOpacity>
                  ))}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────
          Video Section — doctor & patient only
      ───────────────────────────────────────────── */}

      {!isPharmacy && (
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
        </View>
      )}

      {/* ─────────────────────────────────────────────
          Ad Section — all roles
      ───────────────────────────────────────────── */}

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
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

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

  horizontalServicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 16,
  },

  horizontalServicesRowTablet: {
    gap: 6,
  },

  hServiceCard: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 64,
  },

  hServiceCardTablet: {
    flex: 1,
    width: 'auto',
    minWidth: 0,
  },

  hServiceTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
    minHeight: 28,
    width: '100%',
  },

  hServiceTitleTablet: {
    fontSize: 11,
    lineHeight: 16,
    minHeight: 16,
    marginTop: 8,
  },

  othersIconContainer: {
    width: 30,
    height: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    padding: 2,
  },

  othersSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },

  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 200,
  },

  popupMenu: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
  },

  popupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
  },

  popupItem: {
    alignItems: 'center',
    width: 58,
  },

  popupIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f7fb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  popupText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e2a3a',
    textAlign: 'center',
    marginTop: 8,
  },

  adBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Applied only when video section is above
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
});
