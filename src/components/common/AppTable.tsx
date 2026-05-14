import React, { useMemo, useState } from 'react'
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

type SortDirection = 'asc' | 'desc'
type Align = 'left' | 'center' | 'right' | 'justify' | 'inherit'

export interface AppTableColumnOption {
	value: string
	label: string
	color: string
}

export interface AppTableColumn<T extends Record<string, unknown>> {
	id: keyof T
	label: string
	sortable?: boolean
	align?: Align
	format?: (value: T[keyof T], row: T) => React.ReactNode
	options?: AppTableColumnOption[]
	width?: string | number
	variant?: string
	truncateWithEllipsis?: boolean
}

export interface AppTableProps<T extends Record<string, unknown> & { id: string | number }> {
	columns: AppTableColumn<T>[]
	data: T[]
	totalRows: number
	isAction?: boolean
	loading?: boolean
	defaultSortBy?: keyof T
	defaultSortDirection?: SortDirection
	defaultPage?: number
	defaultPageSize?: number
	pageSizeOptions?: number[]
	onSortChange?: (sortBy: keyof T, sortDirection: SortDirection) => void
	onPageChange?: (page: number, pageSize: number) => void
	onCellChange?: (rowId: T['id'], columnId: keyof T, newValue: T[keyof T]) => void
	emptyMessage?: string
	showPagination?: boolean
	rowPadding?: string | number
	onRefresh?: () => void
	onRowClick?: (row: T) => void
	smallFont?: boolean
	highlightedRowValue?: string | number
	highlightedRowKey?: keyof T
	highlightColor?: string
	getRowProps?: (row: T) => { style?: ViewStyle; disabled?: boolean }
}

const HEADER_BACKGROUND = '#E0F0F3'
const HEADER_BORDER = '#A8D5DC'
const HEADER_TEXT = '#2E7D8C'
const BORDER = '#E0E0E0'
const TEAL = '#0c7c7c'

const toWidth = (value?: string | number) => {
	if (typeof value === 'number') return value
	if (!value) return 140

	const parsed = Number(String(value).replace('px', ''))
	return Number.isFinite(parsed) ? parsed : 140
}

const toPadding = (value?: string | number) => {
	if (typeof value === 'number') {
		return { paddingVertical: value, paddingHorizontal: value }
	}

	if (!value) return { paddingVertical: 10, paddingHorizontal: 12 }

	const parts = value
		.replace(/px/g, '')
		.split(' ')
		.map((part) => Number(part))
		.filter((part) => Number.isFinite(part))

	if (parts.length === 1) {
		return { paddingVertical: parts[0], paddingHorizontal: parts[0] }
	}

	return {
		paddingVertical: parts[0] ?? 10,
		paddingHorizontal: parts[1] ?? 12,
	}
}

const alignStyle = (align?: Align): ViewStyle => {
	if (align === 'center') return { alignItems: 'center' }
	if (align === 'right') return { alignItems: 'flex-end' }
	return { alignItems: 'flex-start' }
}

const textAlign = (align?: Align) => {
	if (align === 'center') return 'center' as const
	if (align === 'right') return 'right' as const
	return 'left' as const
}

function AppTable<T extends Record<string, unknown> & { id: string | number }>(
	props: AppTableProps<T>
) {
	const {
		columns,
		data,
		totalRows,
		isAction = false,
		loading = false,
		defaultSortBy,
		defaultSortDirection = 'asc',
		defaultPage = 1,
		defaultPageSize = 10,
		pageSizeOptions = [10, 20, 50],
		onSortChange,
		onPageChange,
		emptyMessage = 'No data available',
		showPagination = true,
		rowPadding = '10px 12px',
		onRefresh,
		onRowClick,
		highlightedRowValue,
		highlightedRowKey,
		highlightColor = '#E3F2FD',
		getRowProps,
		smallFont = false,
	} = props

	const [order, setOrder] = useState<SortDirection>(defaultSortDirection)
	const [orderBy, setOrderBy] = useState<keyof T>(defaultSortBy || columns[0]?.id)
	const [page, setPage] = useState(defaultPage)
	const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize)

	const cellPadding = useMemo(() => toPadding(rowPadding), [rowPadding])
	const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage))
	const tableWidth = useMemo(
		() => columns.reduce((sum, column) => sum + toWidth(column.width), isAction ? 96 : 0),
		[columns, isAction]
	)

	const handleSort = (property: keyof T, direction: SortDirection) => {
		setOrder(direction)
		setOrderBy(property)
		onSortChange?.(property, direction)
	}

	const handlePageChange = (nextPage: number) => {
		const boundedPage = Math.max(1, Math.min(totalPages, nextPage))
		setPage(boundedPage)
		onPageChange?.(boundedPage, rowsPerPage)
	}

	const handlePageSizeChange = () => {
		const currentIndex = pageSizeOptions.findIndex((option) => option === rowsPerPage)
		const nextSize = pageSizeOptions[(currentIndex + 1) % pageSizeOptions.length] ?? rowsPerPage
		setRowsPerPage(nextSize)
		setPage(1)
		onPageChange?.(1, nextSize)
	}

	const isRowHighlighted = (row: T) => {
		if (highlightedRowValue === undefined || highlightedRowValue === null) return false
		const key = highlightedRowKey ?? ('id' as keyof T)
		return String(row[key]) === String(highlightedRowValue)
	}

	const renderCellContent = (column: AppTableColumn<T>, row: T) => {
		const value = row[column.id]

		if (column.format) return column.format(value, row)

		if (column.variant === 'box') {
			const num = Number(value)
			const showRefresh = value == null || Number.isNaN(num) || num === 0

			return (
				<View style={styles.boxValue}>
					{showRefresh ? (
						<TouchableOpacity onPress={onRefresh} disabled={loading} activeOpacity={0.75}>
							<MaterialCommunityIcons name="refresh" size={16} color="#0954D5" />
						</TouchableOpacity>
					) : (
						<Text style={[styles.cellText, smallFont && styles.smallText]}>{Math.floor(num)}</Text>
					)}
				</View>
			)
		}

		if (column.options) {
			const selectedOption =
				column.options.find((option) => option.value === String(value)) || column.options[0]

			return (
				<View style={[styles.chip, { backgroundColor: selectedOption.color }]}>
					<Text style={styles.chipText}>{selectedOption.label}</Text>
				</View>
			)
		}

		const stringValue = String(value)
		const displayValue =
			stringValue === 'undefined' || stringValue === 'null' ? '-' : stringValue

		return (
			<Text
				style={[
					styles.cellText,
					smallFont && styles.smallText,
					{ textAlign: textAlign(column.align) },
				]}
				numberOfLines={column.truncateWithEllipsis === false ? undefined : 1}
			>
				{displayValue}
			</Text>
		)
	}

	return (
		<View>
			<ScrollView horizontal showsHorizontalScrollIndicator>
				<View style={[styles.table, { width: tableWidth }]}>
					<View style={styles.headerRow}>
						{columns.map((column, index) => (
							<View
								key={String(column.id)}
								style={[
									styles.headerCell,
									index === 0 && styles.firstHeaderCell,
									index === columns.length - 1 && !isAction && styles.lastHeaderCell,
									{ width: toWidth(column.width) },
									alignStyle(column.align),
								]}
							>
								{column.sortable ? (
									<View style={styles.sortHeader}>
										<Text
											style={[
												styles.headerText,
												smallFont && styles.smallHeaderText,
												{ textAlign: textAlign(column.align) },
											]}
										>
											{column.label}
										</Text>

										<View style={styles.sortIcons}>
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel={`Sort ${column.label} ascending`}
												onPress={() => handleSort(column.id, 'asc')}
											>
												<MaterialCommunityIcons
													name="arrow-up"
													size={12}
													color={orderBy === column.id && order === 'asc' ? '#1f2937' : '#9aa4af'}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel={`Sort ${column.label} descending`}
												onPress={() => handleSort(column.id, 'desc')}
											>
												<MaterialCommunityIcons
													name="arrow-down"
													size={12}
													color={orderBy === column.id && order === 'desc' ? '#1f2937' : '#9aa4af'}
												/>
											</TouchableOpacity>
										</View>
									</View>
								) : (
									<Text
										style={[
											styles.headerText,
											smallFont && styles.smallHeaderText,
											{ textAlign: textAlign(column.align) },
										]}
									>
										{column.label}
									</Text>
								)}
							</View>
						))}

						{isAction && (
							<View style={[styles.headerCell, styles.lastHeaderCell, { width: 96 }, alignStyle('right')]}>
								<Text style={[styles.headerText, smallFont && styles.smallHeaderText]}>Actions</Text>
							</View>
						)}
					</View>

					{loading ? (
						<View style={styles.stateRow}>
							<ActivityIndicator color={TEAL} />
						</View>
					) : data.length === 0 ? (
						<View style={styles.stateRow}>
							<Text style={styles.emptyText}>{emptyMessage}</Text>
						</View>
					) : (
						data.map((row) => {
							const highlighted = isRowHighlighted(row)
							const rowProps = getRowProps?.(row)
							const disabled = rowProps?.disabled || !onRowClick

							return (
								<TouchableOpacity
									key={String(row.id)}
									activeOpacity={onRowClick ? 0.82 : 1}
									disabled={disabled}
									onPress={() => onRowClick?.(row)}
									style={[
										styles.bodyRow,
										highlighted && { backgroundColor: highlightColor },
										rowProps?.style,
									]}
								>
									{columns.map((column) => (
										<View
											key={String(column.id)}
											style={[
												styles.bodyCell,
												cellPadding,
												{ width: toWidth(column.width) },
												alignStyle(column.align),
											]}
										>
											{renderCellContent(column, row)}
										</View>
									))}

									{isAction && <View style={[styles.bodyCell, cellPadding, { width: 96 }]} />}
								</TouchableOpacity>
							)
						})
					)}
				</View>
			</ScrollView>

			{showPagination && (
				<View style={styles.pagination}>
					<View>
						<Text style={[styles.paginationText, smallFont && styles.smallText]}>
							Page {page} of {totalPages}
						</Text>
						<Text style={[styles.paginationSubText, smallFont && styles.smallText]}>
							{totalRows} rows · {rowsPerPage} per page
						</Text>
					</View>

					<View style={styles.paginationActions}>
						<TouchableOpacity style={styles.pageSizeButton} onPress={handlePageSizeChange}>
							<Text style={styles.pageSizeText}>{rowsPerPage}</Text>
							<MaterialCommunityIcons name="chevron-down" size={16} color={TEAL} />
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
							disabled={page <= 1}
							onPress={() => handlePageChange(page - 1)}
						>
							<MaterialCommunityIcons name="chevron-left" size={20} color={page <= 1 ? '#9aa4af' : TEAL} />
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
							disabled={page >= totalPages}
							onPress={() => handlePageChange(page + 1)}
						>
							<MaterialCommunityIcons name="chevron-right" size={20} color={page >= totalPages ? '#9aa4af' : TEAL} />
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	table: {
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#ffffff',
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 2,
		borderBottomColor: HEADER_BORDER,
	},
	headerCell: {
		minHeight: 48,
		justifyContent: 'center',
		paddingHorizontal: 12,
		paddingVertical: 12,
		backgroundColor: HEADER_BACKGROUND,
	},
	firstHeaderCell: {
		borderTopLeftRadius: 12,
	},
	lastHeaderCell: {
		borderTopRightRadius: 12,
	},
	headerText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: HEADER_TEXT,
	},
	smallHeaderText: {
		fontSize: 11,
		lineHeight: 14,
	},
	sortHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		maxWidth: '100%',
	},
	sortIcons: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 8,
	},
	bodyRow: {
		minHeight: 48,
		flexDirection: 'row',
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
	},
	bodyCell: {
		justifyContent: 'center',
	},
	cellText: {
		fontSize: 12,
		lineHeight: 16,
		color: '#1f2937',
	},
	smallText: {
		fontSize: 11,
		lineHeight: 14,
	},
	boxValue: {
		width: 22,
		height: 22,
		borderWidth: 1,
		borderColor: TEAL,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chip: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	chipText: {
		fontSize: 12,
		lineHeight: 14,
		color: '#ffffff',
		fontWeight: '700',
	},
	stateRow: {
		minHeight: 120,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
	},
	emptyText: {
		fontSize: 12,
		lineHeight: 18,
		color: '#64707d',
	},
	pagination: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
	},
	paginationText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: '#1f2937',
	},
	paginationSubText: {
		fontSize: 11,
		lineHeight: 15,
		color: '#64707d',
		marginTop: 2,
	},
	paginationActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	pageSizeButton: {
		height: 34,
		borderRadius: 17,
		borderWidth: 1,
		borderColor: '#d9e2e2',
		backgroundColor: '#ffffff',
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	pageSizeText: {
		fontSize: 12,
		fontWeight: '700',
		color: TEAL,
		marginRight: 2,
	},
	pageButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		borderWidth: 1,
		borderColor: '#d9e2e2',
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	pageButtonDisabled: {
		backgroundColor: '#f4f6f8',
	},
})

export default AppTable
