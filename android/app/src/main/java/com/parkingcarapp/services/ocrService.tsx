import { Platform } from 'react-native';
import ImageManipulator from 'react-native-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';

interface OCRResult {
  plateNumber: string;
  confidence: number;
  success: boolean;
  error?: string;
  allText?: string;
  processingTime?: number;
}

interface TextBlock {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class OCRService {
  private platePatterns = [
    /([A-Z]{3}[-\s]?\d{3})/g,     // ABC-123 o ABC 123
    /([A-Z]\d{2}[-\s]?\d{3})/g,   // A12-345 o A12 345  
    /([A-Z]{2}\d{4})/g,           // AB1234
    /([A-Z]{3}\d{3})/g,           // ABC123
  ];

  async detectPlate(imageUri: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Iniciando OCR con Google ML Kit...');

      // Preprocesar imagen para mejor OCR
      const processedImage = await this.preprocessImage(imageUri);
      
      // Ejecutar OCR con Google ML Kit
      const result = await TextRecognition.recognize(processedImage.uri);
      
      const processingTime = Date.now() - startTime;
      const plateInfo = this.extractPlateFromMLKitResult(result);

      console.log(`✅ Google OCR completado en ${processingTime}ms`);
      console.log(`📝 Texto detectado: ${result.text}`);
      console.log(`🎯 Placa extraída: ${plateInfo.plateNumber} (${Math.round(plateInfo.confidence * 100)}%)`);

      return {
        plateNumber: plateInfo.plateNumber,
        confidence: plateInfo.confidence,
        success: plateInfo.plateNumber.length > 0,
        allText: result.text,
        processingTime
      };

    } catch (error) {
      console.error('❌ Error en Google OCR:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        plateNumber: '',
        confidence: 0,
        success: false,
        error: `Error procesando imagen: ${error instanceof Error ? error.message : String(error)}`,
        processingTime
      };
    }
  }

  private async preprocessImage(imageUri: string) {
    try {
      console.log('🖼️ Optimizando imagen para Google OCR...');
      
      // Limpiar URI si viene con file://
      const cleanUri = imageUri.replace('file://', '');
      
      const manipResult = await ImageManipulator.manipulate(
        cleanUri,
        [
          { resize: { width: 1024 } }, // Tamaño óptimo para Google ML Kit
          // Opcional: Mejorar contraste
        ],
        {
          compress: 0.8,
          format: 'jpeg', // JPEG es más eficiente para Google ML Kit
        }
      );

      console.log(`✅ Imagen optimizada para Google OCR`);
      return { uri: manipResult.uri };
    } catch (error) {
      console.warn('⚠️ Error optimizando imagen, usando original:', error);
      return { uri: imageUri };
    }
  }

  private extractPlateFromMLKitResult(result: any): { plateNumber: string; confidence: number } {
    console.log('📝 Texto completo detectado:', result.text);
    console.log('🔍 Bloques de texto:', result.blocks?.length || 0);

    // Texto completo como fallback
    const fullText = result.text || '';
    let bestMatch = this.extractPlateFromText(fullText);

    // Procesar bloques individuales para mejor precisión
    if (result.blocks && result.blocks.length > 0) {
      for (const block of result.blocks) {
        const blockText = block.text || '';
        const blockConfidence = block.confidence || 0;
        
        console.log(`📄 Analizando bloque: "${blockText}" (confianza: ${Math.round(blockConfidence * 100)}%)`);
        
        const blockMatch = this.extractPlateFromText(blockText);
        
        // Ponderar la confianza del bloque con la confianza de la extracción
        const weightedConfidence = blockMatch.confidence * blockConfidence;
        
        if (weightedConfidence > bestMatch.confidence) {
          bestMatch = {
            plateNumber: blockMatch.plateNumber,
            confidence: weightedConfidence
          };
        }

        // También revisar líneas dentro del bloque
        if (block.lines) {
          for (const line of block.lines) {
            const lineText = line.text || '';
            const lineConfidence = line.confidence || 0;
            
            const lineMatch = this.extractPlateFromText(lineText);
            const lineWeightedConfidence = lineMatch.confidence * lineConfidence;
            
            if (lineWeightedConfidence > bestMatch.confidence) {
              bestMatch = {
                plateNumber: lineMatch.plateNumber,
                confidence: lineWeightedConfidence
              };
            }
          }
        }
      }
    }

    return bestMatch;
  }

  private extractPlateFromText(text: string): { plateNumber: string; confidence: number } {
    if (!text) return { plateNumber: '', confidence: 0 };

    console.log('🔍 Extrayendo placa de texto:', text);

    // Limpiar texto
    const cleanText = text
      .toUpperCase()
      .replace(/[^A-Z0-9\s\-]/g, '') // Solo letras, números, espacios, guiones
      .replace(/\s+/g, ' ')
      .trim();

    console.log('🧹 Texto limpio:', cleanText);

    let bestMatch = { plateNumber: '', confidence: 0 };

    // Buscar patrones de placas
    for (const pattern of this.platePatterns) {
      const matches = [...cleanText.matchAll(pattern)];
      
      for (const match of matches) {
        const candidate = match[1].replace(/[\s-]/g, '');
        const confidence = this.calculatePlateConfidence(candidate, cleanText);
        
        console.log(`🎯 Candidato: ${candidate} (confianza: ${Math.round(confidence * 100)}%)`);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            plateNumber: this.formatPlateNumber(candidate),
            confidence
          };
        }
      }
    }

    // Fallback: buscar secuencias alfanuméricas
    if (bestMatch.confidence === 0) {
      const alphanumericPattern = /([A-Z]{2,3}\d{3,4})/g;
      const matches = [...cleanText.matchAll(alphanumericPattern)];
      
      for (const match of matches) {
        const candidate = match[1];
        if (candidate.length >= 6 && candidate.length <= 8) {
          const confidence = this.calculatePlateConfidence(candidate, cleanText) * 0.7;
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              plateNumber: this.formatPlateNumber(candidate),
              confidence
            };
          }
        }
      }
    }

    return bestMatch;
  }

  private calculatePlateConfidence(plateCandidate: string, fullText: string): number {
    let confidence = 0.3; // Base más alta para Google OCR

    // Verificar longitud
    if (plateCandidate.length >= 6 && plateCandidate.length <= 8) {
      confidence += 0.3;
    }

    // Verificar formato válido
    if (this.validatePlateFormat(plateCandidate)) {
      confidence += 0.3;
    }

    // Verificar que tenga letras Y números
    const hasLetters = /[A-Z]/.test(plateCandidate);
    const hasNumbers = /[0-9]/.test(plateCandidate);
    if (hasLetters && hasNumbers) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // Método especial para procesar área específica de placa
  async preprocessPlateArea(imageUri: string, cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<{ uri: string }> {
    try {
      console.log('✂️ Procesando área específica de placa para Google OCR...');
      
      const cleanUri = imageUri.replace('file://', '');
      const operations = [];

      // Si hay área de crop específica, aplicarla
      if (cropArea) {
        operations.push({
          crop: {
            originX: cropArea.x,
            originY: cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
          }
        });
      }

      // Redimensionar para Google OCR óptimo
      operations.push({ resize: { width: 1024 } });

      const result = await ImageManipulator.manipulate(
        cleanUri,
        operations,
        {
          compress: 0.8,
          format: 'jpeg',
        }
      );

      console.log('✅ Área de placa procesada para Google OCR');
      return { uri: result.uri };

    } catch (error) {
      console.warn('⚠️ Error procesando área de placa:', error);
      return { uri: imageUri };
    }
  }

  public validatePlateFormat(plateNumber: string): boolean {
    const clean = plateNumber.replace(/[\s-]/g, '').toUpperCase();
    
    const validPatterns = [
      /^[A-Z]{3}\d{3}$/,    // ABC123 (más común en Perú)
      /^[A-Z]\d{2}\d{3}$/,  // A12345
      /^[A-Z]{2}\d{4}$/,    // AB1234
    ];

    return validPatterns.some(pattern => pattern.test(clean));
  }

  public formatPlateNumber(plateNumber: string): string {
    const clean = plateNumber.replace(/[\s-]/g, '').toUpperCase();
    
    // Formato estándar ABC-123
    if (clean.length === 6 && /^[A-Z]{3}\d{3}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    
    return clean;
  }

  // Método de prueba
  async testOCRBasic(): Promise<OCRResult> {
    console.log('🧪 Iniciando prueba básica de Google OCR...');
    
    try {
      const startTime = Date.now();
      
      // Simular delay de procesamiento más rápido que Tesseract
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const processingTime = Date.now() - startTime;
      const testPlates = ['ABC-123', 'XYZ-789', 'DEF-456', 'GHI-321', 'JKL-654'];
      const randomPlate = testPlates[Math.floor(Math.random() * testPlates.length)];
      
      return {
        plateNumber: randomPlate,
        confidence: 0.92, // Google OCR generalmente tiene mayor confianza
        success: true,
        allText: `REPUBLICA DEL PERU\n${randomPlate}\nPLACA DE RODAJE`,
        processingTime
      };
      
    } catch (error) {
      return {
        plateNumber: '',
        confidence: 0,
        success: false,
        error: `Error en prueba: ${error instanceof Error ? error.message : String(error)}`,
        processingTime: 0
      };
    }
  }

  // Detectar con imagen ya procesada desde PlateCamera
  async detectPlateFromProcessedImage(imageUri: string, isAlreadyProcessed: boolean = false): Promise<OCRResult> {
    console.log('🎯 Detectando placa con Google OCR de imagen procesada...');
    
    try {
      if (isAlreadyProcessed) {
        // La imagen ya viene croppeada y optimizada desde PlateCamera
        return await this.detectPlate(imageUri);
      } else {
        // Procesar imagen normalmente
        const processedImage = await this.preprocessImage(imageUri);
        return await this.detectPlate(processedImage.uri);
      }
    } catch (error) {
      console.error('❌ Error en detección de placa con Google OCR:', error);
      throw error;
    }
  }

  // Método para detectar texto en tiempo real (para futuras mejoras)
  async detectPlateFromCamera(imageUri: string): Promise<OCRResult> {
    console.log('📸 Detección en tiempo real con Google OCR...');
    
    try {
      // Para detección rápida, sin mucho preprocesamiento
      const result = await TextRecognition.recognize(imageUri);
      const plateInfo = this.extractPlateFromMLKitResult(result);
      
      return {
        plateNumber: plateInfo.plateNumber,
        confidence: plateInfo.confidence,
        success: plateInfo.plateNumber.length > 0,
        allText: result.text,
        processingTime: 0 // No medimos tiempo para detección rápida
      };
      
    } catch (error) {
      console.error('❌ Error en detección de cámara:', error);
      throw error;
    }
  }

  // Limpiar recursos
  cleanup(): void {
    console.log('🧹 Google OCR Service cleanup');
    // Google ML Kit se limpia automáticamente
  }
}

export const ocrService = new OCRService();