import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { launchImageLibrary, ImagePickerResponse, MediaType, ImageLibraryOptions } from 'react-native-image-picker';
import { Alert, Platform } from 'react-native';

interface CameraResult {
  uri: string;
  width?: number;
  height?: number;
  path?: string;
}

class CameraService {
  private isWeb: boolean;

  constructor() {
    this.isWeb = Platform.OS === 'web';
  }

  // Verificar y solicitar permisos de cámara
  async requestCameraPermissions(): Promise<boolean> {
    try {
      if (this.isWeb) {
        // En web, los permisos se manejan automáticamente
        return true;
      }

      const permission = await Camera.requestCameraPermission();
      
      if (permission !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Esta aplicación necesita acceso a la cámara para detectar placas de vehículos.',
          [
            { text: 'Configuración', onPress: () => Camera.requestCameraPermission() },
            { text: 'OK' }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error solicitando permisos de cámara:', error);
      return false;
    }
  }

  // Tomar foto usando react-native-vision-camera
  async takePicture(): Promise<CameraResult | null> {
    try {
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission && !this.isWeb) {
        return null;
      }

      if (this.isWeb) {
        // En web, simular toma de foto
        Alert.alert(
          'Modo Web',
          'En el navegador web no se puede usar la cámara. Se simulará la detección de placa.',
          [{ text: 'OK' }]
        );
        
        // Retornar una imagen simulada
        return {
          uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          width: 800,
          height: 600
        };
      }

      // Nota: En react-native-vision-camera, la toma de foto se maneja directamente 
      // en el componente Camera, no en el servicio. Este método ahora funciona 
      // como backup para casos donde necesites tomar foto programáticamente.
      
      Alert.alert(
        'Información',
        'La captura de foto se maneja directamente en el componente PlateCamera para mejor rendimiento.',
        [{ text: 'OK' }]
      );
      
      return null;

    } catch (error) {
      console.error('Error en takePicture:', error);
      Alert.alert('Error', 'No se pudo acceder a la cámara. Intenta de nuevo.');
      return null;
    }
  }

  // Seleccionar imagen de la galería
  async pickImageFromGallery(): Promise<CameraResult | null> {
    try {
      if (this.isWeb) {
        // En web, simular selección de galería
        Alert.alert(
          'Modo Web',
          'En el navegador web se simulará la selección de imagen.',
          [{ text: 'OK' }]
        );
        
        return {
          uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          width: 800,
          height: 600
        };
      }

      return new Promise((resolve) => {
        const options: ImageLibraryOptions = {
          mediaType: 'photo',
          includeBase64: true,
          maxHeight: 1024,
          maxWidth: 1024,
          // quality: 0.85, // Use a number between 0 and 1
        };

        launchImageLibrary(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('Usuario canceló la selección');
            resolve(null);
            return;
          }

          if (response.errorMessage) {
            console.error('Error en ImagePicker:', response.errorMessage);
            Alert.alert('Error', 'No se pudo acceder a la galería');
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            resolve({
              uri: asset.uri || '',
              width: asset.width || 0,
              height: asset.height || 0,
            });
          } else {
            resolve(null);
          }
        });
      });

    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo acceder a la galería');
      return null;
    }
  }

  // Verificar disponibilidad de cámara trasera
  async checkCameraAvailability(): Promise<boolean> {
    try {
      if (this.isWeb) {
        return false;
      }

      // En react-native-vision-camera, esto se hace con hooks en el componente
      // Este método es para verificaciones adicionales si es necesario
      const permission = await Camera.getCameraPermissionStatus();
      return permission === 'granted';
      
    } catch (error) {
      console.error('Error verificando disponibilidad de cámara:', error);
      return false;
    }
  }

  // Procesar imagen capturada (para uso futuro con crop)
  async processImage(imagePath: string, cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<CameraResult | null> {
    try {
      // TODO: Implementar crop usando react-native-image-manipulator
      // Por ahora retorna la imagen original
      
      return {
        uri: `file://${imagePath}`,
        path: imagePath
      };
      
    } catch (error) {
      console.error('Error procesando imagen:', error);
      return null;
    }
  }

  // Obtener información de la cámara
  getCameraInfo(): { supportsCamera: boolean; platform: string } {
    return {
      supportsCamera: !this.isWeb,
      platform: Platform.OS
    };
  }

  // Limpiar recursos (si es necesario)
  cleanup(): void {
    // Limpiar cualquier recurso si es necesario
    console.log('🧹 Camera service cleanup');
  }
}

export const cameraService = new CameraService();