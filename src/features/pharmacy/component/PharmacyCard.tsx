// src/features/Pharmacy/components/PharmacySearchCard.tsx
import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native'
import { PharmacyItem } from '../pharmacy'

import pharmacy2 from '../../../assets/Pharmacy/pharmacy2.png'
import pharmacy3 from '../../../assets/Pharmacy/pharmacy3.png'
import pharmacy4 from '../../../assets/Pharmacy/pharmacy4.png'

const pharmacyImages: ImageSourcePropType[] = [
  pharmacy2,
  pharmacy3,
  pharmacy4,
]

const getPharmacyImage = (id: string): ImageSourcePropType => {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return pharmacyImages[Math.abs(hash) % pharmacyImages.length]
}

interface Props {
  pharmacy: PharmacyItem
  onPress?: () => void
  onPlaceOrder?: () => void
}

export default function PharmacySearchCard({ pharmacy, onPress, onPlaceOrder }: Props) {
  const {
    id,
    name,
    address,
    city,
    operating_hours,
    home_delivery_available,
    is_24_x_7,
    emergency_medicine_available,
  } = pharmacy

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left column: Image */}
      <Image
        source={getPharmacyImage(id)}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Right column: Information */}
      <View style={styles.body}>
        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>{name}</Text>

        {/* Address */}
        <View style={styles.row}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.subText} numberOfLines={1}>
            {address}, {city}
          </Text>
        </View>

        {/* Hours */}
        <View style={styles.row}>
          <Text style={styles.icon}>🕐</Text>
          <Text style={styles.subText}>
            {is_24_x_7
              ? 'Open 24×7'
              : `${operating_hours?.open ?? ''} – ${operating_hours?.close ?? ''}`}
          </Text>
        </View>

        {/* Chips */}
        <View style={styles.chips}>
          {home_delivery_available && (
            <View style={[styles.chip, styles.chipDelivery]}>
              <Text style={styles.chipDeliveryText}>🚚 Home Delivery</Text>
            </View>
          )}
          {emergency_medicine_available && (
            <View style={[styles.chip, styles.chipEmergency]}>
              <Text style={styles.chipEmergencyText}>🚨 Emergency Meds</Text>
            </View>
          )}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={onPlaceOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>🛒  Place Order</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',           // Horizontal layout (two columns)
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: 120,                     // Fixed width for left column
    height: 'auto',                 // Let height adjust based on content
    alignSelf: 'stretch',           // Stretch to fill card height
    backgroundColor: '#E8F5F5',
  },
  body: {
    flex: 1,                        // Take remaining space
    padding: 12,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  subText: {
    fontSize: 12,
    color: '#667085',
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  chipDelivery: {
    backgroundColor: '#E8F5F5',
  },
  chipDeliveryText: {
    fontSize: 10,
    color: '#2B6F71',
    fontWeight: '600',
  },
  chipEmergency: {
    backgroundColor: '#FFEBEE',
  },
  chipEmergencyText: {
    fontSize: 10,
    color: '#C62828',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2B6F71',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
})