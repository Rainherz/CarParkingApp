import React from "react";
import { TouchableOpacity } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { adminSharedStyles as styles } from "../../styles/AdminShared.styles";

type AdminScreenHeaderProps = {
  title: string;
  subtitle: string;
  onBack: () => void;
  rightAction?: () => void;
  rightIcon?: string;
};

export default function AdminScreenHeader({ 
  title, 
  subtitle, 
  onBack, 
  rightAction, 
  rightIcon = "refresh" 
}: AdminScreenHeaderProps) {
  return (
    <ThemedView style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <MaterialIcons name="arrow-back" size={24} color="#2E7D32" />
      </TouchableOpacity>
      <ThemedView style={styles.headerTextContainer}>
        <ThemedText style={styles.headerTitle}>{title}</ThemedText>
        <ThemedText style={styles.headerSubtitle}>{subtitle}</ThemedText>
      </ThemedView>
      {rightAction && (
        <TouchableOpacity onPress={rightAction}>
          <MaterialIcons name={rightIcon} size={24} color="#666" />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}