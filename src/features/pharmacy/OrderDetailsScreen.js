// screens/pharmacy/OrderDetailsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/common/AppHeader';

// Status color mapping (reused from list)
const statusStyles = {
  Pending: { bg: '#FFF1D9', text: '#F0A018', dot: '#F0A018' },
  Collected: { bg: '#DFF5E4', text: '#43A047', dot: '#43A047' },
  Rejected: { bg: '#FFE3E7', text: '#E74B5B', dot: '#E74B5B' },
  Packed: { bg: '#DEE9FF', text: '#3F7EE8', dot: '#3F7EE8' },
};

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params || {};

  // Order data with fallbacks
  const patientName = order?.name || 'Nitin S H';
  const orderId = order?.orderId || 'QID/1234';
  const doctorName = order?.doctor || 'Dr Ashish Rao';
  const clinicName = order?.clinic || 'Dentist at Aayus Clinic';
  const orderDate = order?.date || '22 Nov 2025';
  const orderTime = order?.time || '10:30 AM';
  const contactNumber = order?.phoneNumber || '9876543210';
  
  // Status state (local for marking updates)
  const [currentStatus, setCurrentStatus] = useState(order?.status || 'Pending');

  // Handle marking new status
  const handleMarkStatus = (newStatus) => {
    setCurrentStatus(newStatus);
    Alert.alert('Status Updated', `Order marked as ${newStatus}`);
  };

  // Handle call button
  const handleCallNow = () => {
    Linking.openURL(`tel:${contactNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to make call');
    });
  };

  // Handle notify patient
  const handleNotifyPatient = () => {
    Alert.alert('Notification Sent', `Patient ${patientName} has been notified about the order status.`);
  };

  // Get current status style
  const currentStatusStyle = statusStyles[currentStatus] || statusStyles.Pending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        variant="back"
        title="Order Details"
        onAvatarPress={() => navigation.goBack()}
      />
      
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Patient & Doctor Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.patientHeader}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.orderId}>({orderId})</Text>
          </View>
          <Text style={styles.doctorInfo}>
            By {doctorName} - {clinicName}
          </Text>
          
          <View style={styles.dateTimeRow}>
            <View style={styles.iconText}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={14} color="#6B7A82" />
              <Text style={styles.dateTimeText}>{orderDate}</Text>
            </View>
            <View style={styles.iconText}>
              <MaterialCommunityIcons name="clock-time-three-outline" size={14} color="#6B7A82" />
              <Text style={styles.dateTimeText}>{orderTime}</Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone-outline" size={20} color="#2E7C86" />
            <Text style={styles.contactNumber}>{contactNumber}</Text>
            <TouchableOpacity style={styles.callButton} onPress={handleCallNow}>
              <Text style={styles.callButtonText}>Call now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkIcon}>
              <MaterialCommunityIcons name="link-variant" size={20} color="#2E7C86" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Prescription Details */}
        <View style={styles.prescriptionCard}>
          <Text style={styles.sectionTitle}>Prescription detail</Text>
          
          {/* After Food Section */}
          <View style={styles.medicationBlock}>
            <Text style={styles.medicationTiming}>after</Text>
            <View style={styles.medicationContent}>
              <Text style={styles.medicineName}>R. 3b. Augmentation 625mg</Text>
              <View style={styles.dosageRow}>
                <Text style={styles.dosageText}>1 - 0 - 1</Text>
                <Text style={styles.durationText}>× 5 days</Text>
              </View>
            </View>
          </View>

          <View style={styles.medicationBlock}>
            <View style={styles.medicationContent}>
              <Text style={styles.medicineName}>7b. Erectile</Text>
              <View style={styles.dosageRow}>
                <Text style={styles.dosageText}>1 - 0 - 1</Text>
                <Text style={styles.durationText}>× 5 days</Text>
              </View>
            </View>
          </View>

          {/* Before Food Section */}
          <View style={styles.medicationBlock}>
            <Text style={styles.medicationTiming}>before</Text>
            <View style={styles.medicationContent}>
              <Text style={styles.medicineName}>7b. Pud D Long</Text>
              <View style={styles.dosageRow}>
                <Text style={styles.dosageText}>1 - 0 - 0</Text>
                <Text style={styles.durationText}>× 5 days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mark Status Section */}
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Mark the status</Text>
          
          {/* Current Status Display */}
          <View style={styles.currentStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: currentStatusStyle.dot }]} />
            <Text style={styles.currentStatusLabel}>Current Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: currentStatusStyle.bg }]}>
              <Text style={[styles.statusText, { color: currentStatusStyle.text }]}>
                {currentStatus}
              </Text>
            </View>
          </View>

          {/* Status Action Buttons */}
          <View style={styles.statusButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, currentStatus === 'Packed' && styles.activeButton]}
              onPress={() => handleMarkStatus('Packed')}
            >
              <Text style={[styles.actionButtonText, currentStatus === 'Packed' && styles.activeButtonText]}>
                Mark as Packed
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, currentStatus === 'Collected' && styles.activeButton]}
              onPress={() => handleMarkStatus('Collected')}
            >
              <Text style={[styles.actionButtonText, currentStatus === 'Collected' && styles.activeButtonText]}>
                Mark as Collected
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, currentStatus === 'Rejected' && styles.activeButton]}
              onPress={() => handleMarkStatus('Rejected')}
            >
              <Text style={[styles.actionButtonText, currentStatus === 'Rejected' && styles.activeButtonText]}>
                Mark as Rejected
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notify Patient Button */}
        <TouchableOpacity style={styles.notifyButton} onPress={handleNotifyPatient}>
          <MaterialCommunityIcons name="bell-outline" size={20} color="#FFFFFF" />
          <Text style={styles.notifyButtonText}>Notify patient</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2C33',
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7C86',
    marginLeft: 6,
  },
  doctorInfo: {
    fontSize: 13,
    color: '#6B7A82',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  iconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#6B7A82',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2C33',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A2C33',
    marginLeft: 8,
    flex: 1,
  },
  callButton: {
    backgroundColor: '#2E7C86',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  linkIcon: {
    padding: 4,
  },
  prescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationBlock: {
    marginBottom: 16,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
  },
  medicationTiming: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7C86',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  medicationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2C33',
    flex: 1,
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dosageText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E7C86',
  },
  durationText: {
    fontSize: 12,
    color: '#6B7A82',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  currentStatusLabel: {
    fontSize: 13,
    color: '#6B7A82',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeButton: {
    backgroundColor: '#2E7C86',
    borderColor: '#2E7C86',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5B62',
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  notifyButton: {
    backgroundColor: '#2E7C86',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#2E7C86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  notifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderDetailsScreen;