import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface Props {
  documents: string[]
  onImagePress: (index: number) => void
}

export default function DocumentCarousel({
  documents,
  onImagePress,
}: Props) {
  const { width: screenWidth } = useWindowDimensions()
  const flatListRef = useRef<FlatList<string>>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const imageWidth = screenWidth - 64

  useEffect(() => {
    if (documents.length > 0) {
      flatListRef.current?.scrollToIndex({
        index: 0,
        animated: false,
      })
      setActiveIndex(0)
    }
  }, [screenWidth, documents.length])

  const goTo = (index: number) => {
    const clamped = Math.max(
      0,
      Math.min(index, documents.length - 1)
    )

    flatListRef.current?.scrollToIndex({
      index: clamped,
      animated: true,
    })

    setActiveIndex(clamped)
  }

  if (!documents.length) {
    return (
      <View style={carouselStyles.empty}>
        <MaterialCommunityIcons
          name="file-image-outline"
          size={48}
          color="#CBD5E1"
        />
        <Text style={carouselStyles.emptyText}>
          No documents uploaded
        </Text>
      </View>
    )
  }

  return (
    <View style={carouselStyles.container}>
      <FlatList
        ref={flatListRef}
        data={documents}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => String(index)}
        getItemLayout={(_, index) => ({
          length: imageWidth,
          offset: imageWidth * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / imageWidth
          )
          setActiveIndex(idx)
        }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress(index)}
            style={{ width: imageWidth }}
          >
            <Image
              source={{ uri: item }}
              style={{
                width: imageWidth,
                height: 220,
              }}
              resizeMode="contain"
            />

            <View style={carouselStyles.imageKeyInfo}>
              <MaterialCommunityIcons
                name="fullscreen"
                size={16}
                color="#1f5f68"
              />
              <Text style={carouselStyles.imageKeyText}>
                Tap to expand document
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {documents.length > 1 && (
        <>
          <TouchableOpacity
            style={[
              carouselStyles.arrow,
              carouselStyles.arrowLeft,
            ]}
            onPress={() => goTo(activeIndex - 1)}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color="#1A2C33"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              carouselStyles.arrow,
              carouselStyles.arrowRight,
            ]}
            onPress={() => goTo(activeIndex + 1)}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#1A2C33"
            />
          </TouchableOpacity>

          <View style={carouselStyles.dotRow}>
            {documents.map((_, i) => (
              <View
                key={i}
                style={[
                  carouselStyles.dot,
                  i === activeIndex &&
                    carouselStyles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={carouselStyles.counter}>
            <Text style={carouselStyles.counterText}>
              {activeIndex + 1} / {documents.length}
            </Text>
          </View>
        </>
      )}
    </View>
  )
}

const carouselStyles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#F8FCFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 260,
  },
  empty: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    zIndex: 2,
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  dotRow: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#2E7C86',
  },
  counter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7C86',
  },
  imageKeyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  imageKeyText: {
    fontSize: 13,
    color: '#1f5f68',
    fontWeight: '500',
    marginLeft: 6,
  },
})