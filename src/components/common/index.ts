export * from './buttons/AppButton'
export * from './inputs/AppInput'
export { default as AppSearchBar } from './inputs/AppSearchBar'
export type { AppSearchBarProps } from './inputs/AppSearchBar'
export * from './display/AppTypography'
export * from './layout/AppModal'
export * from './inputs/AppSelect'
export * from './inputs/AppMultiSelect'
export * from './inputs/AppTimePicker'
export * from './inputs/AppPhotoPicker'
export * from './layout/AppBottomSheet'
export * from './inputs/AppCalendar'
export * from './display/AppSkeleton'
export { default as AppToggle } from './inputs/AppToggle'
export type { AppToggleProps } from './inputs/AppToggle'
export { default as AppHeader } from './layout/AppHeader'
export { default as AppSidebar } from './layout/AppSidebar'
export type { AppSidebarItem } from './layout/AppSidebar'
export { default as SplashScreen } from './layout/SplashScreen'
export { default as DateSlotPicker } from './inputs/DateSlotPicker'
export type { PickProps as DateSlotPickerProps } from './inputs/DateSlotPicker'
export { default as AppScreenHeader, AppHeaderBackdrop } from './layout/AppScreenHeader'
export { default as AppAvatar } from './display/AppAvatar'
export { default as StatusModal } from './feedback/StatusModal'
export { default as OfflineBanner } from './feedback/OfflineBanner'
export { default as NotificationToast } from './feedback/NotificationToast'
export { default as OfflineScreen } from './feedback/OfflineScreen'
export { default as AppStickyFooter, StickyFooter } from './layout/AppStickyFooter'
export { default as ProviderDetailsCard } from './display/ProviderDetailsCard'
export type { ProviderDetailsCardProps, ProviderHoursRow } from './display/ProviderDetailsCard'
export { default as LocationSelector } from './location/LocationSelector'
export { default as NotificationPermissionPopup } from './feedback/NotificationPermissionPopup'
export { default as EventCard } from './display/EventCard'
export { default as CommonCard } from './display/CommonCard'
export { default as AppSoftCard } from './display/AppSoftCard'
export { ConsultationNotesImage } from './display/ConsultationNotesImage'
export { PrescriptionPreview } from './display/PrescriptionPreview'
export type { AppSoftCardProps } from './display/AppSoftCard'
export { default as AppAppointmentRow } from './booking/AppAppointmentRow'
export type { AppAppointmentRowProps } from './booking/AppAppointmentRow'
export { default as AppointmentActionCard } from './booking/AppointmentActionCard'
export type { AppointmentActionCardProps, AppointmentActionOutcome } from './booking/AppointmentActionCard'
export { default as AppointmentActionSheet } from './booking/AppointmentActionSheet'
export type { AppointmentActionSheetProps, ActionSheetMode, RejectReasonOption } from './booking/AppointmentActionSheet'
export {
	AppFamilyMemberSheet,
	AppFamilyMemberAvatar,
	familyMemberFirstName,
	FAMILY_RELATIONS,
	FAMILY_GENDERS,
} from './booking/AppFamilyMemberSheet'
export type {
	AppFamilyMemberSheetProps,
	AppFamilyMemberAvatarProps,
	FamilyMemberDraft,
} from './booking/AppFamilyMemberSheet'
export { AppPatientRow } from './booking/AppPatientRow'
export type { AppPatientRowProps } from './booking/AppPatientRow'
export { AppSegmentedControl } from './inputs/AppSegmentedControl'
export { AppQuantityStepper } from './inputs/AppQuantityStepper'
export type { AppQuantityStepperProps } from './inputs/AppQuantityStepper'
export type { AppSegmentedControlProps, AppSegmentedOption } from './inputs/AppSegmentedControl'
export { default as WorkingHoursSection } from './booking/WorkingHoursSection'
export type {
	WorkingHoursSectionProps,
	WorkingDayKey,
	AppointmentType,
	TimeSlot as WorkingHoursTimeSlot,
	SectionSlots,
	WorkingHoursState,
} from './booking/WorkingHoursSection'
export {
	WORKING_DAYS,
	SECTION_META,
	durationOptions as workingHoursDurationOptions,
	makeTimeOptions,
	snapToStep,
	createWorkingHoursState,
	DropdownSelect as WorkingHoursDropdownSelect,
} from './booking/WorkingHoursSection'

// Shared booking-flow components (used by Ancillary/Nursing and Laboratory) — see src/components/common/booking/
export * from './booking/ServiceCatalogCard'
export * from './booking/ServiceDetailsSheet'
export { default as NotesInput } from './booking/NotesInput'
export { default as PatientDetailsCard } from './booking/PatientDetailsCard'
export { default as SelectionRowCard } from './booking/SelectionRowCard'
export { default as BookingProgressStepper } from './booking/BookingProgressStepper'
export type { BookingProgressStepperProps, BookingStepperTheme } from './booking/BookingProgressStepper'
export { default as AddressSelectionSheet } from './booking/AddressSelection/AddressSelectionSheet'
export type { AddressRowRenderContext } from './booking/AddressSelection/AddressSelectionSheet'
export { default as AddressCardItem } from './booking/AddressSelection/AddressCardItem'
export type { AddressCardItemProps } from './booking/AddressSelection/AddressCardItem'
export { DateStrip, SlotChipGrid } from './booking/RollingDateSlotPicker'
export type { DateStripProps, SlotChipItem, SlotChipGridProps } from './booking/RollingDateSlotPicker'
export { BillingSummaryCard, AppBillSummary, AppBillStatusLine } from './booking/BookingSummary/BillingSummaryCard'
export type {
	BillingSummaryCardProps,
	BillingRow,
	BillingSummaryCardNote,
	AppBillStatusLineProps,
} from './booking/BookingSummary/BillingSummaryCard'
export { AppPaymentMethodList, AppSecurePaymentNote } from './booking/AppPaymentMethodList'
export type {
	AppPaymentMethod,
	AppPaymentMethodListProps,
	AppSecurePaymentNoteProps,
} from './booking/AppPaymentMethodList'
export { AppTicketCard } from './booking/AppTicketCard'
export type { AppTicketCardProps, AppTicketHeader, AppTicketField } from './booking/AppTicketCard'
// KarolaHealth design-language primitives (tokens in src/config/theme.ts)
export { AppIcon, AppPathIcon } from './display/AppIcon'
export type { AppIconName, AppIconProps, AppPathIconProps } from './display/AppIcon'
export { AppDashedDivider } from './display/AppDashedDivider'
export type { AppDashedDividerProps } from './display/AppDashedDivider'
export { AppRadio } from './inputs/AppRadio'
export type { AppRadioProps } from './inputs/AppRadio'
export { AppFallbackImage } from './display/AppFallbackImage'
export { AppIconTile } from './display/AppIconTile'
export type { AppIconTileProps } from './display/AppIconTile'
export { AppChip } from './inputs/AppChip'
export type { AppChipProps } from './inputs/AppChip'
export { AppActionChip } from './buttons/AppActionChip'
export type { AppActionChipProps } from './buttons/AppActionChip'
export { AppInfoBanner, INFO_BANNER_TONES } from './display/AppInfoBanner'
export type { AppInfoBannerProps, AppInfoBannerTone, AppInfoBannerAction } from './display/AppInfoBanner'
export { AppDetailRow } from './display/AppDetailRow'
export type { AppDetailRowProps, AppDetailRowAction } from './display/AppDetailRow'
export { AppSection } from './layout/AppSection'
export type { AppSectionProps } from './layout/AppSection'
export { AppStatusTimeline } from './display/AppStatusTimeline'
export type { AppStatusTimelineProps, AppTimelineStep, AppTimelineState } from './display/AppStatusTimeline'
export { AppNumberedSteps } from './display/AppNumberedSteps'
export type { AppNumberedStepsProps, AppNumberedStep } from './display/AppNumberedSteps'
export { AppFooterBar } from './layout/AppFooterBar'
export type { AppFooterBarProps, AppFooterBarSummary } from './layout/AppFooterBar'
export { AppIconButton } from './buttons/AppIconButton'
export type { AppIconButtonProps, AppIconButtonVariant } from './buttons/AppIconButton'
export { AppTextLink } from './buttons/AppTextLink'
export type { AppTextLinkProps, AppTextLinkTone } from './buttons/AppTextLink'
export { AppTag } from './display/AppTag'
export type { AppTagProps, AppTagTone } from './display/AppTag'
export { AppStatTile, AppStatRow } from './display/AppStatTile'
export type { AppStatTileProps, AppStatRowProps } from './display/AppStatTile'
export { AppProgressBar } from './display/AppProgressBar'
export type { AppProgressBarProps } from './display/AppProgressBar'
export { AppAvatarStack } from './display/AppAvatarStack'
export type { AppAvatarStackProps, AppAvatarStackItem } from './display/AppAvatarStack'
export { AppNavRow } from './layout/AppNavRow'
export type { AppNavRowProps } from './layout/AppNavRow'

// Phase 2: interactive display / input pieces
export { AppRatingStars } from './display/AppRatingStars'
export type { AppRatingStarsProps } from './display/AppRatingStars'
export { AppCodeDisplay } from './display/AppCodeDisplay'
export type { AppCodeDisplayProps, AppCodeDisplayTone } from './display/AppCodeDisplay'
export { AppCarousel } from './display/AppCarousel'
export type { AppCarouselProps, AppCarouselRenderInfo } from './display/AppCarousel'
export { AppOtpInput } from './inputs/AppOtpInput'
export type { AppOtpInputProps } from './inputs/AppOtpInput'
export { AppTabs } from './inputs/AppTabs'
export type { AppTabsProps, AppTabItem } from './inputs/AppTabs'
export { AppFilterSheet } from './inputs/AppFilterSheet'
export type { AppFilterSheetProps, AppFilterGroup, AppFilterOption } from './inputs/AppFilterSheet'

// Booking wave: provider picking, visits, bookings list, cart footer (see src/components/common/booking/)
export { AppRadioCard } from './booking/AppRadioCard'
export type { AppRadioCardProps } from './booking/AppRadioCard'
export { AppBookingCard, BOOKING_KINDS } from './booking/AppBookingCard'
export type {
	AppBookingCardProps,
	AppBookingCardAction,
	AppBookingCardNote,
	AppBookingCardNoteTone,
	BookingKind,
} from './booking/AppBookingCard'
export { AppVisitList } from './booking/AppVisitList'
export type { AppVisitListProps, AppVisitListItem } from './booking/AppVisitList'
export { AppCartFooter } from './booking/AppCartFooter'
export type { AppCartFooterProps } from './booking/AppCartFooter'
export type { AppSidebarSection, AppSidebarFamily } from './layout/AppSidebar'

// Home-care catalogue (Nursing care at home): promo slides + media catalogue rows
export { AppPromoCard } from './display/AppPromoCard'
export type { AppPromoCardProps, AppPromoCardTone } from './display/AppPromoCard'
export { AppCatalogItemRow } from './booking/AppCatalogItemRow'
export { AppBookingSuccess } from './booking/AppBookingSuccess'
export { AppCancelSheet } from './booking/AppCancelSheet'
export type { AppCancelSheetProps } from './booking/AppCancelSheet'
export { AppRescheduleSheet, AppRescheduleGroup } from './booking/AppRescheduleSheet'
export type { AppRescheduleSheetProps } from './booking/AppRescheduleSheet'
export type { AppBookingSuccessProps } from './booking/AppBookingSuccess'
export type { AppCatalogItemRowProps } from './booking/AppCatalogItemRow'
export {
	AppCatalogHeader,
	AppCatalogSection,
	AppTrustStrip,
	AppCatalogEmpty,
	AppConcernRows,
	AppConcernGrid,
} from './booking/AppCatalogBlocks'
export type { AppCatalogHeaderProps, AppTrustChip, AppConcernTileData } from './booking/AppCatalogBlocks'
export { AppAddressSheet, ADDRESS_TAGS } from './booking/AddressSelection/AppAddressSheet'
export type {
	AppAddressSheetProps,
	AppAddressOption,
	AppAddressDraft,
	AppAddressPrefill,
	CurrentLocationResult,
} from './booking/AddressSelection/AppAddressSheet'

// My bookings: category filter tile
export { AppCategoryTile } from './inputs/AppCategoryTile'
export type { AppCategoryTileProps } from './inputs/AppCategoryTile'
export { AppCheckList } from './inputs/AppCheckList'
export type { AppCheckListProps, AppCheckListItem } from './inputs/AppCheckList'
export { AppScaleSelector } from './inputs/AppScaleSelector'
export type { AppScaleSelectorProps } from './inputs/AppScaleSelector'
export { AppMetricInput } from './inputs/AppMetricInput'
export type { AppMetricInputProps } from './inputs/AppMetricInput'
export { AppPersonRow } from './booking/AppPersonRow'
export type { AppPersonRowProps } from './booking/AppPersonRow'
export { AppTimerBadge, formatElapsed } from './display/AppTimerBadge'
export type { AppTimerBadgeProps } from './display/AppTimerBadge'

// Profile redesign: labelled fields, form cards, editable lists, documents, hub header, confirm sheet
export { AppFormField, FORM_SELECT_PROPS } from './inputs/AppFormField'
export type { AppFormFieldProps } from './inputs/AppFormField'
export { AppChipGroup } from './inputs/AppChipGroup'
export type { AppChipGroupProps, AppChipGroupOption } from './inputs/AppChipGroup'
export { AppPhotoSourceSheet } from './inputs/AppPhotoSourceSheet'
export type { AppPhotoSourceSheetProps } from './inputs/AppPhotoSourceSheet'
export { AppChipPicker } from './inputs/AppChipPicker'
export type { AppChipPickerProps } from './inputs/AppChipPicker'
export { AppFormCard } from './layout/AppFormCard'
export type { AppFormCardProps } from './layout/AppFormCard'
export { AppSaveFooter } from './layout/AppSaveFooter'
export type { AppSaveFooterProps } from './layout/AppSaveFooter'
export { AppProfileHeader } from './layout/AppProfileHeader'
export type { AppProfileHeaderProps } from './layout/AppProfileHeader'
export { AppListItemSheet } from './layout/AppListItemSheet'
export type { AppListItemSheetProps, AppListItemField } from './layout/AppListItemSheet'
export { AppEditableList } from './display/AppEditableList'
export type { AppEditableListProps, AppEditableListItem } from './display/AppEditableList'
export { AppDocumentRow, DOCUMENT_LIST_TAG, documentRowStatus } from './display/AppDocumentRow'
export type { AppDocumentRowProps, AppDocumentStatus } from './display/AppDocumentRow'
export { LogoutConfirmModal } from './feedback/LogoutConfirmModal'
export { AppConfirmSheet } from './feedback/AppConfirmSheet'
export type { AppConfirmSheetProps } from './feedback/AppConfirmSheet'

// Medical records: month-grouped record list, dashed action card, empty card
export { AppRecordList } from './display/AppRecordList'
export type { AppRecordListProps, AppRecordGroup, AppRecordRowData, AppRecordTag } from './display/AppRecordList'
export { AppDashedActionCard } from './display/AppDashedActionCard'
export type { AppDashedActionCardProps } from './display/AppDashedActionCard'
export { AppEmptyCard } from './display/AppEmptyCard'
export type { AppEmptyCardProps } from './display/AppEmptyCard'
