// src/components/PlateCamera.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CameraPermissionRequestResult } from 'react-native-vision-camera';


interface PlateCameraProps {
  visible: boolean;
  onCapture: (imageUri: string) => void;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Dimensiones del marco guía para placas peruanas
const GUIDE_WIDTH = screenWidth * 0.8;
const GUIDE_HEIGHT = GUIDE_WIDTH * 0.45; // Proporción 2.2:1 típica

export default function PlateCamera({ visible, onCapture, onClose }: PlateCameraProps) {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back'); // API actualizada
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  // Solicitar permisos de cámara
  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted'); // API corregida

      if (permission !== 'granted') {
        Alert.alert(
          'Permisos de Cámara',
          'Esta aplicación necesita acceso a la cámara para detectar placas vehiculares.',
          [
            { text: 'Configuración', onPress: () => Camera.requestCameraPermission() },
            { text: 'Cancelar', onPress: onClose }
          ]
        );
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      setHasPermission(false);
    }
  };

  // Capturar foto con crop automático del área del marco
  const handleCapture = async () => {
    if (!camera.current || isCapturing) return;

    try {
      setIsCapturing(true);
      console.log('📸 Capturando imagen con marco guía...');

      const photo = await camera.current.takePhoto({
        flash: flashMode,
        enableAutoRedEyeReduction: true,
        // enableAutoStabilization: true,
      });

      console.log('✅ Imagen capturada:', photo.path);

      // Procesar imagen para extraer solo el área del marco
      const processedImageUri = await processImageCrop(photo.path);
      
      onCapture(processedImageUri);

    } catch (error) {
      console.error('❌ Error capturando imagen:', error);
      Alert.alert('Error', 'No se pudo capturar la imagen. Intenta de nuevo.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Procesar imagen para extraer solo el área del marco guía
  const processImageCrop = async (imagePath: string): Promise<string> => {
    try {
      // En una implementación real, aquí usarías react-native-image-manipulator
      // para hacer crop del área específica del marco
      
      // Por ahora retornamos la imagen completa
      // TODO: Implementar crop basado en las coordenadas del marco
      return `file://${imagePath}`;
      
    } catch (error) {
      console.warn('⚠️ Error procesando imagen, usando original');
      return `file://${imagePath}`;
    }
  };

  // Manejar enfoque táctil
  const handleFocus = async (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });

    // Enfocar en el punto tocado (API actualizada)
    if (camera.current) {
      try {
        await camera.current.focus({
          x: locationX / screenWidth,
          y: locationY / screenHeight,
        });
      } catch (error) {
        console.log('Enfoque automático no soportado');
      }
    }

    // Ocultar indicador de enfoque después de 2 segundos
    setTimeout(() => {
      setFocusPoint(null);
    }, 2000);
  };

  // Alternar modo flash
  const toggleFlash = () => {
  setFlashMode(current => {
    switch (current) {
      case 'off': return 'on';
      case 'on': return 'auto';
      case 'auto': return 'off';
      default: return 'off';
    }
  });
};

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return 'flash-on';
      case 'off': return 'flash-off';
      default: return 'flash-auto';
    }
  };

  if (!visible) return null;

  // Estado de carga de permisos
  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E676" />
        <Text style={styles.loadingText}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  // Sin permisos
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color="#f44336" />
        <Text style={styles.permissionText}>Sin acceso a la cámara</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Solicitar Permisos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Sin dispositivo de cámara
  if (!device) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={64} color="#f44336" />
        <Text style={styles.errorText}>No se encontró cámara trasera</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CÁMARA EN VIVO CON MARCO SUPERPUESTO EN TIEMPO REAL */}
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={visible}
        photo={true}
        onTouchEnd={handleFocus}
        // flashMode={flashMode}
      />

      {/* OVERLAY OSCURO CON ÁREA TRANSPARENTE PARA LA PLACA */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Área superior oscura */}
        <View style={[styles.overlaySection, styles.topOverlay]} />
        
        {/* Fila central con marco guía */}
        <View style={styles.middleRow}>
          <View style={[styles.overlaySection, styles.sideOverlay]} />
          
          {/* MARCO GUÍA - ÁREA TRANSPARENTE DONDE SE VE LA PLACA */}
          <View style={styles.guideFrame}>
            {/* Esquinas del marco verde */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {/* Líneas guía horizontales */}
            <View style={styles.guideLine} />
            <View style={[styles.guideLine, styles.guideLineBottom]} />
            
            {/* Indicador de área de placa */}
            <View style={styles.plateIndicator}>
              <Text style={styles.plateText}>PLACA AQUÍ</Text>
            </View>
          </View>
          
          <View style={[styles.overlaySection, styles.sideOverlay]} />
        </View>
        
        {/* Área inferior oscura */}
        <View style={[styles.overlaySection, styles.bottomOverlay]} />
      </View>

      {/* Instrucciones superiores */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Alinea la placa dentro del marco verde
        </Text>
        <Text style={styles.instructionsSubtext}>
          La placa se ve en tiempo real - manténla centrada y enfocada
        </Text>
      </View>

      {/* Indicador de enfoque táctil */}
      {focusPoint && (
        <View
          style={[
            styles.focusPoint,
            {
              left: focusPoint.x - 50,
              top: focusPoint.y - 50,
            },
          ]}
        >
          <View style={styles.focusInner} />
        </View>
      )}

      {/* Controles superiores */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.controlButton} onPress={onClose}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.centerControls}>
          <Text style={styles.titleText}>Detectar Placa</Text>
        </View>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
          <Icon name={getFlashIcon()} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Controles inferiores */}
      <View style={styles.bottomControls}>
        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled,
            ]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
          
          <Text style={styles.captureText}>
            {isCapturing ? 'Capturando área delimitada...' : 'Toca para capturar'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Más oscuro para mejor contraste
  },
  topOverlay: {
    height: (screenHeight - GUIDE_HEIGHT) / 2 - 120,
  },
  bottomOverlay: {
    flex: 1,
  },
  middleRow: {
    flexDirection: 'row',
    height: GUIDE_HEIGHT,
  },
  sideOverlay: {
    width: (screenWidth - GUIDE_WIDTH) / 2,
  },
  guideFrame: {
    width: GUIDE_WIDTH,
    height: GUIDE_HEIGHT,
    position: 'relative',
    // CRÍTICO: Sin backgroundColor - esta área permanece transparente
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00E676', // Verde neón vibrante
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  guideLine: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: 'rgba(0, 230, 118, 0.9)',
    top: '35%',
  },
  guideLineBottom: {
    top: '65%',
  },
  plateIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -35 }, { translateY: -8 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  instructionsSubtext: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  focusPoint: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#00E676',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusInner: {
    width: 6,
    height: 6,
    backgroundColor: '#00E676',
    borderRadius: 3,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 12,
  },
  captureButtonDisabled: {
    backgroundColor: 'rgba(0, 230, 118, 0.5)',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  captureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  // Estados de carga y error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#00E676',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    color: '#f44336',
  },
});