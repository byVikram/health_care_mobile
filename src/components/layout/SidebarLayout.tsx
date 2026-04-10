import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader, AppSidebar } from "../common";
import type { AppSidebarItem } from "../common";
import { useAuth } from "../../context/AuthContext";
import AppointmentsIcon from "../../assets/quick-services/appointments.svg";
import PharmacyIcon from "../../assets/icons/pharmacy.svg";
import LabIcon from "../../assets/icons/lab.svg";
import RadiologyIcon from "../../assets/icons/radiology.svg";
import AncillaryIcon from "../../assets/icons/ancillary.svg";
import TreatmentIcon from "../../assets/icons/treatment.svg";
import RemindersIcon from "../../assets/icons/reminders.svg";
import PaymentsIcon from "../../assets/icons/payments.svg";
import BlogsIcon from "../../assets/icons/blogs.svg";
import HelpCenterIcon from "../../assets/icons/help-center.svg";
import SettingsIcon from "../../assets/icons/settings.svg";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigation = useNavigation<any>();
  const { clearAuth, user } = useAuth();

  const menuItems = useMemo<AppSidebarItem[]>(
    () => [
      {
  id: "appointments",
  label: "My Appointments",
  icon: <AppointmentsIcon width={24} height={24} />,
  onPress: () => navigation.navigate("MainTabs", { screen: "Portal" }),
},
     {
      id: "pharmacy",
      label: "Pharmacy",
      icon: <PharmacyIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
    {
      id: "lab",
      label: "Lab",
      icon: <LabIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
    {
      id: "radiology",
      label: "Radiology",
      icon: <RadiologyIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
    {
      id: "ancillary",
      label: "Ancillary",
      icon: <AncillaryIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
    {
      id: "treatment-history",
      label: "Treatment History",
      icon: <TreatmentIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
    {
      id: "reminders",
      label: "Reminders",
      icon: <RemindersIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
    {
      id: "payments",
      label: "Payments",
      icon: <PaymentsIcon width={20} height={20} />,
      onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
    },
      {
        id: "blogs",
        label: "Blogs",
        icon: "newspaper-variant-outline",
        onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
      },
      
{
  id: "help",
  label: "Help Center",
  icon: <HelpCenterIcon width={20} height={20} />,
  onPress: () => navigation.navigate("MainTabs", { screen: "Profile" }),
},
{
  id: "settings",
  label: "Settings",
  icon: <SettingsIcon width={20} height={20} />,
  onPress: () => navigation.navigate("MainTabs", { screen: "Profile" }),
},
    //   {
    //     id: "settings",
    //     label: "Settings",
    //     icon: "cog-outline",
    //     onPress: () => navigation.navigate("MainTabs", { screen: "Profile" }),
    //   },
    ],
    [navigation],
  );

  return (
    <View style={styles.container}>
      <AppSidebar
        visible={isSidebarOpen}
        userName={user?.name || "Nitin"}
        profileCompletion={user?.profileCompletion}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={clearAuth}
        menuItems={menuItems}
      />

      <AppHeader
        userName={user?.name || "Nitin"}
        location="KR Market"
        avatarUri={user?.avatar}
        onAvatarPress={() => setIsSidebarOpen(true)}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});