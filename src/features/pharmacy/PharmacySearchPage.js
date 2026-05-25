// screens/pharmacy/PharmacyOrdersPage.js
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/common/AppHeader';
import Card from '../../components/common/CommonCard';

const statusStyles = {
  Pending: { bg: '#FFF1D9', text: '#F0A018' },
  Collected: { bg: '#DFF5E4', text: '#43A047' },
  Rejected: { bg: '#FFE3E7', text: '#E74B5B' },
  Packed: { bg: '#DEE9FF', text: '#3F7EE8' },
};

const medicineOrders = [
  {
    id: 'ord1',
    group: 'Today, Nov 24-2025',
    name: 'Nitin S H',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Pending',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 'ord2',
    group: 'Monday, Nov 09-2025',
    name: 'Aditi',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Collected',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 'ord3',
    group: 'Monday, Nov 09-2025',
    name: 'Rakesh',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Collected',
  },
  {
    id: 'ord4',
    group: 'Friday, Aug 09-2024',
    name: 'Aditi',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Rejected',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    id: 'ord5',
    group: 'Friday, Aug 09-2024',
    name: 'Narasappa',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Packed',
    avatar: 'https://randomuser.me/api/portraits/men/46.jpg',
  },
  {
    id: 'ord6',
    group: 'Friday, Aug 09-2024',
    name: 'Avinash',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Packed',
  },
  {
    id: 'ord7',
    group: 'Friday, Aug 09-2024',
    name: 'Shashant',
    orderId: 'OID1234',
    doctor: 'Dr Anitha Rao',
    clinic: 'Dentist at Aayus Clinic',
    date: '22 Nov 2025',
    time: '10:30 AM',
    status: 'Packed',
  },
];

const OrderCard = ({ order, onPress }) => {
  const status = statusStyles[order.status] || statusStyles.Pending;

  return (
    <Card style={styles.orderCard} onPress={onPress}>
      <View style={styles.avatarBox}>
        {order.avatar ? (
          <Image source={{ uri: order.avatar }} style={styles.avatar} />
        ) : (
          <MaterialCommunityIcons name="account" size={34} color="#ffffff" />
        )}
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.patientName}>
            {order.name}
          </Text>
          <Text style={styles.orderId}>({order.orderId})</Text>
        </View>
        <Text numberOfLines={1} style={styles.doctorText}>
          By {order.doctor} - {order.clinic}
        </Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={10}
            color="#8b969b"
          />
          <Text style={styles.metaText}>{order.date}</Text>
          <MaterialCommunityIcons
            name="clock-time-three-outline"
            size={10}
            color="#8b969b"
          />
          <Text style={styles.metaText}>{order.time}</Text>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.text }]}>
          {order.status}
        </Text>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#2E7C86" />
    </Card>
  );
};

export default function PharmacyOrdersPage() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('Date');

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return medicineOrders;
    return medicineOrders.filter((order) => {
      return (
        order.name.toLowerCase().includes(query) ||
        order.orderId.toLowerCase().includes(query) ||
        order.doctor.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const renderOrder = ({ item, index }) => {
    const previous = filteredOrders[index - 1];
    const showGroupTitle = !previous || previous.group !== item.group;

    return (
      <View>
        {showGroupTitle && <Text style={styles.groupTitle}>{item.group}</Text>}
        <OrderCard
          order={item}
          onPress={() => navigation.navigate('OrderDetails', { order: item })}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        variant="search"
        location="KR Market"
        onAvatarPress={() => navigation.goBack()}
        isSearchEditable={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {}}
      />

      <View style={styles.content}>
        <Text style={styles.pageTitle}>List of medicine orders</Text>
        <Text style={styles.label}>Select date:</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.dateSelect}
          onPress={() =>
            setSelectedDate(selectedDate === 'Date' ? 'Nov 24-2025' : 'Date')
          }
        >
          <Text style={styles.dateText}>{selectedDate}</Text>
          <View style={styles.dateDivider} />
          <MaterialCommunityIcons name="chevron-down" size={20} color="#6d7f86" />
        </TouchableOpacity>

        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>
                Try a different order ID or patient name.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pageTitle: {
    color: '#24292b',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    color: '#7d868a',
    fontSize: 12,
    marginBottom: 6,
  },
  dateSelect: {
    height: 38,
    borderWidth: 1,
    borderColor: '#2E9CAA',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateText: {
    flex: 1,
    color: '#236772',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  dateDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#d8e2e5',
  },
  listContent: {
    paddingBottom: 30,
  },
  groupTitle: {
    color: '#9aa1a5',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 4,
  },
  orderCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#dfe4e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  orderInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  patientName: {
    color: '#22292c',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 100,
  },
  orderId: {
    color: '#2E7C86',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
  },
  doctorText: {
    color: '#68777d',
    fontSize: 8,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#8b969b',
    fontSize: 8,
    marginRight: 6,
  },
  statusBadge: {
    width: 70,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#536167',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: '#8b969b',
    fontSize: 12,
    marginTop: 6,
  },
});