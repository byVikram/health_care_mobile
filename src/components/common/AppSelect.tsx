import React, { useRef, useState } from "react";
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

export interface AppSelectOption {
  label: string;
  value: string;
}

interface AppSelectProps {
  options: AppSelectOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  label?: string;
  errorText?: string;
  borderRadius?: number;
  borderColor?: string;
  size?: "small" | "medium";
  style?: StyleProp<ViewStyle>;
  customCardStyle?: StyleProp<ViewStyle>;
  dropdownPosition?: "top" | "bottom";
  maxDropdownHeight?: number;
  bottomOffset?: number;
}

const DROPDOWN_GAP = 4;
const DEFAULT_DROPDOWN_HEIGHT = 220;

export const AppSelect = ({
  options,
  value,
  onSelect,
  placeholder = "Select an option",
  label,
  errorText,
  borderRadius = 8,
  borderColor = "#ccc",
  size = "medium",
  style,
  customCardStyle,
  dropdownPosition = "bottom",
  maxDropdownHeight,
  bottomOffset = 24,
}: AppSelectProps) => {
  const [visible, setVisible] = useState(false);
  const [anchorLayout, setAnchorLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const closeMenu = () => setVisible(false);
  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorLayout({ x, y, width, height });
      setVisible(true);
    });
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const resolvedBorderColor = errorText ? theme.colors.error : borderColor;
  const requestedDropdownHeight = maxDropdownHeight ?? DEFAULT_DROPDOWN_HEIGHT;
  const reservedBottomSpace = Math.max(bottomOffset, insets.bottom + bottomOffset);
  const dropdownTop =
    dropdownPosition === "top"
      ? Math.max(insets.top + DROPDOWN_GAP, anchorLayout.y - requestedDropdownHeight - DROPDOWN_GAP)
      : anchorLayout.y + anchorLayout.height + DROPDOWN_GAP;
  const availableDropdownHeight =
    dropdownPosition === "top"
      ? anchorLayout.y - insets.top - DROPDOWN_GAP * 2
      : windowHeight - dropdownTop - reservedBottomSpace;
  const dropdownHeight = Math.min(requestedDropdownHeight, Math.max(0, availableDropdownHeight));

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <AppTypography variant="caption" style={styles.label}>
          {label}
        </AppTypography>
      ) : null}

      <View ref={anchorRef} collapsable={false}>
        <TouchableRipple
          onPress={openMenu}
          borderless={false}
          style={[
            styles.dropdown,
            size === "small" && styles.dropdownSmall,
            {
              borderColor: resolvedBorderColor,
              borderRadius,
            },
            customCardStyle,
          ]}
        >
          <View style={[styles.dropdownContent, size === "small" && styles.dropdownContentSmall]}>
            <AppTypography
              variant="body"
              style={[
                styles.dropdownText,
                size === "small" && styles.dropdownTextSmall,
                { color: selectedOption ? theme.colors.onSurfaceVariant : "#7c878d" },
              ]}
              numberOfLines={1}
            >
              {selectedOption ? selectedOption.label : placeholder}
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
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => {
                      onSelect(option.value);
                      closeMenu();
                    }}
                  >
                    <AppTypography
                      variant="body"
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </AppTypography>
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
  label: {
    marginBottom: 4,
    marginLeft: 4,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#C4C4C4",
    backgroundColor: "#fff",
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
  },
  dropdownSmall: {
    height: 32,
  },
  dropdownContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  dropdownContentSmall: {
    paddingHorizontal: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
  },
  dropdownTextSmall: {
    fontSize: 12,
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
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  optionRowSelected: {
    backgroundColor: "#eef8f7",
  },
  optionText: {
    color: "#1f2a2d",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#2e7d74",
    fontWeight: "700",
  },
});
