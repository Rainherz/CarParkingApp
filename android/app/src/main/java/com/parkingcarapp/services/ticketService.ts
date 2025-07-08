import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Platform } from 'react-native';

interface VehicleExit {
  plateNumber: string;
  entryTime: string;
  exitTime: string;
  duration: number; // en minutos
  amount: number;
  parkingRate: number;
}

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  ruc?: string;
  website?: string;
}

interface TicketData {
  ticketNumber: string;
  vehicle: VehicleExit;
  business: BusinessInfo;
  generatedAt: string;
}

interface TicketOptions {
  format: 'text' | 'html' | 'pdf';
  includeQR?: boolean;
  language?: 'es' | 'en';
}

class TicketService {
  [x: string]: any;
  private ticketCounter: number = 1;
  private defaultBusiness: BusinessInfo = {
    name: 'AutoParking Control',
    address: 'Av. Principal 123, Arequipa',
    phone: '054-123456',
    ruc: '12345678901',
    website: 'www.autoparking.pe',
  };

  /**
   * Generar ticket completo de salida
   */
  async generateExitTicket(
    vehicleData: VehicleExit,
    options: TicketOptions = { format: 'html' }
  ): Promise<TicketData> {
    try {
      console.log('🎫 Generando ticket para vehículo:', vehicleData.plateNumber);

      const ticketData: TicketData = {
        ticketNumber: this.generateTicketNumber(),
        vehicle: vehicleData,
        business: this.defaultBusiness,
        generatedAt: new Date().toISOString(),
      };

      console.log('✅ Ticket generado:', ticketData.ticketNumber);
      return ticketData;
    } catch (error) {
      console.error('❌ Error generando ticket:', error);
      throw new Error('No se pudo generar el ticket');
    }
  }

  /**
   * Generar ticket en formato texto plano
   */
  generateTextTicket(ticketData: TicketData): string {
    const { vehicle, business, ticketNumber, generatedAt } = ticketData;

    const formatTime = (isoString: string) => {
      return new Date(isoString).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
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

    return `
========================================
         ${business.name.toUpperCase()}
========================================
${business.address}
Teléfono: ${business.phone}
${business.ruc ? `RUC: ${business.ruc}` : ''}

----------------------------------------
COMPROBANTE DE ESTACIONAMIENTO
----------------------------------------
Ticket N°: ${ticketNumber}
Fecha: ${formatDate(generatedAt)}
Hora: ${formatTime(generatedAt)}

VEHÍCULO: ${vehicle.plateNumber}
Entrada: ${formatTime(vehicle.entryTime)}
Salida:  ${formatTime(vehicle.exitTime)}
Tiempo:  ${formatDuration(vehicle.duration)}

TARIFA: S/ ${vehicle.parkingRate.toFixed(2)}/hora
TOTAL A PAGAR: S/ ${vehicle.amount.toFixed(2)}

----------------------------------------
¡Gracias por su preferencia!
Conserve este comprobante
${business.website ? `Visítenos: ${business.website}` : ''}
========================================
`.trim();
  }

  /**
   * Compartir ticket como texto o PDF
   */
  async shareTicket(ticketData: TicketData, format: 'text' | 'html' = 'text'): Promise<boolean> {
    try {
      console.log('📤 Preparando compartir ticket...');

      if (format === 'text') {
        // Compartir como texto plano
        const textContent = this.generateTextTicket(ticketData);
        const fileName = `ticket_${ticketData.ticketNumber}.txt`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, textContent, 'utf8');
        await Share.open({
          url: `file://${filePath}`,
          type: 'text/plain',
          title: 'Compartir Ticket',
        });

        return true;
      } else {
        // Compartir como HTML (PDF no implementado aquí)
        const htmlContent = this.generateHTMLTicket(ticketData);
        const fileName = `ticket_${ticketData.ticketNumber}.html`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, htmlContent, 'utf8');
        await Share.open({
          url: `file://${filePath}`,
          type: 'text/html',
          title: 'Compartir Ticket',
        });

        return true;
      }
    } catch (error) {
      console.error('❌ Error compartiendo ticket:', error);
      throw new Error('No se pudo compartir el ticket');
    }
  }

  /**
   * Generar número de ticket único
   */
  private generateTicketNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const counter = this.ticketCounter.toString().padStart(4, '0');

    this.ticketCounter++;

    return `${year}${month}${day}${counter}`;
  }
}

export const ticketService = new TicketService();