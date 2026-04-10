import React, { useEffect, useRef } from "react";
import {
    Animated,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AppSidebarItem {
    id: string;
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap | React.ReactNode;
    onPress: () => void;
}

interface AppSidebarProps {
    visible: boolean;
    userName?: string;
    profileImageUrl?: string | number;   // string = remote URI, number = require()
    profileCompletion?: number;
    onClose: () => void;
    onLogout: () => void;
    onEditProfile?: () => void;
    menuItems: AppSidebarItem[];
}

const SIDEBAR_WIDTH = 290;

export default function AppSidebar({
    visible,
    userName = "User",
    profileImageUrl,
    profileCompletion,
    onClose,
    onLogout,
    onEditProfile,
    menuItems,
}: AppSidebarProps) {
    const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        Animated.timing(translateX, {
            toValue: visible ? 0 : -SIDEBAR_WIDTH,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const progress =
        typeof profileCompletion === "number"
            ? Math.min(100, Math.max(0, profileCompletion))
            : null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.modalRoot}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <Animated.View
                    style={[
                        styles.sidebar,
                        {
                            paddingTop: insets.top + 8,
                            transform: [{ translateX }],
                        },
                    ]}
                >
                    {/* ── Profile Section ── */}
                    <View style={styles.profileSection}>

                        {/* Avatar */}
                        <View style={styles.avatarWrapper}>
                            {profileImageUrl ? (
                                <Image
                                    source={
                                        typeof profileImageUrl === "number"
                                            ? profileImageUrl            // local require()
                                            : { uri: profileImageUrl }   // remote URL
                                    }
                                    style={styles.avatarImage}
                                />
                            ) : (
                                // Fallback: coloured circle with initial (like image 1)
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitials}>
                                        {userName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Name + link + progress */}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.nameText}>{userName}</Text>

                            <TouchableOpacity
                                onPress={onEditProfile}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.profileLink}>
                                    View and Edit profile
                                </Text>
                            </TouchableOpacity>

                            {progress !== null && (
                                <>
                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                { width: `${progress}%` },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.profileCompletion}>
                                        {progress}% Profile completed
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.separator} />

                    {/* ── Menu Items ── */}
                    <ScrollView
                        style={styles.menuSection}
                        showsVerticalScrollIndicator={false}
                    >
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.menuItem}
                                onPress={() => {
                                    item.onPress();
                                    onClose();
                                }}
                                activeOpacity={0.7}
                            >
                                {typeof item.icon === "string" ? (
                                    <MaterialCommunityIcons
                                        name={
                                            item.icon as keyof typeof MaterialCommunityIcons.glyphMap
                                        }
                                        size={20}
                                        color="#41565c"
                                    />
                                ) : (
                                    item.icon
                                )}
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={18}
                                    color="#9aa4a8"
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* ── Logout ── */}
                    <TouchableOpacity
                        style={styles.logoutItem}
                        onPress={onLogout}
                    >
                        <MaterialCommunityIcons
                            name="logout"
                            size={20}
                            color="#c63e3e"
                        />
                        <Text style={styles.logoutText}>Log out</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        flexDirection: "row",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        backgroundColor: "#ffffff",
        borderTopRightRadius: 18,
        borderBottomRightRadius: 18,
        paddingHorizontal: 14,
        paddingBottom: 20,
    },

    // ── Avatar ──────────────────────────────────────────────────────────
    profileSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
    },
    avatarWrapper: {
        width: 58,
        height: 58,
        borderRadius: 29,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#c8e6e9",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    avatarFallback: {
        width: "100%",
        height: "100%",
        backgroundColor: "#d4eef0",   // matches image 1 teal tint
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1f5f68",
    },

    // ── Name & links ─────────────────────────────────────────────────────
    nameText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#142b30",
    },
    profileLink: {
        fontSize: 12,
        color: "#1f8c9e",
        marginTop: 2,
        textDecorationLine: "underline",
    },
    progressBarBg: {
        marginTop: 6,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#e0ecee",
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 2,
        backgroundColor: "#2f8c58",
    },
    profileCompletion: {
        fontSize: 11,
        color: "#2f8c58",
        marginTop: 3,
    },

    // ── Divider ──────────────────────────────────────────────────────────
    separator: {
        height: 1,
        backgroundColor: "#e9eef0",
    },

    // ── Menu ─────────────────────────────────────────────────────────────
    menuSection: {
        flex: 1,
        paddingTop: 10,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f3f4",
    },
    menuLabel: {
        flex: 1,
        fontSize: 14,
        color: "#24373d",
    },

    // ── Logout ───────────────────────────────────────────────────────────
    logoutItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: "#e9eef0",
    },
    logoutText: {
        color: "#c63e3e",
        fontWeight: "700",
        fontSize: 14,
    },
});