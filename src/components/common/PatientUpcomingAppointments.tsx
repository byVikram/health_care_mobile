import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

export type PatientAppointmentStatus = 'confirmed' | 'pending' | 'cancelled'
export type PatientAppointmentMode = 'in-person' | 'virtual'

export type PatientAppointmentItem = {
  id: string
  doctorName: string
  consultationType: string
  rating: number
  qualifications: string
  dateLabel: string
  timeLabel: string
  mode: PatientAppointmentMode
  hospitalName: string
  address: string
  status: PatientAppointmentStatus
}

type PatientUpcomingAppointmentsProps = {
  appointments?: PatientAppointmentItem[]
  onJoin?: (appointment: PatientAppointmentItem) => void
  onReschedule?: (appointment: PatientAppointmentItem) => void
  onCancel?: (appointment: PatientAppointmentItem) => void
}

const defaultAppointments: PatientAppointmentItem[] = [
  {
    id: '1',
    doctorName: 'Dr. Ashika Rao',
    consultationType: 'Dental Consultation',
    rating: 4.9,
    qualifications: 'BDS, MDS',
    dateLabel: 'Mon, 26 July',
    timeLabel: '02:30 PM',
    mode: 'in-person',
    hospitalName: 'City Dental Care',
    address: '123 Healthcare Ave',
    status: 'confirmed',
  },
  {
    id: '2',
    doctorName: 'Dr. Ramesh Kumar',
    consultationType: 'Cardiology Consultation',
    rating: 4.7,
    qualifications: 'MD, DM Cardiology',
    dateLabel: 'Wed, 28 July',
    timeLabel: '10:00 AM',
    mode: 'virtual',
    hospitalName: 'Heart Care Center',
    address: '456 Medical Plaza',
    status: 'pending',
  },
]

export default function PatientUpcomingAppointments({
  appointments = defaultAppointments,
  onJoin,
  onReschedule,
  onCancel,
}: PatientUpcomingAppointmentsProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

      {appointments.map((appointment) => {
        const isConfirmed = appointment.status === 'confirmed'
        const isPending = appointment.status === 'pending'
        const isVirtual = appointment.mode === 'virtual'

        return (
          <View
            key={appointment.id}
            style={[
              styles.card,
              isConfirmed ? styles.cardConfirmed : styles.cardPending,
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={26} color="#5B7186" />
              </View>

              <View style={styles.headerText}>
                <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                <Text style={styles.consultationType}>
                  {appointment.consultationType}
                </Text>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F6B500" />
                  <Text style={styles.ratingText}>{appointment.rating}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.qualifications}>
                    {appointment.qualifications}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  isConfirmed
                    ? styles.statusBadgeConfirmed
                    : styles.statusBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isConfirmed
                      ? styles.statusTextConfirmed
                      : styles.statusTextPending,
                  ]}
                >
                  {isConfirmed ? 'Confirmed' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color="#667B8F" />
                <Text style={styles.metaText}>{appointment.dateLabel}</Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#667B8F" />
                <Text style={styles.metaText}>{appointment.timeLabel}</Text>
              </View>

              <View style={styles.metaItem}>
                <MaterialIcons
                  name={isVirtual ? 'videocam' : 'location-on'}
                  size={16}
                  color="#667B8F"
                />
                <Text style={styles.metaText}>
                  {isVirtual ? 'Virtual' : 'In-person'}
                </Text>
              </View>
            </View>

            <View style={styles.locationPill}>
              <Ionicons name="location-sharp" size={14} color="#667B8F" />
              <Text style={styles.locationText}>
                {appointment.hospitalName} {'\u2022'} {appointment.address}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              {isVirtual ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.actionButton, styles.joinButton]}
                  onPress={() => onJoin?.(appointment)}
                >
                  <MaterialIcons name="videocam" size={16} color="#fff" />
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.actionButton,
                  styles.secondaryButton,
                  isVirtual ? styles.flexButton : styles.fullButton,
                ]}
                onPress={() => onReschedule?.(appointment)}
              >
                <Text style={styles.secondaryButtonText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.actionButton,
                  styles.dangerButton,
                  isVirtual ? styles.flexButton : styles.fullButton,
                ]}
                onPress={() => onCancel?.(appointment)}
              >
                <Text style={styles.dangerButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2B36',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EDF2',
  },
  cardConfirmed: {
    borderTopWidth: 4,
    // borderTopColor: '#14B87A',
  },
  cardPending: {
    borderTopWidth: 4,
    // borderTopColor: '#F59E0B',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F4F8FB',
    borderWidth: 2,
    borderColor: '#D6E4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#16324A',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: 15,
    color: '#587087',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3547',
  },
  dot: {
    marginHorizontal: 6,
    color: '#91A3B3',
  },
  qualifications: {
    fontSize: 14,
    color: '#587087',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusBadgeConfirmed: {
    backgroundColor: '#EAF9F1',
  },
  statusBadgePending: {
    backgroundColor: '#FFF4E2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusTextConfirmed: {
    color: '#14B87A',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 14,
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#4E667B',
  },
  locationPill: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: '#F5F8FC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    color: '#567085',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#0F6B68',
  },
  joinButtonText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E1EA',
  },
  secondaryButtonText: {
    color: '#1A2A38',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5D5D2',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  flexButton: {
    flex: 1,
  },
  fullButton: {
    flex: 1,
  },
})