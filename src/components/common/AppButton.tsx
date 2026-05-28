import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

type PaperButtonProps = React.ComponentProps<typeof PaperButton>;

interface AppButtonProps extends PaperButtonProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    formAction?: boolean;
}

export const AppButton = ({
    variant = 'primary',
    formAction = false,
    style,
    labelStyle,
    contentStyle,
    children,
    disabled,
    ...props
}: AppButtonProps) => {
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
            disabled={disabled}
            style={[styles.button, formAction && styles.formActionButton, formAction && disabled && styles.disabledButton, style]}
            contentStyle={[formAction && styles.formActionContent, contentStyle]}
            labelStyle={[styles.label, formAction && styles.formActionLabel, labelStyle]}
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
    formActionButton: {
        alignSelf: 'flex-start',
        minWidth: 160,
        borderRadius: 10,
        marginTop: 24,
    },
    formActionContent: {
        minHeight: 46,
        paddingHorizontal: 20,
    },
    label: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    formActionLabel: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.7,
    },
});
