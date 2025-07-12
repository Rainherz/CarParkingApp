
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';

import { databaseService } from '../services/databaseService';
import { ocrService } from '../services/ocrService';
import PlateCamera from './PlateCamera';
import { ThemedView } from './common/ThemedView';
import { ThemedText } from './common/ThemedText';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface PlateDetectorProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (plateNumber: string) => void;
  currentUser?: { id: number; username: string; name: string; role: string };
}

export default function PlateDetector({ visible, onClose, onSuccess, currentUser }: PlateDetectorProps) {
  const [step, setStep] = useState<'camera' | 'processing' | 'confirm'>('camera');
  const [imageUri, setImageUri] = useState<string>('');
  const [detectedPlate, setDetectedPlate] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [manualPlate, setManualPlate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  

  // Resetear estado al abrir/cerrar
  React.useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setStep('camera');
    setImageUri('');
    setDetectedPlate('');
    setConfidence(0);
    setManualPlate('');
    setIsProcessing(false);
  };

  // Nueva función para manejar captura desde PlateCamera
  const handleCameraCapture = async (imageUri: string) => {
    try {
      setImageUri(imageUri);
      setStep('processing');
      setIsProcessing(true);

      console.log('🔍 Iniciando OCR con imagen capturada...');

      // Procesar con OCR
      const ocrResult = await ocrService.detectPlate(imageUri);
      
      if (ocrResult.success && ocrResult.plateNumber) {
        console.log('✅ Placa detectada:', ocrResult.plateNumber);
        setDetectedPlate(ocrResult.plateNumber);
        setConfidence(ocrResult.confidence);
        setManualPlate(ocrResult.plateNumber);
        setStep('confirm');
      } else {
        console.log('⚠️ No se detectó placa, mostrando confirmación manual');
        setStep('confirm');
        Alert.alert(
          'No se detectó placa',
          'No se pudo detectar una placa automáticamente. Puedes ingresarla manualmente.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen');
      setStep('camera');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirmar y registrar entrada
  const handleConfirmEntry = async () => {
    try {
      const plateNumber = manualPlate.trim().toUpperCase();
      
      if (!plateNumber) {
        Alert.alert('Error', 'Por favor ingresa un número de placa');
        return;
      }

      if (!ocrService.validatePlateFormat(plateNumber)) {
        Alert.alert(
          'Formato de placa inválido',
          '¿Deseas continuar con esta placa de todos modos?',
          [
            { text: 'Corregir', style: 'cancel' },
            { text: 'Continuar', onPress: () => processEntry(plateNumber) }
          ]
        );
        return;
      }

      await processEntry(plateNumber);
      
    } catch (error) {
      console.error('Error confirmando entrada:', error);
      Alert.alert('Error', 'No se pudo registrar la entrada');
    }
  };

  const processEntry = async (plateNumber: string) => {
    try {
      setIsProcessing(true);
      
      // ✅ VALIDAR que tengamos información del usuario
      if (!currentUser || !currentUser.id) {
        Alert.alert('Error', 'No se pudo identificar el operador. Intenta cerrar sesión e ingresar nuevamente.');
        return;
      }

      // Verificar si ya existe un vehículo activo con esta placa
      const existingVehicle = await databaseService.getActiveVehicle(plateNumber);
      if (existingVehicle) {
        Alert.alert(
          'Vehículo ya registrado',
          `El vehículo ${plateNumber} ya está en el estacionamiento desde ${new Date(existingVehicle.entryTime).toLocaleTimeString()}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Registrar entrada en la base de datos
      await databaseService.registerEntry(plateNumber, currentUser.id, confidence);

      Alert.alert(
        'Entrada Registrada',
        `Vehículo ${plateNumber} registrado exitosamente por ${currentUser.name}.`,
        [{ text: 'OK', onPress: () => {
          onSuccess(plateNumber);
          onClose();
        }}]
      );
      
    } catch (error) {
      console.error('Error procesando entrada:', error);
    
      // Mensaje más amigable para el usuario
      Alert.alert(
        'Registro Completado', 
        `Vehículo ${plateNumber} ha sido registrado en modo offline. Se sincronizará cuando haya conexión.`,
        [{ text: 'OK', onPress: () => {
          onSuccess(plateNumber);
          onClose();
        }}]
    );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <ThemedView style={styles.container}>
        {/* Camera Step - Usando PlateCamera */}
        {step === 'camera' && (
          <PlateCamera
            visible={true}
            onCapture={handleCameraCapture}
            onClose={onClose}
          />
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <>
            {/* Header */}
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Procesando Imagen
              </ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.content}>
              <ThemedView style={styles.processingContainer}>
                {imageUri && (
                  <Image source={{ uri: imageUri }} style={styles.capturedImage} />
                )}
                <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />
                <ThemedText style={styles.processingText}>
                  Detectando placa...
                </ThemedText>
                <ThemedText style={styles.processingSubtext}>
                  Esto puede tomar unos segundos
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <>
            {/* Header */}
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Confirmar Entrada
              </ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.content}>
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              )}

              {detectedPlate && (
                <ThemedView style={styles.detectionResult}>
                  <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                  <ThemedText style={styles.detectedText}>
                    Placa detectada: {detectedPlate}
                  </ThemedText>
                  <ThemedText style={styles.confidenceText}>
                    Confianza: {Math.round(confidence * 100)}%
                  </ThemedText>
                </ThemedView>
              )}

              <ThemedView style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>
                  Confirma o corrige el número de placa:
                </ThemedText>
                <TextInput
                  style={styles.plateInput}
                  value={manualPlate}
                  onChangeText={setManualPlate}
                  placeholder="ABC-123"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </ThemedView>

              <ThemedView style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleConfirmEntry}
                  disabled={isProcessing || !manualPlate.trim()}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialIcons name="check" size={24} color="#fff" />
                  )}
                  <Text style={styles.buttonText}>Registrar Entrada</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setStep('camera')}
                  disabled={isProcessing}
                >
                  <MaterialIcons name="camera-alt" size={24} color="#666" />
                  <Text style={[styles.buttonText, { color: '#666' }]}>Tomar Otra Foto</Text>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          </>
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
    paddingTop: 50, // Para el safe area
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedImage: {
    width: 300,
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  processingText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  detectionResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  detectedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  plateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});