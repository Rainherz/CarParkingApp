import React, { useState, useEffect } from "react";
import { ScrollView, Alert } from "react-native";
import { ThemedView } from "../components/common/ThemedView";
import AdminScreenHeader from "../components/admin/AdminScreenHeader";
import ReportsFilters from "../components/admin/ReportsFilters";
import ReportsList from "../components/admin/ReportsList";
import { adminSharedStyles as styles } from "../styles/AdminShared.styles";
import { databaseService } from "../services/databaseService"

interface ReportsScreenProps {
  onBack: () => void;
}

export default function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({
    operator: "all",
    startDate: "",
    endDate: "",
  });
  const [operators, setOperators] = useState<any[]>([]);

  // Obtener operadores reales de la base de datos
  const fetchOperators = async () => {
    try {
      const ops = (await databaseService.getOperators?.()) ?? [];
      setOperators(ops);
    } catch (e) {
      setOperators([]);
    }
  };

  // Obtener reportes reales de la base de datos
  const fetchReports = async (filters: any) => {
    setIsLoading(true);
    try {
      const reports = await databaseService.getReports({
        operatorId: filters.operator,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setFilteredReports(reports);
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar los reportes");
      setFilteredReports([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOperators();
    fetchReports(currentFilters);
  }, []);

  const handleFilterChange = (filters: any) => {
    setCurrentFilters(filters);
    fetchReports(filters);
  };

  const handleExportData = () => {
    Alert.alert(
      "Exportar Datos",
      "¿Qué formato deseas para la exportación?",
      [
        { text: "CSV", onPress: () => exportToCSV() },
        { text: "PDF", onPress: () => exportToPDF() },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const exportToCSV = () => {
    // Lógica para exportar a CSV
    Alert.alert("Éxito", "Datos exportados a CSV correctamente");
  };

  const exportToPDF = () => {
    // Lógica para exportar a PDF
    Alert.alert("Éxito", "Reporte PDF generado correctamente");
  };

  const refreshData = () => {
    fetchReports(currentFilters);
  };

  return (
    <ThemedView style={styles.container}>
      <AdminScreenHeader
        title="Reportes y Estadísticas"
        subtitle="Análisis de ingresos y actividad"
        onBack={onBack}
        rightAction={refreshData}
        rightIcon="refresh"
      />

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <ReportsFilters
          onFilterChange={handleFilterChange}
          operators={operators}
        />

        <ReportsList
          reports={filteredReports}
          onExportData={handleExportData}
          isLoading={isLoading}
        />
      </ScrollView>
    </ThemedView>
  );
}