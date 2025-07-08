
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity
} from 'react-native';

import { ticketService } from '../services/ticketService';
import { ThemedView } from './common/ThemedView';
import { ThemedText } from './common/ThemedText';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface VehicleExit {
  plateNumber: string;
  entryTime: string;
  exitTime: string;
  duration: number;
  amount: number;
  parkingRate: number;
}

interface TicketPreviewProps {
  visible: boolean;
  vehicleData: VehicleExit | null;
  onClose: () => void;
  onTicketGenerated?: (success: boolean) => void;
}

interface TicketData {
  ticketNumber: string;
  vehicle: VehicleExit;
  business: any;
  generatedAt: string;
}

export default function TicketPreview({ 
  visible, 
  vehicleData, 
  onClose, 
  onTicketGenerated 
}: TicketPreviewProps) {
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Generar ticket cuando se abre el modal
  useEffect(() => {
    if (visible && vehicleData) {
      generateTicket();
    }
  }, [visible, vehicleData]);

  const generateTicket = async () => {
    if (!vehicleData) return;

    try {
      setIsLoading(true);
      const ticket = await ticketService.generateExitTicket(vehicleData);
      setTicketData(ticket);
      console.log('✅ Ticket generado exitosamente');
    } catch (error) {
      console.error('❌ Error generando ticket:', error);
      Alert.alert('Error', 'No se pudo generar el ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!ticketData) return;

    try {
      setIsPrinting(true);
      await ticketService.printTicket(ticketData);
      
      Alert.alert(
        'Ticket Impreso',
        '✅ El ticket se ha enviado a imprimir exitosamente',
        [{ text: 'OK', onPress: () => onTicketGenerated?.(true) }]
      );
    } catch (error) {
      console.error('❌ Error imprimiendo:', error);
      Alert.alert('Error', 'No se pudo imprimir el ticket');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async (format: 'html' | 'text' = 'html') => {
    if (!ticketData) return;

    try {
      setIsSharing(true);
      const success = await ticketService.shareTicket(ticketData, format);
      
      if (success) {
        Alert.alert(
          'Ticket Compartido',
          `✅ El ticket se ha ${format === 'html' ? 'guardado como HTML' : 'copiado como texto'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error compartiendo:', error);
      Alert.alert('Error', `No se pudo compartir el ticket como ${format}`);
    } finally {
      setIsSharing(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-PE');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Ticket de Salida
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </ThemedView>

        {/* Content */}
        {isLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <ThemedText style={styles.loadingText}>Generando ticket...</ThemedText>
          </ThemedView>
        ) : ticketData ? (
          <>
            {/* Ticket Preview */}
            <ScrollView style={styles.ticketContainer} showsVerticalScrollIndicator={false}>
              <ThemedView style={styles.ticket}>
                {/* Business Header */}
                <ThemedView style={styles.businessHeader}>
                  <ThemedText style={styles.businessName}>
                    {ticketData.business.name}
                  </ThemedText>
                  <ThemedText style={styles.businessInfo}>
                    {ticketData.business.address}
                  </ThemedText>
                  <ThemedText style={styles.businessInfo}>
                    Tel: {ticketData.business.phone}
                  </ThemedText>
                  {ticketData.business.ruc && (
                    <ThemedText style={styles.businessInfo}>
                      RUC: {ticketData.business.ruc}
                    </ThemedText>
                  )}
                </ThemedView>

                {/* Section Divider */}
                <ThemedView style={styles.sectionDivider}>
                  <ThemedText style={styles.sectionTitle}>
                    COMPROBANTE DE ESTACIONAMIENTO
                  </ThemedText>
                </ThemedView>

                {/* Ticket Info */}
                <ThemedView style={styles.ticketInfo}>
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Ticket N°:</ThemedText>
                    <ThemedText style={styles.infoValue}>{ticketData.ticketNumber}</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Fecha:</ThemedText>
                    <ThemedText style={styles.infoValue}>{formatDate(ticketData.generatedAt)}</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Hora:</ThemedText>
                    <ThemedText style={styles.infoValue}>{formatTime(ticketData.generatedAt)}</ThemedText>
                  </ThemedView>
                </ThemedView>

                {/* Vehicle Section */}
                <ThemedView style={styles.vehicleSection}>
                  <ThemedView style={styles.plateContainer}>
                    <ThemedText style={styles.plateNumber}>
                      {ticketData.vehicle.plateNumber}
                    </ThemedText>
                  </ThemedView>
                  
                  <ThemedView style={styles.timeInfo}>
                    <ThemedView style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Entrada:</ThemedText>
                      <ThemedText style={styles.infoValue}>{formatTime(ticketData.vehicle.entryTime)}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Salida:</ThemedText>
                      <ThemedText style={styles.infoValue}>{formatTime(ticketData.vehicle.exitTime)}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Tiempo:</ThemedText>
                      <ThemedText style={[styles.infoValue, styles.durationText]}>
                        {formatDuration(ticketData.vehicle.duration)}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>

                {/* Payment Section */}
                <ThemedView style={styles.paymentSection}>
                  <ThemedView style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Tarifa:</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      S/ {typeof ticketData.vehicle.parkingRate === "number" ? ticketData.vehicle.parkingRate.toFixed(2) : "0.00"}/hora
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                {/* Total Section */}
                <ThemedView style={styles.totalSection}>
                  <ThemedText style={styles.totalLabel}>TOTAL A PAGAR</ThemedText>
                  <ThemedText style={styles.totalAmount}>
                    S/ {ticketData.vehicle.amount.toFixed(2)}
                  </ThemedText>
                </ThemedView>

                {/* Footer */}
                <ThemedView style={styles.footer}>
                  <ThemedText style={styles.footerText}>¡Gracias por su preferencia!</ThemedText>
                  <ThemedText style={styles.footerText}>Conserve este comprobante</ThemedText>
                  {ticketData.business.website && (
                    <ThemedText style={styles.footerText}>{ticketData.business.website}</ThemedText>
                  )}
                </ThemedView>
              </ThemedView>
            </ScrollView>

            {/* Action Buttons */}
            <ThemedView style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.printButton, isPrinting && styles.disabledButton]}
                onPress={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialIcons name="print" size={24} color="#fff" />
                )}
                <ThemedText style={styles.actionButtonText}>
                  {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton, isSharing && styles.disabledButton]}
                onPress={() => handleShare('html')}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialIcons name="share" size={24} color="#fff" />
                )}
                <ThemedText style={styles.actionButtonText}>
                  {isSharing ? 'Compartiendo...' : 'Compartir'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.textButton]}
                onPress={() => handleShare('text')}
                disabled={isSharing}
              >
                <MaterialIcons name="content-copy" size={24} color="#666" />
                <ThemedText style={[styles.actionButtonText, { color: '#666' }]}>
                  Texto
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </>
        ) : (
          <ThemedView style={styles.errorContainer}>
            <MaterialIcons name="error" size={64} color="#f44336" />
            <ThemedText style={styles.errorText}>
              No se pudo cargar la información del ticket
            </ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={generateTicket}>
              <ThemedText style={styles.retryButtonText}>Intentar de nuevo</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  ticketContainer: {
    flex: 1,
    padding: 20,
  },
  ticket: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  businessHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 16,
    marginBottom: 20,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  businessInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    paddingVertical: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  ticketInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  vehicleSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  plateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  plateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    fontFamily: 'monospace',
  },
  timeInfo: {
    gap: 8,
  },
  durationText: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  paymentSection: {
    marginBottom: 20,
  },
  totalSection: {
    borderWidth: 2,
    borderColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderStyle: 'dashed',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  printButton: {
    backgroundColor: '#2E7D32',
  },
  shareButton: {
    backgroundColor: '#FF6B35',
  },
  textButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});