import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Menu, useTheme, TouchableRipple } from 'react-native-paper';
import { AppTypography } from './AppTypography';

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
}

export const AppSelect = ({ 
    options, 
    value, 
    onSelect, 
    placeholder = 'Select an option', 
    label,
    errorText
}: AppSelectProps) => {
    const [visible, setVisible] = useState(false);
    const theme = useTheme();

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <View style={styles.container}>
            {label && <AppTypography variant="caption" style={styles.label}>{label}</AppTypography>}
            <Menu
                visible={visible}
                onDismiss={closeMenu}
                anchor={
                    <TouchableRipple 
                        onPress={openMenu} 
                        style={[
                            styles.dropdown, 
                            { borderColor: errorText ? theme.colors.error : '#ccc' }
                        ]}
                    >
                        <View style={styles.dropdownContent}>
                            <AppTypography 
                                variant="body" 
                                color={selectedOption ? theme.colors.onSurface : theme.colors.outline}
                            >
                                {selectedOption ? selectedOption.label : placeholder}
                            </AppTypography>
                            <AppTypography variant="body" color={theme.colors.outline}>▼</AppTypography>
                        </View>
                    </TouchableRipple>
                }
            >
                {options.map((option) => (
                    <Menu.Item 
                        key={option.value} 
                        onPress={() => {
                            onSelect(option.value);
                            closeMenu();
                        }} 
                        title={option.label} 
                    />
                ))}
            </Menu>
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
        width: '100%',
    },
    label: {
        marginBottom: 4,
        marginLeft: 4,
    },
    dropdown: {
        borderWidth: 1,
        borderRadius: 4,
        backgroundColor: '#fff',
        height: 56, // matches usual paper text input height
        justifyContent: 'center',
    },
    dropdownContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    errorText: {
        marginTop: 4,
        marginLeft: 4,
    }
});
