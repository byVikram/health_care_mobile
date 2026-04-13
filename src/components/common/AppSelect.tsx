import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Menu, useTheme, TouchableRipple } from "react-native-paper";
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
  borderRadius?: number; // 👈 optional custom border radius
  borderColor?: string; // 👈 optional custom border color
}

export const AppSelect = ({
  options,
  value,
  onSelect,
  placeholder = "Select an option",
  label,
  errorText,
  borderRadius = 12, // 👈 default border radius
  borderColor = "#ccc", // 👈 default border color
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

  // resolve border color: error > custom > default
  const resolvedBorderColor = errorText ? theme.colors.error : borderColor;

  return (
    <View style={styles.container}>
      {label && (
        <AppTypography variant="caption" style={styles.label}>
          {label}
        </AppTypography>
      )}

      <Menu
        visible={visible}
        onDismiss={closeMenu}
        contentStyle={{ width: fieldWidth, borderRadius: 8, backgroundColor:'#fff' }} // 👈 menu corners
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
            style={{
              width: fieldWidth,
            //   color: selectedOption
            //     ? theme.colors.primary
            //     : theme.colors.onSurfaceVariant, // ✅ YOUR PLACEHOLDER COLOR
            }}
          />
        ))}
      </Menu>

      <TouchableRipple
        ref={touchableRef}
        onPress={openMenu}
        borderless={false}
        style={[
          styles.dropdown,
          {
            borderColor: errorText ? theme.colors.error : theme.colors.outline, // ✅ EXACT match
            borderRadius: 8, // 👈 dynamic border radius
          },
        ]}
      >
        <View style={styles.dropdownContent}>
          <AppTypography
            variant="body"
            style={{
              fontSize: 16,
              color: selectedOption ? theme.colors.onSurfaceVariant : "", // ✅ YOUR PLACEHOLDER COLOR
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </AppTypography>
          <AppTypography variant="body" color={theme.colors.outline}>
            ▼
          </AppTypography>
        </View>
      </TouchableRipple>

      {errorText ? (
        <AppTypography
          variant="caption"
          color={theme.colors.error}
          style={styles.errorText}
        >
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
    // color: theme.colors.onSurface,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 4, // ✅ SAME as TextInput
    borderColor: "#C4C4C4", // ❌ remove later (see below)
    backgroundColor: "#fff",
    height: 56, // ✅ SAME height
    justifyContent: "center",
    overflow: "hidden",
  },
  dropdownContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
