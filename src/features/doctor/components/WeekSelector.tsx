import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'

export interface WeekDay {
  day: string
  date: string
  red: boolean
  dateObj: Date
}

interface WeekSelectorProps {
  weekDays: WeekDay[]
  selectedDate: number
  onSelectDate: (i: number) => void
  selectedDateObj: Date
}

export function WeekSelector({ weekDays, selectedDate, onSelectDate, selectedDateObj }: WeekSelectorProps) {
  return (
    <View>
      <View style={styles.weekHeader}>
        <Text style={styles.weekHeaderTitle}>Today's Appointments</Text>
        <Text style={styles.weekMonth}>
          {selectedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekDayRow}>
        {weekDays.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.dayCell,
              selectedDate === i && styles.dayCellSelected,
            ]}
            onPress={() => onSelectDate(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, selectedDate === i && styles.dayLabelSelected]}>
              {d.day}
            </Text>
            <Text
              style={[
                styles.dateLabel,
                selectedDate === i && styles.dateLabelSelected,
                !selectedDate && d.red && styles.dateLabelRed,
              ]}
            >
              {d.date}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.divider} />
    </View>
  )
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekMonth: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  weekDayRow: {
    gap: 8,
    paddingBottom: 8,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 54,
  },
  dayCellSelected: {
    backgroundColor: '#0C7C7C',
    borderColor: '#0C7C7C',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateLabelSelected: {
    color: '#FFFFFF',
  },
  dateLabelRed: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
})
