import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const TEAL = "#0c7c7c";

const specialities = [
  { id: 1, title: "Pregnancy or\nPeriod doubts",  icon: require('../../assets/specialties/dentist.png') },
  { id: 2, title: "Acne, pimple\nor Skin Issues", icon: require('../../assets/specialties/dentist.png') },
  { id: 3, title: "Performance\nissues in bed",   icon: require('../../assets/specialties/dentist.png') },
  { id: 4, title: "Cold, cough\nor fever",        icon: require('../../assets/specialties/dentist.png') },
  { id: 5, title: "Child not feeling\nwell",      icon: require('../../assets/specialties/dentist.png') },
  { id: 6, title: "Depression or\nanxiety",       icon: require('../../assets/specialties/dentist.png') },
];

export default function SpecialitySection() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const isTablet     = width >= 768;
  const isMiniTablet = width >= 600 && width < 768;
  const isWide       = isTablet || isMiniTablet;

  const availableWidth = width - 32 - 8 * 5;
  const CARD_WIDTH = isWide ? availableWidth / 6 : 110;
  const BOX_SIZE   = isWide ? Math.min(Math.floor(CARD_WIDTH) - 10, 120) : 100;

  const handleConsult = () => {
    navigation.navigate('DoctorSearch', {
      speciality_id: '3c7b1e9d-8a2f-4d6c-b5a1-7f0e2d9a8c55',
    });
  };

  // ✅ Single card component using Image
  const renderCard = (s: typeof specialities[0], cardWidth: number, boxSize: number, isTab: boolean) => (
    <View
      key={s.id}
      style={{ width: cardWidth, alignItems: 'center', gap: 6 }}
    >
      {/* ✅ PNG Image fills box with cover */}
      <View style={[styles.iconBox, { width: boxSize, height: boxSize }]}>
        <Image
          source={s.icon}
          style={{ width: boxSize, height: boxSize }}
          resizeMode="cover"
        />
      </View>

      <Text
        style={[styles.cardTitle, isTab && styles.cardTitleTablet]}
        numberOfLines={2}
      >
        {s.title}
      </Text>

      <TouchableOpacity onPress={handleConsult}>
        <Text style={[styles.consultText, isTab && styles.consultTextTablet]}>
          Consult Now
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.heading, isTablet && styles.headingTablet]}>
            Consult top doctors online for any health concern
          </Text>
          <Text style={[styles.subHeading, isTablet && styles.subHeadingTablet]}>
            Find experienced doctors across all specialties
          </Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={[styles.viewAllText, isTablet && styles.viewAllTextTablet]}>
            View All Specialities
          </Text>
        </TouchableOpacity>
      </View>

      {isWide ? (

        // ✅ TABLET / MINI-TABLET — all 6 in one row
        <View style={styles.tabletGrid}>
          {specialities.map((s) => renderCard(s, CARD_WIDTH, BOX_SIZE, isTablet))}
        </View>

      ) : (

        // ✅ MOBILE — horizontal scroll
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {specialities.map((s) => renderCard(s, CARD_WIDTH, BOX_SIZE, false))}
        </ScrollView>

      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
    paddingLeft: 10,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    lineHeight: 21,
    marginBottom: 3,
  },
  headingTablet: {
    fontSize: 18,
    lineHeight: 26,
  },
  subHeading: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },
  subHeadingTablet: {
    fontSize: 14,
    lineHeight: 20,
  },
  viewAllButton: {
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: TEAL,
    fontWeight: '600',
  },
  viewAllTextTablet: {
    fontSize: 14,
  },
  tabletGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  iconBox: {
    borderRadius: 16,
    backgroundColor: '#EAF4F4',
    overflow: 'hidden',   // ✅ clips image to rounded corners
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#222',
    textAlign: 'center',
    lineHeight: 17,
  },
  cardTitleTablet: {
    fontSize: 13,
    lineHeight: 19,
  },
  consultText: {
    fontSize: 13,
    color: TEAL,
    fontWeight: '600',
  },
  consultTextTablet: {
    fontSize: 14,
  },
});