import React from 'react';
import { StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { Modal as PaperModal, Portal, useTheme, IconButton } from 'react-native-paper';
import { AppTypography } from './AppTypography';

interface AppModalProps {
    visible: boolean;
    onDismiss: () => void;
    title?: string;
    children: React.ReactNode;
    dismissable?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
}

export const AppModal = ({
    visible,
    onDismiss,
    title,
    children,
    dismissable = true,
    contentContainerStyle,
}: AppModalProps) => {
    const theme = useTheme();

    return (
        <Portal>
            <PaperModal 
                visible={visible} 
                onDismiss={onDismiss} 
                dismissable={dismissable}
                contentContainerStyle={[
                    styles.modalContainer,
                    { backgroundColor: theme.colors.background },
                    contentContainerStyle,
                ]}
            >
                {title && (
                    <View style={styles.header}>
                        <AppTypography variant="h3">{title}</AppTypography>
                        {dismissable && (
                            <IconButton 
                                icon="close" 
                                size={24} 
                                onPress={onDismiss} 
                                style={styles.closeButton}
                            />
                        )}
                    </View>
                )}
                <View style={styles.content}>
                    {children}
                </View>
            </PaperModal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        margin: 20,
        borderRadius: 12,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    closeButton: {
        margin: 0,
    },
    content: {
        // Additional content styling if needed
    }
});
