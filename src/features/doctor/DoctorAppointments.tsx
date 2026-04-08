import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const actionButtons: {
  label: string;
  bg: string;
  color: string;
  action: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { label: 'Confirm',    bg: '#e8f5e9', color: '#4caf50', action: 'confirm',    icon: 'check'         },
  { label: 'Reject',     bg: '#ffeeee', color: '#e53935', action: 'reject',     icon: 'close'         },
  { label: 'Reschedule', bg: '#fff8e8', color: '#f59e0b', action: 'reschedule', icon: 'refresh'       },
  { label: 'Refer',      bg: '#e8f4f8', color: '#0c7c7c', action: 'refer',      icon: 'account-group' },
];

export default function DoctorAppointments({
  selectedDate,
  setSelectedDate,
  appointments,
  apptLoading,
  apptError,
  weekDays,
  selectedDateObj,
}: any) {

  const getStatusLabel = (status: any) =>
    typeof status === 'string' ? status : status?.label ?? 'pending';

  const handleAction = (action: string, id: string) => {
    if (action === 'confirm') alert('Confirmed');
    if (action === 'reject') alert('Rejected');
    if (action === 'reschedule') alert('Reschedule coming soon');
    if (action === 'refer') alert('Refer coming soon');
  };

  return (
    <View style={styles.container}>

      {/* 🔍 Search */}
      <Text style={styles.title}>Search Patient</Text>
      <TextInput
        placeholder="Search Patient ID, Name..."
        style={styles.input}
      />

      {/* 📅 Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Today's Appointments</Text>
        <Text style={styles.month}>
          {selectedDateObj?.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* 📆 Week Days */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekContainer}>
        {weekDays.map((d: any, i: number) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedDate(i)}
            style={[
              styles.dayBox,
              selectedDate === i && styles.selectedDay,
            ]}
          >
            <Text style={[styles.dayText, selectedDate === i && styles.selectedText]}>
              {d.day}
            </Text>
            <Text
              style={[
                styles.dateText,
                selectedDate === i && styles.selectedText,
                d.red && { color: 'red' },
              ]}
            >
              {d.date}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 📋 List */}
      <ScrollView style={{ marginTop: 10 }}>
        {apptLoading && <Text>Loading...</Text>}

        {apptError ? <Text style={styles.error}>{apptError}</Text> : null}

        {!apptLoading && appointments.length === 0 && (
          <Text style={styles.empty}>No appointments</Text>
        )}

        {appointments.map((apt: any) => {
          const status = getStatusLabel(apt.status);
          const isCancelled = status === 'cancelled';

          return (
            <View
              key={apt.id}
              style={[
                styles.card,
                isCancelled && { backgroundColor: '#fff5f5' },
              ]}
            >
              {/* Patient Name */}
              <Text style={styles.name}>
                {apt?.patient?.name || 'Unknown Patient'}
              </Text>

              {/* Details */}
              <Text style={styles.subText}>
                {apt.appointment_mode || 'offline'} | {apt.appointment_time || '--'}
              </Text>

              {/* Cancelled */}
              {isCancelled ? (
                <Text style={styles.cancelled}>
                  Patient has canceled the appointment
                </Text>
              ) : (
                <View style={styles.actions}>
  {actionButtons.map((btn, i) => (
    <TouchableOpacity
      key={i}
      onPress={() => handleAction(btn.action, apt.id)}
      style={[styles.btn, { backgroundColor: btn.bg }]}
    >
      <MaterialCommunityIcons name={btn.icon} size={20} color={btn.color} />
      <Text style={[styles.btnLabel, { color: btn.color }]}>
        {btn.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>
              )}
            </View>
          );
        })}
      </ScrollView>

    </View>
  );
}

  const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heading: {
    fontSize: 17,
    fontWeight: '700',
  },

  month: {
    color: '#0c7c7c',
    fontWeight: '600',
  },

  weekContainer: {
    marginTop: 10,
  },

  dayBox: {
    padding: 10,
    borderRadius: 10,
    marginRight: 6,
    alignItems: 'center',
  },

  selectedDay: {
    backgroundColor: '#0c7c7c',
  },

  dayText: {
    fontSize: 10,
    color: '#777',
  },

  dateText: {
    fontSize: 14,
    fontWeight: '700',
  },

  selectedText: {
    color: '#fff',
  },

  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },

  name: {
    fontSize: 14,
    fontWeight: '600',
  },

  subText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },

 
   actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 8,
  },
 btn: {
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  paddingVertical: 6,      // 👈 reduced vertical padding
  paddingHorizontal: 8,    // 👈 reduced horizontal padding
  width: 75,               // 👈 fixed width instead of flex:1
  gap: 4,
},
btnLabel: {
  fontSize: 11,
  fontWeight: '500',
  textAlign: 'center',
},

  cancelled: {
    color: 'red',
    fontSize: 12,
    marginTop: 6,
  },

  error: {
    color: 'red',
  },

  empty: {
    color: '#999',
  },
});