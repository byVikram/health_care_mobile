import React from 'react';
import type { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { AppTypography } from '../../../components/common';

type NotificationCardProps = {
    image: FC<SvgProps>;
    title: string;
    description: string;
    showCallIcon?: boolean;
};

const CallIcon = require('../../../assets/notification/icon.svg').default as FC<SvgProps>;

export default function NotificationCard({
    image: NotificationImage,
    title,
    description,
    showCallIcon = true,
}: NotificationCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.contentRow}>
                <View style={styles.imageWrap}>
                    <NotificationImage width={52} height={52} />
                </View>

                <View style={styles.textContent}>
                    <AppTypography variant="h4" style={styles.title} numberOfLines={1}>
                        {title}
                    </AppTypography>
                    <AppTypography
                        variant="caption"
                        style={styles.description}
                        numberOfLines={2}
                    >
                        {description}
                    </AppTypography>
                </View>

                {showCallIcon ? (
                    <Pressable style={styles.callButton}>
                        <CallIcon width={24} height={24} />
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d9e6eb',
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageWrap: {
        marginRight: 12,
    },
    textContent: {
        flex: 1,
        paddingRight: 10,
    },
    title: {
        color: '#2a2f33',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 3,
        fontWeight: '500',
    },
    description: {
        color: '#8b959a',
        fontSize: 11,
        lineHeight: 15,
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#eef7ea',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
