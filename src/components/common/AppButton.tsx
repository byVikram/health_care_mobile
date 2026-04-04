import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

interface AppButtonProps extends React.ComponentProps<typeof PaperButton> {
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    style?: ViewStyle | ViewStyle[];
    labelStyle?: TextStyle | TextStyle[];
}

export const AppButton = ({ variant = 'primary', style, labelStyle, children, ...props }: AppButtonProps) => {
    const theme = useTheme();

    let mode: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal' = 'contained';
    let customBackgroundColor;
    let customTextColor;

    switch (variant) {
        case 'secondary':
            mode = 'contained-tonal';
            customBackgroundColor = theme.colors.secondaryContainer;
            customTextColor = theme.colors.onSecondaryContainer;
            break;
        case 'outline':
            mode = 'outlined';
            break;
        case 'text':
            mode = 'text';
            break;
        case 'primary':
        default:
            mode = 'contained';
            customBackgroundColor = theme.colors.primary;
            customTextColor = theme.colors.onPrimary;
            break;
    }

    return (
        <PaperButton
            mode={mode}
            buttonColor={customBackgroundColor}
            textColor={customTextColor}
            style={[styles.button, style]}
            labelStyle={[styles.label, labelStyle]}
            {...props}
        >
            {children}
        </PaperButton>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: 8,
        paddingVertical: 4,
    },
    label: {
        fontWeight: 'bold',
        fontSize: 16,
    },
});
