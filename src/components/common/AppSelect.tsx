import React, { useRef, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Menu, TouchableRipple, useTheme } from "react-native-paper";
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
}

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
}: AppSelectProps) => {
  const [visible, setVisible] = useState(false);
  const [fieldWidth, setFieldWidth] = useState(0);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const theme = useTheme();
  const touchableRef = useRef<View>(null);

  const closeMenu = () => setVisible(false);

  const openMenu = () => {
    touchableRef.current?.measure((fx, fy, width, height, px, py) => {
      setFieldWidth(width);
      setAnchor({ x: px, y: py + height });
      setVisible(true);
    });
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const resolvedBorderColor = errorText ? theme.colors.error : borderColor;

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <AppTypography variant="caption" style={styles.label}>
          {label}
        </AppTypography>
      ) : null}

      <Menu
        visible={visible}
        onDismiss={closeMenu}
        contentStyle={{
          width: fieldWidth,
          borderRadius: 8,
          backgroundColor: "#fff",
        }}
        anchor={anchor}
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            onPress={() => {
              onSelect(option.value);
              closeMenu();
            }}
            title={option.label}
            style={{ width: fieldWidth }}
          />
        ))}
      </Menu>

      <TouchableRipple
        ref={touchableRef}
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
          <AppTypography variant="body" color={theme.colors.outline} style={styles.chevron}>
            ▼
          </AppTypography>
        </View>
      </TouchableRipple>

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
});
