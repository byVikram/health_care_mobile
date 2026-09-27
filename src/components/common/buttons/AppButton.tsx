import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import { APP_COLORS } from '../../../config/theme';

type PaperButtonProps = React.ComponentProps<typeof PaperButton>;

interface AppButtonProps extends PaperButtonProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
    formAction?: boolean;
    /**
     * Opt-in KarolaHealth design sizing. 'lg' = 52 high, radius 12, 16/600 label (footer CTAs);
     * 'md' = 44 high, radius 12, 14/700 label; 'sm' = 40 high, radius 10, 14/20 700 label.
     * Omit to keep the existing Paper sizing.
     */
    size?: 'sm' | 'md' | 'lg';
    /** Icon shown AFTER the label (Paper `icon` + row-reverse). Takes precedence over `icon`. */
    trailingIcon?: PaperButtonProps['icon'];
    /** Corner radius override (applied last, after size/formAction radii). */
    radius?: number;
    /**
     * Design disabled look: APP_COLORS.disabledBtn background + inkMuted label instead of Paper's grey.
     * Only affects the disabled state.
     */
    softDisabled?: boolean;
    /**
     * While `loading`: 'spinner-label' (Paper default, spinner + label) or 'spinner-only' (label hidden).
     * Omit to keep the current behaviour.
     */
    loadingMode?: 'spinner-only' | 'spinner-label';
}

export const AppButton = ({
    variant = 'primary',
    formAction = false,
    size,
    trailingIcon,
    radius,
    softDisabled = false,
    loadingMode,
    style,
    labelStyle,
    contentStyle,
    children,
    disabled,
    icon,
    loading,
    ...props
}: AppButtonProps) => {
    const theme = useTheme();
    const soft = softDisabled && !!disabled;
    const hideLabel = loadingMode === 'spinner-only' && !!loading;

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
            icon={trailingIcon ?? icon}
            loading={loading}
            style={[
                styles.button,
                formAction && styles.formActionButton,
                formAction && disabled && styles.disabledButton,
                size && styles.sizedButton,
                size === 'sm' && styles.smButton,
                size && variant === 'outline' && styles.sizedOutline,
                soft && styles.softDisabledButton,
                soft && variant === 'outline' && styles.softDisabledOutline,
                style,
                radius != null && { borderRadius: radius },
            ]}
            contentStyle={[
                formAction && styles.formActionContent,
                size === 'lg' && styles.lgContent,
                size === 'md' && styles.mdContent,
                size === 'sm' && styles.smContent,
                trailingIcon != null && styles.trailingContent,
                contentStyle,
            ]}
            labelStyle={[
                styles.label,
                formAction && styles.formActionLabel,
                size === 'lg' && styles.lgLabel,
                size === 'md' && styles.mdLabel,
                size === 'sm' && styles.mdLabel,
                labelStyle,
                soft && styles.softDisabledLabel,
                hideLabel && styles.hiddenLabel,
            ]}
            {...props}
        >
            {hideLabel ? '' : children}
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
    smButton: {
        borderRadius: 10,
    },
    smContent: {
        height: 40,
    },
    trailingContent: {
        flexDirection: 'row-reverse',
    },
    softDisabledButton: {
        backgroundColor: APP_COLORS.disabledBtn,
    },
    softDisabledOutline: {
        borderColor: APP_COLORS.disabledBtn,
    },
    softDisabledLabel: {
        color: APP_COLORS.inkMuted,
    },
    hiddenLabel: {
        marginHorizontal: 0,
        width: 0,
    },
});
