import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableRipple, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTypography } from "./AppTypography";
import type { AppSelectOption } from "./AppSelect";

export interface AppMultiSelectProps {
  options: AppSelectOption[];
  values?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  errorText?: string;
  borderRadius?: number;
  borderColor?: string;
  size?: "small" | "medium" | "compact" | "form";
  style?: StyleProp<ViewStyle>;
  customCardStyle?: StyleProp<ViewStyle>;
  noMargin?: boolean;
  floatingLabel?: boolean;
  dropdownPosition?: "top" | "bottom" | "auto";
  maxDropdownHeight?: number;
  bottomOffset?: number;
}

const DROPDOWN_GAP = 4;
const DEFAULT_DROPDOWN_HEIGHT = 220;
const OPTION_ROW_MIN_HEIGHT = 44;
const SELECT_HEIGHTS = {
  small: 32,
  compact: 42,
  form: 48,
  medium: 56,
};
const SELECT_HORIZONTAL_PADDING = {
  small: 10,
  compact: 14,
  form: 14,
  medium: 16,
};
const SELECT_TEXT_SIZE = {
  small: 12,
  compact: 14,
  form: 14,
  medium: 16,
};

export const AppMultiSelect = ({
  options,
  values = [],
  onChange,
  placeholder = "Select options",
  label,
  errorText,
  borderRadius = 8,
  borderColor,
  size = "medium",
  style,
  customCardStyle,
  noMargin = false,
  floatingLabel = false,
  dropdownPosition = "auto",
  maxDropdownHeight,
  bottomOffset = 24,
}: AppMultiSelectProps) => {
  const [visible, setVisible] = useState(false);
  const [anchorLayout, setAnchorLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const selectedValues = useMemo(() => Array.from(new Set(values)), [values]);
  const selectedValueSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedLabels = useMemo(
    () => options.filter((option) => selectedValueSet.has(option.value)).map((option) => option.label),
    [options, selectedValueSet],
  );

  const closeMenu = () => setVisible(false);
  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height });
      setVisible(true);
    });
  };

  const toggleValue = (value: string) => {
    if (selectedValueSet.has(value)) {
      onChange(selectedValues.filter((selectedValue) => selectedValue !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  const displayValue = selectedLabels.join(", ");
  const resolvedBorderColor = errorText ? theme.colors.error : borderColor ?? (size === "medium" ? "#ccc" : "#a7d3db");
  const selectHeight = SELECT_HEIGHTS[size];
  const horizontalPadding = SELECT_HORIZONTAL_PADDING[size];
  const textSize = SELECT_TEXT_SIZE[size];
  const requestedDropdownHeight = maxDropdownHeight ?? DEFAULT_DROPDOWN_HEIGHT;
  const estimatedContentHeight = Math.min(requestedDropdownHeight, Math.max(OPTION_ROW_MIN_HEIGHT, options.length * OPTION_ROW_MIN_HEIGHT));
  const reservedBottomSpace = Math.max(bottomOffset, insets.bottom + bottomOffset);
  const availableSpaceAbove = Math.max(0, anchorLayout.y - insets.top - DROPDOWN_GAP * 2);
  const availableSpaceBelow = Math.max(
    0,
    windowHeight - (anchorLayout.y + anchorLayout.height + DROPDOWN_GAP) - reservedBottomSpace,
  );
  const resolvedDropdownPosition =
    dropdownPosition === "auto"
      ? availableSpaceBelow >= estimatedContentHeight || availableSpaceBelow >= availableSpaceAbove
        ? "bottom"
        : "top"
      : dropdownPosition;
  const availableDropdownHeight =
    resolvedDropdownPosition === "top" ? availableSpaceAbove : availableSpaceBelow;
  const dropdownHeight = Math.min(estimatedContentHeight, Math.max(0, availableDropdownHeight));
  const dropdownTop =
    resolvedDropdownPosition === "top"
      ? Math.max(insets.top + DROPDOWN_GAP, anchorLayout.y - dropdownHeight - DROPDOWN_GAP)
      : anchorLayout.y + anchorLayout.height + DROPDOWN_GAP;

  return (
    <View style={[styles.container, noMargin && styles.containerNoMargin, floatingLabel && styles.containerFloatingLabel, style]}>
      {label ? (
        <AppTypography variant="caption" style={[styles.label, floatingLabel && styles.floatingLabel]}>
          {label}
        </AppTypography>
      ) : null}

      <View ref={anchorRef} collapsable={false}>
        <TouchableRipple
          onPress={openMenu}
          borderless={false}
          style={[
            styles.dropdown,
            {
              borderColor: resolvedBorderColor,
              borderRadius,
              height: selectHeight,
              minHeight: selectHeight,
            },
            customCardStyle,
          ]}
        >
          <View style={[styles.dropdownContent, { paddingHorizontal: horizontalPadding }]}>
            <AppTypography
              variant="body"
              style={[
                styles.dropdownText,
                { fontSize: textSize },
                { color: displayValue ? theme.colors.onSurfaceVariant : "#7c878d" },
              ]}
              numberOfLines={1}
            >
              {displayValue || placeholder}
            </AppTypography>
            <MaterialCommunityIcons
              name={visible ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.outline}
              style={styles.chevron}
            />
          </View>
        </TouchableRipple>
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.dropdownMenu,
              {
                top: dropdownTop,
                left: anchorLayout.x,
                width: anchorLayout.width,
                maxHeight: dropdownHeight,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={styles.optionsList}
            >
              {options.map((option) => {
                const isSelected = selectedValueSet.has(option.value);

                return (
                  <Pressable
                    key={option.value}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => toggleValue(option.value)}
                  >
                    <AppTypography
                      variant="body"
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </AppTypography>
                    <MaterialCommunityIcons
                      name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                      size={20}
                      color={isSelected ? "#2e7d74" : "#9ca3af"}
                      style={styles.checkIcon}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {errorText ? (
        <AppTypography variant="caption" color={theme.colors.error} style={styles.errorText}>
          {errorText}
        </AppTypography>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  containerNoMargin: {
    marginBottom: 0,
  },
  containerFloatingLabel: {
    paddingTop: 0,
  },
  label: {
    marginBottom: 4,
    marginLeft: 4,
  },
  floatingLabel: {
    position: "absolute",
    top: -11,
    left: 17,
    zIndex: 2,
    paddingHorizontal: 7,
    backgroundColor: "#fff",
    color: "#7b8790",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 0,
    marginLeft: 0,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#C4C4C4",
    backgroundColor: "#fff",
    justifyContent: "center",
    overflow: "hidden",
  },
  dropdownContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  dropdownText: {
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownMenu: {
    position: "absolute",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8e5e5",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  optionsList: {
    width: "100%",
  },
  optionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  optionRowSelected: {
    backgroundColor: "#eef8f7",
  },
  optionText: {
    flex: 1,
    color: "#1f2a2d",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#2e7d74",
    fontWeight: "700",
  },
  checkIcon: {
    marginLeft: 8,
  },
});
