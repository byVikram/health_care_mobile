import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface Props {
  visible: boolean
  images: string[]
  initialIndex: number
  onClose: () => void
}

export default function ImageViewerModal({
  visible,
  images,
  initialIndex,
  onClose,
}: Props) {
  const { width: screenWidth, height: screenHeight } =
    useWindowDimensions()

  const flatListRef = useRef<FlatList<string>>(null)

  const [activeIndex, setActiveIndex] =
    useState(initialIndex)

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex)

      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        })
      }, 50)
    }
  }, [visible, initialIndex])

  const goTo = (index: number) => {
    const clamped = Math.max(
      0,
      Math.min(index, images.length - 1)
    )

    flatListRef.current?.scrollToIndex({
      index: clamped,
      animated: true,
    })

    setActiveIndex(clamped)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar
        backgroundColor="rgba(0,0,0,0.95)"
        barStyle="light-content"
      />

      <View style={viewerStyles.overlay}>
        <SafeAreaView style={viewerStyles.header}>
          <Text style={viewerStyles.headerTitle}>
            Document{' '}
            {images.length > 1
              ? `${activeIndex + 1} / ${images.length}`
              : ''}
          </Text>

          <TouchableOpacity
            style={viewerStyles.closeBtn}
            onPress={onClose}
            hitSlop={{
              top: 12,
              bottom: 12,
              left: 12,
              right: 12,
            }}
          >
            <MaterialCommunityIcons
              name="close"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </SafeAreaView>

        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => String(index)}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(
              e.nativeEvent.contentOffset.x /
                screenWidth
            )
            setActiveIndex(idx)
          }}
          renderItem={({ item }) => (
            <View
              style={{
                width: screenWidth,
                height: screenHeight - 120,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri: item }}
                style={{
                  width: screenWidth,
                  height: screenHeight - 120,
                }}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={[
                viewerStyles.arrow,
                viewerStyles.arrowLeft,
              ]}
              onPress={() =>
                goTo(activeIndex - 1)
              }
              disabled={activeIndex === 0}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                viewerStyles.arrow,
                viewerStyles.arrowRight,
              ]}
              onPress={() =>
                goTo(activeIndex + 1)
              }
              disabled={
                activeIndex === images.length - 1
              }
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={viewerStyles.dotRow}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    viewerStyles.dot,
                    i === activeIndex &&
                      viewerStyles.dotActive,
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}

const viewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowLeft: {
    left: 12,
  },

  arrowRight: {
    right: 12,
  },

  dotRow: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 3,
  },

  dotActive: {
    width: 18,
    backgroundColor: '#fff',
  },
})