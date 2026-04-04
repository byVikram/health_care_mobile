import React from 'react';
import { TextStyle, StyleSheet } from 'react-native';
import { Text as PaperText, useTheme } from 'react-native-paper';

export type AppTypographyProps = Omit<React.ComponentProps<typeof PaperText>, 'variant'> & {
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'subtitle' | 'caption';
    style?: TextStyle | TextStyle[];
    color?: string;
    align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
};

export const AppTypography = ({ 
    variant = 'body', 
    style, 
    color, 
    align = 'left', 
    children, 
    ...props 
}: AppTypographyProps) => {
    const theme = useTheme();

    const getVariantStyle = () => {
        switch (variant) {
            case 'h1': return styles.h1;
            case 'h2': return styles.h2;
            case 'h3': return styles.h3;
            case 'h4': return styles.h4;
            case 'subtitle': return styles.subtitle;
            case 'caption': return styles.caption;
            case 'body':
            default:
                return styles.body;
        }
    };

    return (
        <PaperText 
            style={[
                getVariantStyle(),
                { color: color || theme.colors.onSurface, textAlign: align },
                style
            ]} 
            {...props}
        >
            {children}
        </PaperText>
    );
};

const styles = StyleSheet.create({
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 40,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 32,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
    },
    h4: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 24,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
    },
    caption: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
});
