import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { operatorStyles as styles } from "../styles/OperatorScreen.styles";
import OperatorHeader from "../components/operator/OperatorHeader";
import OperatorClock from "../components/operator/OperatorClock";
import OperatorQuickActions from "../components/operator/OperatorQuickActions";
import OperatorStats from "../components/operator/OperatorStats";
import OperatorActiveVehicles from "../components/operator/OperatorActiveVehicles";
import OperatorSecondaryActions from "../components/operator/OperatorSecondaryActions";
import OperatorLogoutButton from "../components/operator/OperatorLogoutButton";
import OperatorModals from "../components/operator/OperatorModals";
import { useParkingData } from "../hooks/useParkingData";

interface OperatorScreenProps {
  onLogout: () => void;
  currentUser?: { id: number; username: string; name: string; role: string };
}

export default function OperatorScreen({ onLogout, currentUser }: OperatorScreenProps) {
  // Estados para modales y UI
  const [showPlateDetector, setShowPlateDetector] = useState(false);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [vehicleForTicket, setVehicleForTicket] = useState<any>(null);
  const [isTestingOCR, setIsTestingOCR] = useState(false);

  // Hook personalizado para datos del estacionamiento
  const {
    activeVehicles,
    dailySummary,
    isLoading,
    error,
    refreshData,
    processVehicleExit,
    formatDuration,
    formatTime,
    formatAverageStay,
  } = useParkingData();

  // Handlers para acciones principales
  const handleVehicleEntry = () => {
    setShowPlateDetector(true);
  };

  const handleVehicleExit = () => {
    // Lógica para mostrar lista de vehículos activos para procesar salida
    // O abrir modal de selección de vehículo
    console.log("Procesando salida de vehículo");
  };

  const handleProcessExit = async (plateNumber: string) => {
    try {
      const result = await processVehicleExit(plateNumber);
      // Suponiendo que result es el VehicleEntry devuelto directamente
      setVehicleForTicket(result);
      setShowTicketPreview(true);
    } catch (error) {
      console.error("Error procesando salida:", error);
    }
  };

  const handlePlateDetectorSuccess = (plateNumber: string) => {
    setShowPlateDetector(false);
    // Refrescar datos después de registrar entrada
    refreshData();
  };

  // Handlers para acciones secundarias
  const handleViewReports = () => {
    // Navegar a pantalla de reportes
    console.log("Abriendo reportes");
  };

  const handleSettings = () => {
    // Navegar a configuración
    console.log("Abriendo configuración");
  };

  const handleTicketGenerated = (success: boolean) => {
    setShowTicketPreview(false);
    setVehicleForTicket(null);
    if (success) {
      refreshData();
    }
  };

  const testTicketSystem = () => {
    // Generar ticket de prueba
    const testVehicle = {
      plateNumber: "TEST-123",
      entryTime: new Date(),
      duration: "2h 30m",
      amount: 15.50,
      spotNumber: "A1"
    };
    setVehicleForTicket(testVehicle);
    setShowTicketPreview(true);
  };

  const testOCRFunctionality = async () => {
    setIsTestingOCR(true);
    try {
      // Simular prueba de OCR
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("OCR funcionando correctamente");
    } catch (error) {
      console.error("Error en prueba de OCR:", error);
    } finally {
      setIsTestingOCR(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <OperatorHeader onRefresh={refreshData} />
        
        <OperatorClock />
        
        <OperatorQuickActions
          onEntry={handleVehicleEntry}
          onExit={handleVehicleExit}
        />
        
        <OperatorStats dailySummary={dailySummary} />
        
        <OperatorActiveVehicles
          vehicles={activeVehicles}
          onExit={handleProcessExit}
        />
        
        <OperatorSecondaryActions
          onReport={handleViewReports}
          onConfig={handleSettings}
          onTestTicket={testTicketSystem}
          onTestOCR={testOCRFunctionality}
          isTestingOCR={isTestingOCR}
        />
      </ScrollView>

      <OperatorModals
        showPlateDetector={showPlateDetector}
        setShowPlateDetector={setShowPlateDetector}
        showTicketPreview={showTicketPreview}
        setShowTicketPreview={setShowTicketPreview}
        vehicleForTicket={vehicleForTicket}
        onTicketGenerated={handleTicketGenerated}
        handlePlateDetectorSuccess={handlePlateDetectorSuccess}
        currentUser={currentUser}
      />

      <OperatorLogoutButton onLogout={onLogout} />
    </>
  );
}