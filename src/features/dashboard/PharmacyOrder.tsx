import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import PendingIcon from '../../assets/Pharmacy/Pendingorders.svg'
import OnTheWayIcon from '../../assets/Pharmacy/Ontheway.svg'
import DeliveredIcon from '../../assets/Pharmacy/Deliveredorders.svg'
import CancelledIcon from '../../assets/Pharmacy/Cancelledorders.svg'
import DocIcon from '../../assets/Pharmacy/docxs.svg'

export default function OrdersScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* HEADER */}
      <Text style={styles.title}>Orders</Text>

      {/* MAIN CARD */}
      <View style={styles.mainCard}>
        <View style={styles.mainLeft}>
          <View style={styles.iconBox}>
            <DocIcon width={28} height={28} />
          </View>

          <Text style={styles.mainText}>
            Manage the orders shared by doctors/patients
          </Text>
        </View>

        <TouchableOpacity style={styles.viewBtn}>
          <Text style={styles.viewText}>View</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#2bbec7" />
        </TouchableOpacity>
      </View>

      {/* GRID */}
      <View style={styles.grid}>

        {/* Pending */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.smallIcon}>
              <PendingIcon width={48} height={48} />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Pending orders</Text>
              <Text style={styles.cardValue}>03 Orders</Text>
            </View>
          </View>
        </View>

        {/* On the way */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.smallIcon}>
              <OnTheWayIcon width={48} height={48} />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>On the way</Text>
              <Text style={styles.cardValue}>08 Orders</Text>
            </View>
          </View>
        </View>

        {/* Delivered */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.smallIcon}>
              <DeliveredIcon width={48} height={48} />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Delivered orders</Text>
              <Text style={styles.cardValue}>120 Orders</Text>
            </View>
          </View>
        </View>

        {/* Cancelled */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.smallIcon}>
              <CancelledIcon width={48} height={48} />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Cancelled orders</Text>
              <Text style={styles.cardValue}>21 Orders</Text>
            </View>
          </View>
        </View>

      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbfc',
    padding: 16,
  },

  title: {
    fontSize: 22,
    marginBottom: 16,
    
  },

  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 20,
  },

  mainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#eaf1ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mainText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },

  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  viewText: {
    color: '#2bbec7',
    fontWeight: '600',
    fontSize: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    
  },

  textBlock: {
    marginLeft: 10,
    flexShrink: 1,
  },

  cardTitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },

  cardValue: {
    fontSize: 15,
   
    
  },
})