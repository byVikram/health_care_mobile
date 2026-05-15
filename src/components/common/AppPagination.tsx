import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  page: number;
  pageSize: number;
  totalRows: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  smallFont?: boolean;
};

const PaginationBar = ({
  page,
  pageSize,
  totalRows,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  smallFont = false,
}: Props) => {
  const { width } = useWindowDimensions();
  const pickerRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isTablet = width >= 768;
  const isSmallMobile = width < 380;
  const isMobile = !isTablet;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRows / Math.max(1, pageSize)),
  );
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const start = totalRows === 0 ? 0 : startIdx + 1;
  const end = Math.min(startIdx + pageSize, totalRows);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const openMenu = () => {
    pickerRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setMenuLayout({ x, y, width: measuredWidth, height: measuredHeight });
      setMenuVisible(true);
    });
  };

  const selectPageSize = (nextSize: number) => {
    setMenuVisible(false);
    if (nextSize !== pageSize) onPageSizeChange(nextSize);
  };

  return (
    <View
      style={[
        styles.container,
        isMobile && styles.containerMobile,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: isSmallMobile ? 6 : 0,
          paddingHorizontal: smallFont ? 0 : 12,
        },
      ]}
    >
      <View style={[styles.leftSection, isMobile && styles.leftSectionMobile]}>
        <Text
          style={[
            styles.label,
            isMobile && styles.labelMobile,
            {
              fontSize: smallFont ? 11 : isTablet ? 14 : 12,
            },
          ]}
          numberOfLines={1}
        >
          {isSmallMobile ? 'Rows:' : 'Rows per page:'}
        </Text>

        <TouchableOpacity
          ref={pickerRef}
          activeOpacity={0.75}
          onPress={openMenu}
          style={[
            styles.pickerWrapper,
            isMobile && styles.pickerWrapperMobile,
            {
              width: isTablet ? 90 : 58,
              height: isTablet ? 42 : 32,
            },
          ]}
        >
          <Text
            style={[
              styles.pageSizeText,
              isMobile && styles.pageSizeTextMobile,
              {
                fontSize: isTablet ? 14 : 12,
              },
            ]}
          >
            {pageSize}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={isTablet ? 20 : 16}
            color="#222"
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.rightSection, isMobile && styles.rightSectionMobile]}>
        <Text
          style={[
            styles.rangeText,
            isMobile && styles.rangeTextMobile,
            {
              fontSize: smallFont ? 11 : isTablet ? 14 : 12,
            },
          ]}
          numberOfLines={1}
        >
          {formatNumber(start)}–{formatNumber(end)} of {formatNumber(totalRows)}
        </Text>

        <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canPrev}
            onPress={() => onPageChange(safePage - 1)}
            style={[
              styles.iconButton,
              isMobile && styles.iconButtonMobile,
              {
                opacity: canPrev ? 1 : 0.4,
                width: isTablet ? 38 : 28,
                height: isTablet ? 38 : 28,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={isTablet ? 22 : 18}
              color="#222"
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canNext}
            onPress={() => onPageChange(safePage + 1)}
            style={[
              styles.iconButton,
              isMobile && styles.iconButtonMobile,
              {
                opacity: canNext ? 1 : 0.4,
                width: isTablet ? 38 : 28,
                height: isTablet ? 38 : 28,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={isTablet ? 22 : 18}
              color="#222"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View
            style={[
              styles.menu,
              {
                top: isMobile
                  ? Math.max(8, menuLayout.y - pageSizeOptions.length * 36 - 4)
                  : menuLayout.y + menuLayout.height + 4,
                left: menuLayout.x,
                width: Math.max(menuLayout.width, 72),
              },
            ]}
          >
            {pageSizeOptions.map((option) => {
              const selected = option === pageSize;

              return (
                <Pressable
                  key={option}
                  style={[styles.menuItem, selected && styles.menuItemSelected]}
                  onPress={() => selectPageSize(option)}
                >
                  <Text style={[styles.menuItemText, selected && styles.menuItemTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PaginationBar;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  containerMobile: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSectionMobile: {
    flexShrink: 1,
    minWidth: 0,
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSectionMobile: {
    flexShrink: 0,
    marginLeft: 6,
  },

  label: {
    color: '#666',
    marginRight: 8,
    fontWeight: '400',
  },
  labelMobile: {
    marginRight: 5,
    color: '#64707d',
  },

  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
  },
  pickerWrapperMobile: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eaef',
    paddingHorizontal: 8,
  },

  pageSizeText: {
    color: '#111',
    fontWeight: '600',
    marginRight: 4,
  },
  pageSizeTextMobile: {
    color: '#111827',
  },

  rangeText: {
    color: '#666',
    marginRight: 10,
  },
  rangeTextMobile: {
    color: '#64707d',
    marginRight: 4,
  },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonRowMobile: {
    gap: 0,
  },

  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  iconButtonMobile: {
    borderRadius: 14,
  },
  menuOverlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8e5e5',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  menuItem: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  menuItemSelected: {
    backgroundColor: '#eef8f7',
  },
  menuItemText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  menuItemTextSelected: {
    color: '#0c7c7c',
  },
});
