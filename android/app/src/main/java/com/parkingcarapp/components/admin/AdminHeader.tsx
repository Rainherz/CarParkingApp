import React from "react";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { adminStyles as styles } from "../../styles/AdminScreen.styles";

type AdminHeaderProps = {
  onRefresh: () => void;
  userName: string;
};

export default function AdminHeader({ onRefresh, userName }: AdminHeaderProps) {
  return (
    <ThemedView style={styles.header}>
      <MaterialIcons name="admin-panel-settings" size={40} color="#2E7D32" style={styles.headerIcon} />
      <ThemedView style={styles.headerTextContainer}>
        <ThemedText style={styles.headerTitle}>Panel de Administración</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Bienvenido, {userName}</ThemedText>
      </ThemedView>
      <MaterialIcons name="refresh" size={24} color="#666" onPress={onRefresh} />
    </ThemedView>
  );
}