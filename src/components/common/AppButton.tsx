import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import { APP_COLORS } from '../../config/theme';

type PaperButtonProps = React.ComponentProps<typeof PaperButton>;

interface AppButtonProps extends PaperButtonProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
    formAction?: boolean;
    /**
     * Opt-in KarolaHealth design sizing. 'lg' = 52 high, radius 12, 16/600 label (footer CTAs);
     * 'md' = 44 high, radius 12, 14/700 label. Omit to keep the existing Paper sizing.
     */
    size?: 'md' | 'lg';
}

export const AppButton = ({
    variant = 'primary',
    formAction = false,
    size,
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
        case 'danger':
            mode = 'contained';
            customBackgroundColor = APP_COLORS.danger;
            customTextColor = '#FFFFFF';
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
            style={[
                styles.button,
                formAction && styles.formActionButton,
                formAction && disabled && styles.disabledButton,
                size && styles.sizedButton,
                size && variant === 'outline' && styles.sizedOutline,
                style,
            ]}
            contentStyle={[
                formAction && styles.formActionContent,
                size === 'lg' && styles.lgContent,
                size === 'md' && styles.mdContent,
                contentStyle,
            ]}
            labelStyle={[
                styles.label,
                formAction && styles.formActionLabel,
                size === 'lg' && styles.lgLabel,
                size === 'md' && styles.mdLabel,
                labelStyle,
            ]}
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
    sizedButton: {
        borderRadius: 12,
        paddingVertical: 0,
    },
    sizedOutline: {
        borderWidth: 1.5,
        borderColor: APP_COLORS.primary,
    },
    lgContent: {
        height: 52,
    },
    mdContent: {
        height: 44,
    },
    lgLabel: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '600',
        marginVertical: 0,
    },
    mdLabel: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '700',
        marginVertical: 0,
    },
});
