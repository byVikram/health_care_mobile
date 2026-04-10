import { StyleSheet } from 'react-native';

export const doctorCardStyles = StyleSheet.create({
    card: {
        flex: 1,
        marginHorizontal: 8,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e8edf0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },

    imageContainer: {
        height: 120,
        backgroundColor: '#f0f4f8',
        position: 'relative',
    },

    image: {
        width: '100%',
        height: '100%',
    },

    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#00a82d',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },

    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 9,
    },

    content: {
        padding: 10,
    },

    name: {
        color: '#082b45',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },

    speciality: {
        color: '#5b7282',
        marginBottom: 6,
    },

    slotText: {
        color: '#5b7282',
        marginBottom: 8,
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    infoRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    infoText: {
        color: '#5b7282',
        marginLeft: 4,
        fontSize: 10,
    },

    infoTextBold: {
        color: '#082b45',
        fontWeight: 'bold',
        fontSize: 11,
    },

    infoTextBoldTeal: {
        color: '#287474',
        fontWeight: 'bold',
        fontSize: 11,
    },

    bookButton: {
        marginTop: 4,
        backgroundColor: '#2b7571',
        borderRadius: 8,
        paddingVertical: 2,
    },
});