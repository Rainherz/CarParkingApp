import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { adminStyles as styles } from "../styles/AdminScreen.styles";
import AdminHeader from "../components/admin/AdminHeader";
import OperatorClock from "../components/operator/OperatorClock";
import AdminQuickActions from "../components/admin/AdminQuickActions";
import AdminStats from "../components/admin/AdminStats";
import AdminActiveVehicles from "../components/admin/AdminActiveVehicles";
import AdminLogoutButton from "../components/admin/AdminLogoutButton";
import { useParkingData } from "../hooks/useParkingData";

interface AdminScreenProps {
  onLogout: () => void;
  user: { username: string; name: string; role: string };
  onNavigateToReports: () => void;
  onNavigateToOperators: () => void;
  onNavigateToSettings: () => void;
}

export default function AdminScreen({ 
  onLogout, 
  user, 
  onNavigateToReports,
  onNavigateToOperators,
  onNavigateToSettings
}: AdminScreenProps) {

   // ⬇️ AGREGAR ESTOS LOGS TEMPORALMENTE
  console.log('=== ADMIN SCREEN PROPS ===');
  console.log('onLogout:', typeof onLogout, onLogout);
  console.log('user:', user);
  console.log('onNavigateToReports:', typeof onNavigateToReports, onNavigateToReports);
  console.log('onNavigateToOperators:', typeof onNavigateToOperators, onNavigateToOperators);
  console.log('onNavigateToSettings:', typeof onNavigateToSettings, onNavigateToSettings);
  console.log('==========================');
  
  // Hook personalizado para datos del estacionamiento
  const {
    activeVehicles,
    dailySummary,
    isLoading,
    error,
    refreshData,
  } = useParkingData();

  // Handlers para acciones principales
  const handleViewReports = () => {
    onNavigateToReports();
  };

  const handleManageOperators = () => {
    onNavigateToOperators();
  };

  const handleSystemSettings = () => {
    onNavigateToSettings();
  };

  const handleViewVehicleDetails = (vehicle: any) => {
    // Lógica para mostrar detalles del vehículo
    console.log("Ver detalles del vehículo:", vehicle);
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <AdminHeader onRefresh={refreshData} userName={user.name} />
        
        <OperatorClock />
        
        <AdminQuickActions
          onReports={handleViewReports}
          onOperators={handleManageOperators}
          onSettings={handleSystemSettings}
        />
        
        <AdminStats dailySummary={dailySummary} />
        
        <AdminActiveVehicles
          vehicles={activeVehicles}
          onViewDetails={handleViewVehicleDetails}
        />
      </ScrollView>

      <AdminLogoutButton onLogout={onLogout} />
    </>
  );
}