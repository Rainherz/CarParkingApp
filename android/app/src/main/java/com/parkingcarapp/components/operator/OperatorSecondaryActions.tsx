import React from "react";
import { TouchableOpacity } from "react-native";
import { ThemedView } from "../common/ThemedView";
import { ThemedText } from "../common/ThemedText";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { operatorStyles as styles } from "../../styles/OperatorScreen.styles";

export default function OperatorSecondaryActions({
  onReport,
  onConfig,
  onTestTicket,
  onTestOCR,
  isTestingOCR,
}: {
  onReport: () => void;
  onConfig: () => void;
  onTestTicket: () => void;
  onTestOCR: () => void;
  isTestingOCR: boolean;
}) {
  return (
    <ThemedView style={styles.secondaryActionsContainer}>
      <TouchableOpacity style={styles.secondaryButton} onPress={onReport}>
        <MaterialIcons name="bar-chart" size={24} color="#666" />
        <ThemedText style={styles.secondaryButtonText}>Reportes</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onConfig}>
        <MaterialIcons name="settings" size={24} color="#666" />
        <ThemedText style={styles.secondaryButtonText}>Configuración</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onTestTicket}>
        <MaterialIcons name="receipt" size={24} color="#666" />
        <ThemedText style={styles.secondaryButtonText}>Ticket</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onTestOCR} disabled={isTestingOCR}>
        <MaterialIcons name="visibility" size={24} color="#666" />
        <ThemedText style={styles.secondaryButtonText}>{isTestingOCR ? "Probando..." : "OCR"}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}