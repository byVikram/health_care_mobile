import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Text as RNText,
} from 'react-native'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useTheme, Card, Avatar, Button, IconButton, Divider, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { SvgProps } from 'react-native-svg'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import DicomViewer from './components/DicomViewer'
import VitalsTab from './components/VitalsTab'
import ScribbleNoteEditor, { TextBlock } from './components/ScribbleNoteEditor'
import Prescription from '../../assets/icons/consultation/prescription.svg'
import LaboratoryIcon from '../../assets/icons/consultation/lab.svg'
import RadiologyTabIcon from '../../assets/icons/consultation/radiology.svg'
import AncillaryIcon from '../../assets/icons/consultation/ancillary.svg'
import { patientService, PatientDetails, DocterDetails } from './ConsultationService'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import DateSlotPicker from '../../components/common/DateSlotPicker'
import DoctorHospitalDropdown from '../../components/common/DoctorHospitalDropdown'
import {
  getDoctorAvailability,
  getDoctorById,
  getDoctorProfile,
  rescheduleAppointment,
} from '../doctor/doctorService'
import { APPOINTMENT_STATUS } from '../../constants/constants'
import { useAuth } from '../../context/AuthContext'

const SAMPLE_DICOM_MODULE = require('../../assets/dicon/sample-dicon.dcm')

// ─── Types ────────────────────────────────────────────────────────────────────

type TabItem = { id: string; Icon: React.FC<SvgProps> }

type PrescriptionSection = 'consultation' | 'pharmacy' | 'laboratory' | 'radiology'

interface SectionData {
  drawing: string
  blocks: TextBlock[]
}

interface AllSectionData {
  consultation: SectionData
  pharmacy: SectionData
  laboratory: SectionData
  radiology: SectionData
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_CONFIG: {
  id: PrescriptionSection
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  color: string
  description: string
}[] = [
  {
    id: 'consultation',
    label: 'Consultation',
    icon: 'note-text-outline',
    color: '#2B6F71',
    description: 'Chief complaints, diagnosis, clinical notes',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: 'pill',
    color: '#1565C0',
    description: 'Medications, dosage, frequency',
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    icon: 'test-tube',
    color: '#2E7D32',
    description: 'Blood tests, lab investigations',
  },
  {
    id: 'radiology',
    label: 'Radiology',
    icon: 'radioactive',
    color: '#6A1B9A',
    description: 'X-Ray, MRI, CT Scan orders',
  },
]

const EMPTY_SECTION: SectionData = { drawing: '', blocks: [] }

const INITIAL_ALL_DATA: AllSectionData = {
  consultation: { ...EMPTY_SECTION },
  pharmacy: { ...EMPTY_SECTION },
  laboratory: { ...EMPTY_SECTION },
  radiology: { ...EMPTY_SECTION },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RowItem({ label, value, numberOfLines, ellipsizeMode }: any) {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
      <Text style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}>{label}</Text>
      <Text
        style={{ fontSize: 11, fontWeight: '500', color: '#333', flex: 1 }}
        numberOfLines={numberOfLines ?? 1}
        ellipsizeMode={ellipsizeMode ?? 'tail'}
      >
        {value || '--'}
      </Text>
    </View>
  )
}

function resolveAvatar(patient: PatientDetails | null): string | undefined {
  if (!patient) return undefined
  const key = patient.avatar ?? patient.avatar_s3_key
  if (!key) return undefined
  if (typeof key === 'string' && key.startsWith('http')) return key
  return `https://your-cdn.example.com/${key}`
}

function hasSectionData(data: SectionData): boolean {
  return !!(data.drawing || data.blocks.length > 0)
}

function getTextFromBlocks(blocks: TextBlock[]): string {
  return blocks.map((b) => b.text).join('\n')
}

// ─── Section Dot Indicator ────────────────────────────────────────────────────

function SectionDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: filled ? color : 'transparent',
        borderWidth: 1.5,
        borderColor: filled ? color : '#ccc',
        marginTop: 3,
        marginLeft: 4,
      }}
    />
  )
}

// ─── Prescription Preview Modal ───────────────────────────────────────────────

interface PrescriptionPreviewProps {
  visible: boolean
  onClose: () => void
  patient: PatientDetails | null
  doctor: DocterDetails | null
  data: AllSectionData
}

function PrescriptionPreview({
  visible,
  onClose,
  patient,
  doctor,
  data,
}: PrescriptionPreviewProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const renderSection = (
    title: string,
    sectionData: SectionData,
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    color: string
  ) => {
    const textContent = getTextFromBlocks(sectionData.blocks)
    const hasDrawing = !!sectionData.drawing
    const hasText = !!textContent.trim()
    if (!hasText && !hasDrawing) return null

    return (
      <View style={prescriptionStyles.section}>
        <View style={prescriptionStyles.sectionHeader}>
          <View style={[prescriptionStyles.sectionBadge, { backgroundColor: color + '18' }]}>
            <MaterialCommunityIcons name={icon} size={14} color={color} />
            <RNText style={[prescriptionStyles.sectionTitle, { color }]}>{title}</RNText>
          </View>
        </View>
        <View style={prescriptionStyles.sectionRule} />
        {hasText && (
          <RNText style={prescriptionStyles.sectionBody}>{textContent}</RNText>
        )}
        {hasDrawing && (
          <View style={prescriptionStyles.drawingNote}>
            <MaterialCommunityIcons name="draw" size={12} color="#999" />
            <RNText style={prescriptionStyles.drawingNoteText}>
              Handwritten notes attached
            </RNText>
          </View>
        )}
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={prescriptionStyles.container}>
        {/* Toolbar */}
        <View style={prescriptionStyles.toolbar}>
          <TouchableOpacity onPress={onClose} style={prescriptionStyles.closeBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#333" />
          </TouchableOpacity>
          <RNText style={prescriptionStyles.toolbarTitle}>Prescription Preview</RNText>
          <TouchableOpacity style={prescriptionStyles.printBtn}>
            <MaterialCommunityIcons name="printer-outline" size={20} color="#2B6F71" />
            <RNText style={prescriptionStyles.printBtnText}>Print</RNText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={prescriptionStyles.scroll}
          contentContainerStyle={prescriptionStyles.scrollContent}
        >
          {/* Paper Sheet */}
          <View style={prescriptionStyles.paper}>
            {/* Rx watermark */}
            <RNText style={prescriptionStyles.rxWatermark}>℞</RNText>

            {/* Hospital Header */}
            <View style={prescriptionStyles.hospitalHeader}>
              <View style={prescriptionStyles.hospitalLogo}>
                <MaterialCommunityIcons name="hospital-building" size={28} color="#2B6F71" />
              </View>
              <View style={prescriptionStyles.hospitalInfo}>
                <RNText style={prescriptionStyles.hospitalName}>
                  {doctor?.clinicName || 'Hospital Name'}
                </RNText>
                <RNText style={prescriptionStyles.hospitalAddress}>
                  {doctor?.clinicAddress || 'Hospital Address'}
                </RNText>
              </View>
            </View>

            <View style={prescriptionStyles.headerRule} />

            {/* Doctor Info */}
            <View style={prescriptionStyles.doctorSection}>
              <RNText style={prescriptionStyles.doctorName}>
                {doctor?.name
                  ? `Dr. ${doctor.name}${doctor.degree ? `, ${doctor.degree}` : ''}`
                  : 'Doctor Name'}
              </RNText>
              {doctor?.specialization ? (
                <RNText style={prescriptionStyles.doctorSpec}>{doctor.specialization}</RNText>
              ) : null}
            </View>

            <View style={prescriptionStyles.headerRule} />

            {/* Patient Info */}
            <View style={prescriptionStyles.patientGrid}>
              <View style={prescriptionStyles.patientCol}>
                <View style={prescriptionStyles.patientRow}>
                  <RNText style={prescriptionStyles.patientLabel}>Patient</RNText>
                  <RNText style={prescriptionStyles.patientValue}>
                    {patient?.name ?? '--'}
                  </RNText>
                </View>
                <View style={prescriptionStyles.patientRow}>
                  <RNText style={prescriptionStyles.patientLabel}>Age / Gender</RNText>
                  <RNText style={prescriptionStyles.patientValue}>
                    {patient?.age ? `${patient.age} yrs` : '--'} /{' '}
                    {patient?.gender ?? '--'}
                  </RNText>
                </View>
                <View style={prescriptionStyles.patientRow}>
                  <RNText style={prescriptionStyles.patientLabel}>Blood Group</RNText>
                  <RNText style={prescriptionStyles.patientValue}>
                    {patient?.blood_group ?? '--'}
                  </RNText>
                </View>
              </View>
              <View style={prescriptionStyles.patientDivider} />
              <View style={prescriptionStyles.patientCol}>
                <View style={prescriptionStyles.patientRow}>
                  <RNText style={prescriptionStyles.patientLabel}>Patient ID</RNText>
                  <RNText style={prescriptionStyles.patientValue} numberOfLines={1}>
                    {patient?.id ?? '--'}
                  </RNText>
                </View>
                <View style={prescriptionStyles.patientRow}>
                  <RNText style={prescriptionStyles.patientLabel}>Date</RNText>
                  <RNText style={prescriptionStyles.patientValue}>{today}</RNText>
                </View>
                <View style={prescriptionStyles.patientRow}>
                  <RNText style={prescriptionStyles.patientLabel}>Phone</RNText>
                  <RNText style={prescriptionStyles.patientValue}>
                    {patient?.phone ?? '--'}
                  </RNText>
                </View>
              </View>
            </View>

            <View style={[prescriptionStyles.headerRule, { marginTop: 16 }]} />

            {/* Sections */}
            <View style={prescriptionStyles.body}>
              {renderSection('Consultation Notes', data.consultation, 'note-text-outline', '#2B6F71')}
              {renderSection('Pharmacy / Medications', data.pharmacy, 'pill', '#1565C0')}
              {renderSection('Laboratory Tests', data.laboratory, 'test-tube', '#2E7D32')}
              {renderSection('Radiology Orders', data.radiology, 'radioactive', '#6A1B9A')}

              {!SECTION_CONFIG.some((s) => hasSectionData(data[s.id])) && (
                <View style={prescriptionStyles.emptyState}>
                  <MaterialCommunityIcons name="note-off-outline" size={36} color="#ddd" />
                  <RNText style={prescriptionStyles.emptyStateText}>
                    No notes added yet
                  </RNText>
                </View>
              )}
            </View>

            {/* Footer / Signature */}
            <View style={[prescriptionStyles.headerRule, { marginBottom: 24 }]} />
            <View style={prescriptionStyles.signatureArea}>
              <View style={prescriptionStyles.signatureLine} />
              <RNText style={prescriptionStyles.signatureLabel}>
                {doctor?.name ? `Dr. ${doctor.name}` : "Doctor's Signature"}
              </RNText>
              {doctor?.degree ? (
                <RNText style={prescriptionStyles.signatureDegree}>{doctor.degree}</RNText>
              ) : null}
              <RNText style={prescriptionStyles.signatureDate}>{today}</RNText>
            </View>

            <RNText style={prescriptionStyles.footerNote}>
              This prescription is valid for 30 days from the date of issue.
            </RNText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Unified Prescription Editor Card ────────────────────────────────────────

interface PrescriptionEditorCardProps {
  data: AllSectionData
  onSectionChange: (section: PrescriptionSection, updated: SectionData) => void
  onDrawingInteraction: (active: boolean) => void
}

function PrescriptionEditorCard({
  data,
  onSectionChange,
  onDrawingInteraction,
}: PrescriptionEditorCardProps) {
  const theme = useTheme()
  const [activeSection, setActiveSection] = useState<PrescriptionSection>('consultation')

  const activeCfg = SECTION_CONFIG.find((s) => s.id === activeSection)!
  const activeData = data[activeSection]

  return (
    <Card style={editorStyles.card}>
      {/* Card header: Rx symbol + title */}
      <View style={editorStyles.cardHeader}>
        <View style={editorStyles.rxBadge}>
          <RNText style={editorStyles.rxSymbol}>℞</RNText>
        </View>
        <View style={{ flex: 1 }}>
          <RNText style={editorStyles.cardTitle}>Prescription Notes</RNText>
          <RNText style={editorStyles.cardSubtitle}>
            Select a section below, then draw, speak, or type
          </RNText>
        </View>
      </View>

      {/* Section Tabs – horizontal pill selector */}
      <View style={editorStyles.sectionTabsRow}>
        {SECTION_CONFIG.map((cfg) => {
          const isActive = activeSection === cfg.id
          const filled = hasSectionData(data[cfg.id])
          return (
            <TouchableOpacity
              key={cfg.id}
              style={[
                editorStyles.sectionTab,
                isActive && {
                  backgroundColor: cfg.color,
                  borderColor: cfg.color,
                },
                !isActive && filled && {
                  borderColor: cfg.color,
                },
              ]}
              onPress={() => setActiveSection(cfg.id)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={cfg.icon}
                size={14}
                color={isActive ? '#fff' : filled ? cfg.color : '#888'}
              />
              <RNText
                style={[
                  editorStyles.sectionTabLabel,
                  isActive && { color: '#fff', fontWeight: '700' },
                  !isActive && filled && { color: cfg.color, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {cfg.label}
              </RNText>
              {!isActive && filled && (
                <SectionDot filled={filled} color={cfg.color} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Active section info strip */}
      <View style={[editorStyles.sectionInfoStrip, { borderLeftColor: activeCfg.color }]}>
        <MaterialCommunityIcons
          name={activeCfg.icon}
          size={15}
          color={activeCfg.color}
          style={{ marginRight: 6 }}
        />
        <RNText style={[editorStyles.sectionInfoText, { color: activeCfg.color }]}>
          {activeCfg.description}
        </RNText>
        {hasSectionData(activeData) && (
          <View style={[editorStyles.filledBadge, { backgroundColor: activeCfg.color + '20' }]}>
            <RNText style={[editorStyles.filledBadgeText, { color: activeCfg.color }]}>
              Has notes
            </RNText>
          </View>
        )}
      </View>

      {/* The shared ScribbleNoteEditor */}
      <View style={editorStyles.editorContainer}>
        <ScribbleNoteEditor
          key={activeSection}
          accentColor={activeCfg.color}
          initialDrawingBase64={activeData.drawing}
          initialTextBlocks={activeData.blocks}
          onChange={(drawing) =>
            onSectionChange(activeSection, { ...activeData, drawing })
          }
          onTextChange={(blocks) =>
            onSectionChange(activeSection, { ...activeData, blocks })
          }
          onInteractionChange={onDrawingInteraction}
        />
      </View>

      {/* Section summary chips row */}
      <View style={editorStyles.summaryRow}>
        {SECTION_CONFIG.filter((s) => hasSectionData(data[s.id])).map((cfg) => (
          <View
            key={cfg.id}
            style={[editorStyles.summaryChip, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '40' }]}
          >
            <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.color} />
            <RNText style={[editorStyles.summaryChipText, { color: cfg.color }]}>
              {cfg.label}
            </RNText>
          </View>
        ))}
        {!SECTION_CONFIG.some((s) => hasSectionData(data[s.id])) && (
          <RNText style={editorStyles.noNotesHint}>
            No notes added yet — start by drawing, speaking, or typing above
          </RNText>
        )}
      </View>
    </Card>
  )
}

// ─── Past Medical History (unchanged) ────────────────────────────────────────

function PastMedicalHistory() {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState('Laboratory')
  const [dicomBase64, setDicomBase64] = useState<string | null>(null)
  const [dicomLoading, setDicomLoading] = useState(false)
  const [dicomError, setDicomError] = useState<string | null>(null)
  const [isDicomExpanded, setIsDicomExpanded] = useState(false)
  const tabs: TabItem[] = [
    { id: 'Prescription', Icon: Prescription },
    { id: 'Laboratory', Icon: LaboratoryIcon },
    { id: 'Radiology', Icon: RadiologyTabIcon },
    { id: 'Ancillary', Icon: AncillaryIcon },
  ]

  useEffect(() => {
    if (activeTab !== 'Radiology' || dicomBase64 || dicomLoading) return
    const loadDicom = async () => {
      setDicomLoading(true)
      setDicomError(null)
      try {
        const asset = Asset.fromModule(SAMPLE_DICOM_MODULE)
        await asset.downloadAsync()
        if (!asset.localUri) throw new Error('Could not resolve local URI for DICOM asset.')
        const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        setDicomBase64(base64)
      } catch (err: any) {
        setDicomError(err?.message ?? 'Failed to load DICOM file.')
      } finally {
        setDicomLoading(false)
      }
    }
    loadDicom()
  }, [activeTab])

  return (
    <Card style={[styles.card, { marginTop: 0 }]}>
      <Card.Content>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}
        >
          Past medical history
        </Text>
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const TabIcon = tab.Icon
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={styles.tabItem}
              >
                <TabIcon width={42} height={42} />
                <Text style={[styles.tabLabel, { color: isActive ? theme.colors.primary : '#999' }]}>
                  {tab.id}
                </Text>
                {isActive && (
                  <View
                    style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary }]}
                  />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Select date</Text>
          <Button
            mode="outlined"
            style={{ alignSelf: 'flex-start', borderRadius: 8 }}
            contentStyle={{ height: 36 }}
            labelStyle={{ fontSize: 11 }}
          >
            All
          </Button>
        </View>
        {activeTab === 'Radiology' ? (
          <View style={{ marginTop: 16 }}>
            {dicomLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator size="large" />
                <Text style={{ color: '#666', marginTop: 8, fontSize: 12 }}>
                  Loading DICOM image…
                </Text>
              </View>
            ) : dicomError ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#e53935" />
                <Text
                  style={{ color: '#e53935', marginTop: 8, fontSize: 12, textAlign: 'center' }}
                >
                  {dicomError}
                </Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <MaterialCommunityIcons
                    name="radioactive"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.primary,
                      fontWeight: 'bold',
                      marginLeft: 6,
                    }}
                  >
                    Radiology Scan DICOM Viewer
                  </Text>
                </View>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}
                >
                  <Button
                    mode="outlined"
                    compact
                    icon="arrow-expand"
                    onPress={() => setIsDicomExpanded(true)}
                  >
                    Expand view
                  </Button>
                </View>
                <DicomViewer base64Data={dicomBase64} />
                <Text style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
                  Drag to adjust Window/Level · Pinch or +/- to zoom · ⊙ resets view · ☀ inverts
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#ccc" />
            <Text style={{ color: '#666', marginTop: 8, fontWeight: '500' }}>
              No past {activeTab.toLowerCase()} history!
            </Text>
          </View>
        )}
      </Card.Content>
      <Modal
        visible={isDicomExpanded}
        animationType="slide"
        onRequestClose={() => setIsDicomExpanded(false)}
      >
        <View style={styles.dicomModalContainer}>
          <View style={styles.dicomModalHeader}>
            <Text style={styles.dicomModalTitle}>Radiology Image</Text>
            <IconButton
              icon="close"
              iconColor="#fff"
              onPress={() => setIsDicomExpanded(false)}
            />
          </View>
          <View style={styles.dicomModalBody}>
            <DicomViewer base64Data={dicomBase64} fullScreen />
          </View>
        </View>
      </Modal>
    </Card>
  )
}

// ─── Share With (unchanged) ───────────────────────────────────────────────────

function ShareWith() {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState('Laboratory')
  const tabs: TabItem[] = [
    { id: 'Pharmacy', Icon: Prescription },
    { id: 'Laboratory', Icon: LaboratoryIcon },
    { id: 'Radiology', Icon: RadiologyTabIcon },
    { id: 'Ancillary', Icon: AncillaryIcon },
  ]
  const MOCK_PLACES = [
    {
      id: '1',
      name: 'Apollo Pharmacy, KR Puram',
      address: '1st Block, 9th Main Rd, Bengaluru',
      phone: '+91 9876543250',
      distance: '300m away',
    },
    {
      id: '2',
      name: 'Med Plus, KR Puram',
      address: '1st Block, 9th Main Rd, Bengaluru',
      phone: '+91 9876543250',
      distance: '1.2km away',
    },
  ]

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}
        >
          Share with:
        </Text>
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const TabIcon = tab.Icon
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={styles.tabItem}
              >
                <TabIcon width={42} height={42} />
                <Text
                  style={[styles.tabLabel, { color: isActive ? theme.colors.primary : '#999' }]}
                >
                  {tab.id}
                </Text>
                {isActive && (
                  <View
                    style={[
                      styles.activeTabIndicator,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
        <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Select address</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Button
            mode="outlined"
            style={{ width: '48%', borderRadius: 8 }}
            contentStyle={{ height: 36 }}
            labelStyle={{ fontSize: 11 }}
          >
            City ▼
          </Button>
          <Button
            mode="outlined"
            style={{ width: '48%', borderRadius: 8 }}
            contentStyle={{ height: 36 }}
            labelStyle={{ fontSize: 11 }}
          >
            Area ▼
          </Button>
        </View>
        {MOCK_PLACES.map((place, i) => (
          <View
            key={place.id}
            style={{
              paddingTop: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: '#eee',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{place.name}</Text>
            <Text style={{ color: '#666', fontSize: 11, marginVertical: 4 }}>
              {place.address}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="phone" size={12} color={theme.colors.primary} />
                <Text
                  style={{ fontSize: 11, color: theme.colors.primary, marginLeft: 2, marginRight: 8 }}
                >
                  {place.phone}
                </Text>
                <Text style={{ fontSize: 11, color: '#ccc', marginRight: 8 }}>|</Text>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color="#666" />
                <Text style={{ fontSize: 11, color: '#666', marginLeft: 2 }}>
                  {place.distance}
                </Text>
              </View>
              <Button mode="contained" compact style={{ borderRadius: 8 }}>
                Share
              </Button>
            </View>
          </View>
        ))}
      </Card.Content>
    </Card>
  )
}

// ─── Main ConsultationPage ────────────────────────────────────────────────────

export default function ConsultationPage() {
  const theme = useTheme()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { width: pageWidth } = useWindowDimensions()
  const pagerRef = useRef<ScrollView>(null)
  const { selectedHospitalId } = useAuth() as any

  const [patient, setPatient] = useState<PatientDetails | null>(null)
  const [doctor, setDoctor] = useState<DocterDetails | null>(null)
  const [appointment, setAppointment] = useState<any>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  // All section data in one state object
  const [allData, setAllData] = useState<AllSectionData>(INITIAL_ALL_DATA)

  const [saving, setSaving] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)

  // Follow-up state
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpDate, setFollowUpDate] = useState<Date>(new Date())
  const [followUpSelectedSlot, setFollowUpSelectedSlot] = useState('')
  const [followUpSlots, setFollowUpSlots] = useState<any[]>([])
  const [followUpSlotsLoading, setFollowUpSlotsLoading] = useState(false)
  const [followUpHospitalId, setFollowUpHospitalId] = useState<string>('')

  const [canvasInteracting, setCanvasInteracting] = useState(false)

  const params = route.params as any
  const appointmentId = params?.appointmentId ?? params?.appointment_id ?? params?.id ?? ''
  const patientId = params?.patient_id ?? params?.patientId ?? params?.patient?.id ?? ''
  const doctorID = params?.doctor_id ?? params?.doctorID ?? params?.doctor?.id ?? ''

  // Section data update handler
  const handleSectionChange = useCallback(
    (section: PrescriptionSection, updated: SectionData) => {
      setAllData((prev) => ({ ...prev, [section]: updated }))
    },
    []
  )

  useEffect(() => {
    if (pageWidth <= 0) return
    pagerRef.current?.scrollTo({ x: pageWidth * activeTab, animated: false })
  }, [pageWidth, activeTab])

  useEffect(() => {
    const doctorFromParams = params?.doctor
    const hospitalFromParams = params?.appointment?.hospital || params?.hospital
    if (doctorFromParams) {
      setDoctor({
        name: doctorFromParams.name,
        degree: '',
        specialization: '',
        clinicName: hospitalFromParams?.name || '',
        clinicAddress: hospitalFromParams?.address || '',
      })
    }
  }, [])

  const fetchPatientData = async (id: string) => {
    setPatientLoading(true)
    try {
      const data = await patientService.getPatientDetails(id)
      setPatient(data)
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to load patient details')
    } finally {
      setPatientLoading(false)
    }
  }

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (appointmentId && !appointment) {
        try {
          const response = (await ApiService.get(
            API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId)
          )) as any
          const appointmentData = response?.data?.data || response?.data || response
          setAppointment(appointmentData)
          if (!patient && appointmentData?.patient?.id)
            fetchPatientData(appointmentData.patient.id)
          if (!doctor && appointmentData?.doctor) {
            setDoctor({
              name: appointmentData.doctor.name,
              degree: '',
              specialization: '',
              clinicName: appointmentData.hospital?.name,
              clinicAddress: appointmentData.hospital?.address,
            })
          }
        } catch (err) {
          console.error('Failed to fetch appointment details:', err)
        }
      }
    }
    fetchAppointmentDetails()
  }, [appointmentId])

  useEffect(() => {
    if (patientId && !patient) fetchPatientData(patientId)
  }, [patientId])

  useEffect(() => {
    if (!followUpOpen) return
    const fetchHospitals = async () => {
      try {
        let hospitals: any[] = []
        if (doctorID) {
          const res = await getDoctorById(doctorID)
          hospitals = res?.data?.hospitals || []
        } else {
          const res = await getDoctorProfile()
          hospitals = res?.data?.hospitals || []
        }
        if (!followUpHospitalId && hospitals.length > 0)
          setFollowUpHospitalId(hospitals[0]?.hospital?.id || '')
      } catch {}
    }
    fetchHospitals()
  }, [followUpOpen, doctorID, followUpHospitalId])

  useEffect(() => {
    if (!followUpOpen) return
    const hospitalId =
      selectedHospitalId ||
      followUpHospitalId ||
      params?.appointment?.hospital?.id ||
      params?.appointment?.hospital_id
    const dateStr = followUpDate.toISOString().split('T')[0]
    if (!hospitalId || !dateStr) {
      setFollowUpSlots([])
      setFollowUpSelectedSlot('')
      return
    }
    const fetchSlots = async () => {
      setFollowUpSlotsLoading(true)
      setFollowUpSelectedSlot('')
      try {
        const responseData = await getDoctorAvailability({
          doctor_id: doctorID,
          hospital_id: hospitalId,
          date: dateStr,
        })
        const groups = Array.isArray(responseData)
          ? responseData
          : Array.isArray((responseData as any)?.data)
          ? (responseData as any).data
          : []
        setFollowUpSlots(groups)
      } catch {
        setFollowUpSlots([])
      } finally {
        setFollowUpSlotsLoading(false)
      }
    }
    fetchSlots()
  }, [followUpOpen, followUpDate, followUpHospitalId, selectedHospitalId, doctorID, params])

  const handleConfirmFollowUp = async () => {
    if (!followUpSelectedSlot) {
      Alert.alert('Select time', 'Please select a slot.')
      return
    }
    if (!appointmentId) {
      Alert.alert('Error', 'Appointment id missing.')
      return
    }
    const hospitalId =
      selectedHospitalId ||
      followUpHospitalId ||
      params?.appointment?.hospital?.id ||
      params?.appointment?.hospital_id
    const dateStr = followUpDate.toISOString().split('T')[0]
    if (!hospitalId || !dateStr) {
      Alert.alert('Error', 'Missing hospital or date.')
      return
    }
    setFollowUpSlotsLoading(true)
    try {
      const res = await rescheduleAppointment({
        appointment_id: appointmentId,
        appointment_date: dateStr,
        start_time: followUpSelectedSlot,
        end_time: null,
        hospital_id: hospitalId,
        reason: 'Doctor follow up',
        status_id: APPOINTMENT_STATUS.CONFIRM,
      })
      if (res?.success) {
        Alert.alert('Success', res.message || 'Follow up scheduled')
        setFollowUpOpen(false)
      } else {
        Alert.alert('Error', res?.message || 'Unable to schedule follow up')
      }
    } catch {
      Alert.alert('Error', 'Unable to schedule follow up')
    } finally {
      setFollowUpSlotsLoading(false)
    }
  }

  const handleTabPress = (idx: number) => {
    setActiveTab(idx)
    pagerRef.current?.scrollTo({ x: pageWidth * idx, animated: true })
  }

  const handlePagerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextTab = Math.min(
      Math.max(Math.round(event.nativeEvent.contentOffset.x / pageWidth), 0),
      1
    )
    if (nextTab !== activeTab) setActiveTab(nextTab)
  }

  const handleSaveNotes = async () => {
    const hasAnyData = SECTION_CONFIG.some((s) => hasSectionData(allData[s.id]))
    if (!hasAnyData) {
      Alert.alert('Info', 'Please add at least one note before saving.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...allData }
      console.log('Saving notes:', payload)
      // TODO: Replace with actual API call
      Alert.alert('Success', 'Consultation notes saved successfully')
      navigation.goBack()
    } catch {
      Alert.alert('Error', 'Failed to save consultation notes')
    } finally {
      setSaving(false)
    }
  }

  if (patientLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading details…</Text>
      </View>
    )
  }

  if (!patient) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#e53935" />
        <Text style={{ marginTop: 16, color: '#e53935', textAlign: 'center' }}>
          Patient not found
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Go Back
        </Button>
      </View>
    )
  }

  const avatarUri = resolveAvatar(patient)

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            style={{ margin: 0, padding: 0 }}
          />
          {avatarUri ? (
            <Avatar.Image
              size={42}
              source={{ uri: avatarUri }}
              style={{ marginHorizontal: 12 }}
            />
          ) : (
            <Avatar.Text
              size={42}
              label={patient.name?.slice(0, 2).toUpperCase() ?? '?'}
              style={{ marginHorizontal: 12 }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              {patient.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodySmall" style={{ color: '#666', fontSize: 11 }}>
                {patient.age} yrs / {patient.gender} |{' '}
              </Text>
              <MaterialCommunityIcons
                name="phone"
                size={10}
                color="#666"
                style={{ marginHorizontal: 2 }}
              />
              <Text variant="bodySmall" style={{ color: '#666', fontSize: 11 }}>
                {patient.phone}
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            compact
            style={{ borderRadius: 20 }}
            onPress={() => {
              setFollowUpDate(new Date())
              setFollowUpSelectedSlot('')
              setFollowUpSlots([])
              setFollowUpHospitalId('')
              setFollowUpOpen(true)
            }}
          >
            + Follow up
          </Button>
        </View>
        <View style={styles.tabContainer}>
          {['Info & Timeline', 'Vitals'].map((label, idx) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.tab,
                activeTab === idx && {
                  borderBottomColor: theme.colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => handleTabPress(idx)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === idx && { color: theme.colors.primary, fontWeight: 'bold' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Horizontal Pager ── */}
      <ScrollView
        ref={pagerRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!canvasInteracting}
        onMomentumScrollEnd={handlePagerMomentumEnd}
        scrollEventThrottle={16}
      >
        {/* Tab 0: Info & Timeline */}
        <ScrollView
          style={[styles.tabPage, { width: pageWidth }]}
          contentContainerStyle={styles.content}
          scrollEnabled={!canvasInteracting}
        >
          {/* Patient Details Card */}
          <Card style={styles.card}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}
              >
                Patient Details
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ marginRight: 16 }}>
                  {avatarUri ? (
                    <Avatar.Image
                      size={70}
                      source={{ uri: avatarUri }}
                      style={{ borderRadius: 8 }}
                    />
                  ) : (
                    <Avatar.Text
                      size={70}
                      label={patient.name?.slice(0, 2).toUpperCase() ?? '?'}
                      style={{ borderRadius: 8 }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <RowItem label="Name:" value={patient.name} />
                    <RowItem
                      label="Patient ID:"
                      value={patient.id}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    />
                    <RowItem label="Age:" value={patient.age ? `${patient.age} years` : '-'} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                      <Text
                        style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}
                      >
                        Phone:
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#333' }}>
                        {patient.phone}
                      </Text>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={12}
                        color="green"
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </View>
                  <View
                    style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <RowItem label="Gender:" value={patient.gender} />
                    <RowItem label="Blood:" value={patient.blood_group} />
                    <RowItem label="Height:" value={patient.height} />
                    <RowItem label="Weight:" value={patient.weight} />
                  </View>
                </View>
              </View>
              <Divider style={{ marginVertical: 12 }} />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <RowItem label="D.O.B:" value={patient.date_of_birth} />
                  <RowItem label="Marital:" value={patient.marital_status} />
                  <RowItem label="Email:" value={patient.email} />
                </View>
                <View
                  style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.primary }}>Address:</Text>
                  <Text style={{ fontSize: 10, lineHeight: 14 }}>{patient.address}</Text>
                </View>
                <View
                  style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.primary }}>
                    Emergency Contact:
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
                    {patient.emergency_contact?.name ?? '--'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#666' }}>
                    {patient.emergency_contact?.relation ?? '--'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#d32f2f' }}>
                    {patient.emergency_contact?.number ?? '--'}
                  </Text>
                </View>
              </View>
              <Divider style={{ marginVertical: 12 }} />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.primary }}>
                    Chronic diseases:
                  </Text>
                  {(patient.chronic_diseases ?? []).map((d, i) => (
                    <Text key={i} style={{ fontSize: 10 }}>
                      {' '}
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={{ flex: 1.5 }}>
                  <RowItem label="Occupation:" value={patient.occupation} />
                  <RowItem label="Smoking:" value={patient.smoking_status} />
                  <RowItem label="Alcohol:" value={patient.alcohol_consumption} />
                  <RowItem label="Diet:" value={patient.diet_type} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.primary }}>Allergies:</Text>
                  {(patient.allergies ?? []).map((a, i) => (
                    <Text key={i} style={{ fontSize: 10 }}>
                      {' '}
                      {a}
                    </Text>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>

          <PastMedicalHistory />

          {/* Doctor header card */}
          <Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
            <View style={styles.notesHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}
                >
                  {doctor?.name ?? '--'}
                  {doctor?.degree ? `, ${doctor.degree}` : ''}
                </Text>
                <Text style={{ color: theme.colors.primary, fontSize: 10 }}>
                  {doctor?.specialization ?? ''}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text
                  style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}
                >
                  {doctor?.clinicName ?? ''}
                </Text>
                <Text style={{ color: theme.colors.primary, fontSize: 10 }}>
                  {doctor?.clinicAddress ?? ''}
                </Text>
              </View>
            </View>
          </Card>

          {/* ── Unified Prescription Editor Card ── */}
          <PrescriptionEditorCard
            data={allData}
            onSectionChange={handleSectionChange}
            onDrawingInteraction={setCanvasInteracting}
          />

          <ShareWith />

          {/* ── Action Buttons ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={() => setPreviewVisible(true)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="file-document-outline" size={18} color="#2B6F71" />
              <RNText style={styles.previewButtonText}>Preview Prescription</RNText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSaveNotes}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
              )}
              <RNText style={styles.saveButtonText}>
                {saving ? 'Saving…' : 'Save Notes'}
              </RNText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Tab 1: Vitals */}
        <View style={[styles.tabPage, styles.vitalsContent, { width: pageWidth }]}>
          <VitalsTab patientId={patient?.id || patientId} />
        </View>
      </ScrollView>

      {/* ── Prescription Preview Modal ── */}
      <PrescriptionPreview
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        patient={patient}
        doctor={doctor}
        data={allData}
      />

      {/* ── Follow-up Modal ── */}
      <Modal
        visible={followUpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowUpOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.drawerBackdrop}
          onPress={() => setFollowUpOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.drawerSheet} onPress={() => {}}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>Follow Up Appointment</Text>
                <Text style={styles.drawerSubtitle}>{patient?.name ?? 'Patient'}</Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setFollowUpOpen(false)}
              >
                <MaterialCommunityIcons name="close" size={18} color="#7a848d" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.drawerBody}
              contentContainerStyle={styles.drawerBodyContent}
            >
              <DoctorHospitalDropdown />
              <DateSlotPicker
                selectedDate={followUpDate}
                onDateChange={(date) => {
                  setFollowUpDate(date)
                  setFollowUpSelectedSlot('')
                }}
                selectedTime={followUpSelectedSlot}
                onTimeChange={setFollowUpSelectedSlot}
                availableSlots={followUpSlots}
                loading={followUpSlotsLoading}
              />
            </ScrollView>
            <View style={styles.drawerActions}>
              <TouchableOpacity
                style={styles.drawerCancelBtn}
                onPress={() => setFollowUpOpen(false)}
              >
                <Text style={styles.drawerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerConfirmBtn}
                onPress={handleConfirmFollowUp}
              >
                <Text style={styles.drawerConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// ─── Editor Card Styles ───────────────────────────────────────────────────────

const editorStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rxBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e8f4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxSymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2B6F71',
    lineHeight: 28,
    fontStyle: 'italic',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a2e2e',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  sectionTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fafafa',
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 3,
    minHeight: 58,
    justifyContent: 'center',
  },
  sectionTabLabel: {
    fontSize: 9.5,
    color: '#888',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionInfoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8fffe',
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginBottom: 2,
    borderRadius: 4,
  },
  sectionInfoText: {
    fontSize: 11,
    flex: 1,
    fontStyle: 'italic',
  },
  filledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  filledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  editorContainer: {
    marginHorizontal: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    minHeight: 40,
    alignItems: 'center',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noNotesHint: {
    fontSize: 10,
    color: '#bbb',
    fontStyle: 'italic',
  },
})

// ─── Prescription Preview Styles ──────────────────────────────────────────────

const prescriptionStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8eded',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  closeBtn: {
    padding: 4,
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a2e2e',
    marginLeft: 10,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2B6F71',
  },
  printBtnText: {
    fontSize: 13,
    color: '#2B6F71',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  paper: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  rxWatermark: {
    position: 'absolute',
    top: 40,
    right: 20,
    fontSize: 120,
    fontWeight: '900',
    color: '#f0f0f0',
    fontStyle: 'italic',
    zIndex: 0,
    lineHeight: 130,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  hospitalLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#e8f4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a2e2e',
    letterSpacing: 0.3,
  },
  hospitalAddress: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  headerRule: {
    height: 1,
    backgroundColor: '#2B6F71',
    opacity: 0.25,
    marginVertical: 10,
  },
  doctorSection: {
    paddingVertical: 6,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B6F71',
  },
  doctorSpec: {
    fontSize: 11,
    color: '#2B6F71',
    opacity: 0.75,
    marginTop: 2,
  },
  patientGrid: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 8,
  },
  patientCol: {
    flex: 1,
    gap: 5,
  },
  patientDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  patientRow: {
    flexDirection: 'column',
  },
  patientLabel: {
    fontSize: 9,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patientValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  body: {
    paddingTop: 4,
    zIndex: 1,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionRule: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    color: '#222',
    lineHeight: 20,
  },
  drawingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    opacity: 0.6,
  },
  drawingNoteText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 8,
  },
  signatureArea: {
    alignItems: 'flex-end',
    paddingRight: 8,
    marginBottom: 16,
  },
  signatureLine: {
    width: 140,
    height: 1,
    backgroundColor: '#333',
    marginBottom: 6,
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a2e2e',
  },
  signatureDegree: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },
  signatureDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 9,
    color: '#bbb',
    textAlign: 'center',
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 10,
  },
})

// ─── Page Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  vitalsContent: { flex: 1 },
  pager: { flex: 1 },
  tabPage: { flex: 1 },
  header: {
    paddingTop: 48,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  tabContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { color: '#666' },
  content: { paddingTop: 16, paddingBottom: 40 },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  notesHeader: {
    backgroundColor: '#e0f2f1',
    padding: 12,
    flexDirection: 'row',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  dicomModalContainer: { flex: 1, backgroundColor: '#000' },
  dicomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 36,
    paddingHorizontal: 8,
    backgroundColor: '#000',
  },
  dicomModalTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 12 },
  dicomModalBody: { flex: 1 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2B6F71',
    backgroundColor: '#fff',
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B6F71',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2B6F71',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // Shared tab styles
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 16,
  },
  tabItem: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: 'normal' },
  activeTabIndicator: { position: 'absolute', bottom: -10, height: 3, width: '100%' },
  // Follow-up drawer
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  drawerSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#edf1f3',
    width: '100%',
    flexShrink: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5eaee',
  },
  drawerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f6f8',
  },
  drawerBody: { flexShrink: 1 },
  drawerBodyContent: { paddingVertical: 14 },
  drawerTitle: { fontSize: 16, fontWeight: '700', color: '#233238' },
  drawerSubtitle: { fontSize: 12, color: '#62707a', marginTop: 2 },
  drawerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5eaee',
  },
  drawerCancelBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d5dde2',
    paddingHorizontal: 22,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  drawerCancelBtnText: { color: '#60717d', fontWeight: '600', fontSize: 14 },
  drawerConfirmBtn: {
    borderRadius: 20,
    backgroundColor: '#3d7b7b',
    paddingHorizontal: 22,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  drawerConfirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})