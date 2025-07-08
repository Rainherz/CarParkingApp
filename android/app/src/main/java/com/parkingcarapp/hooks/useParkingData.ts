import { useCallback, useEffect, useState } from 'react';
import { databaseService } from '../services/databaseService';

interface VehicleEntry {
  id?: number;
  plateNumber: string;
  entryTime: string;
  exitTime?: string;
  duration?: number;
  amount?: number;
  status: 'parked' | 'exited';
  confidence?: number;
}

interface DailySummary {
  totalVehicles: number;
  vehiclesParked: number;
  totalEarnings: number;
  averageStay: number;
}

interface ParkingData {
  activeVehicles: VehicleEntry[];
  dailySummary: DailySummary;
  isLoading: boolean;
  error: string | null;
}

export const useParkingData = () => {
  const [data, setData] = useState<ParkingData>({
    activeVehicles: [],
    dailySummary: {
      totalVehicles: 0,
      vehiclesParked: 0,
      totalEarnings: 0,
      averageStay: 0
    },
    isLoading: true,
    error: null
  });

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [activeVehicles, dailySummary] = await Promise.all([
        databaseService.getActiveVehicles(),
        databaseService.getDailySummary()
      ]);

      setData({
        activeVehicles,
        dailySummary,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error cargando datos:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Error cargando datos'
      }));
    }
  }, []);

  // Refrescar datos
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  // Procesar salida de vehículo
  const processVehicleExit = useCallback(async (plateNumber: string) => {
    try {
      const result = await databaseService.processExit(plateNumber);
      if (result) {
        // Refrescar datos después de procesar salida
        await loadData();
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error procesando salida:', error);
      throw error;
    }
  }, [loadData]);

  // Formatear duración para mostrar
  const formatDuration = useCallback((entryTime: string): string => {
    const entry = new Date(entryTime);
    const now = new Date();
    const diff = now.getTime() - entry.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }, []);

  // Formatear tiempo para mostrar
  const formatTime = useCallback((isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Formatear tiempo promedio
  const formatAverageStay = useCallback((minutes: number): string => {
    if (minutes === 0) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}.${Math.round(mins/60*10)}h`;
    } else {
      return `${mins}m`;
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actualizar duraciones cada minuto para vehículos activos
  useEffect(() => {
    if (data.activeVehicles.length === 0) return;

    const interval = setInterval(() => {
      // Solo actualizar si hay vehículos activos
      setData(prev => ({
        ...prev,
        activeVehicles: prev.activeVehicles.map(vehicle => ({
          ...vehicle,
          // La duración se calculará en tiempo real en la UI
        }))
      }));
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [data.activeVehicles.length]);

  return {
    ...data,
    refreshData,
    processVehicleExit,
    formatDuration,
    formatTime,
    formatAverageStay
  };
};