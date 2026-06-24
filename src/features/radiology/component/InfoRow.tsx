import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface InfoRowProps {
  label: string
  value: string | React.ReactNode
}

export default function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      {typeof value === 'string' ? (
        <Text style={styles.infoValue}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },

  infoLabel: {
    fontSize: 13,
    color: '#64707D',
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 12,
  },

  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: '#1D2939',
    fontWeight: '500',
  },
})