import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

interface VehicleEntry {
  id?: number;
  plateNumber: string;
  entryTime: string;
  exitTime?: string;
  duration?: number; // en minutos
  amount?: number;
  status: 'parked' | 'exited';
  confidence?: number; // confianza del OCR
  createdAt?: string;
}

interface DailySummary {
  totalVehicles: number;
  vehiclesParked: number;
  totalEarnings: number;
  averageStay: number; // en minutos
}

class DatabaseService {
  public db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    // No inicialices aquí, hazlo desde App.tsx
  }

  // Inicializar la base de datos SQLite
  public async initDatabase() {
    try {
      console.time('SQLite.openDatabase');
      this.db = await SQLite.openDatabase({
        name: 'parking_control.db',
        location: 'default',
        // createFromLocation: '~parking_control.db', // solo si tienes un .db pre-poblado
      });
      console.timeEnd('SQLite.openDatabase');

      console.time('createTables');
      await this.createTables();
      console.timeEnd('createTables');

      console.time('insertDefaultSettings');
      await this.insertDefaultSettings();
      console.timeEnd('insertDefaultSettings');

      console.time('insertMockUsersIfNeeded');
      await this.insertMockUsersIfNeeded();
      console.timeEnd('insertMockUsersIfNeeded');

      console.log('✅ Base de datos SQLite inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      throw error;
    }
  }

  // Crear tablas
  private async createTables() {
    if (!this.db) throw new Error('Base de datos no inicializada');
    try {
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS vehicle_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate_number TEXT NOT NULL,
        entry_time TEXT NOT NULL,
        exit_time TEXT,
        duration INTEGER,
        amount REAL,
        status TEXT CHECK(status IN ('parked', 'exited')) DEFAULT 'parked',
        confidence REAL,
        operator_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (operator_id) REFERENCES users(id)
        );
      `);

      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        await this.db.executeSql(
          `ALTER TABLE vehicle_entries ADD COLUMN operator_id INTEGER`,
        );
      } catch (e) {
        console.warn('⚠️ La columna operator_id ya existe en vehicle_entries');
      }

      // Crear tabla users CON isActive desde el inicio
      await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        email TEXT,
        phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

      await this.db.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_plate_number ON vehicle_entries(plate_number);
      `);
      await this.db.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_status ON vehicle_entries(status);
      `);
      await this.db.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_entry_time ON vehicle_entries(entry_time);
      `);

      try {
        await this.db.executeSql(`ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1`);
      } catch (e) {
        // La columna ya existe
      }

      try {
        await this.db.executeSql(`ALTER TABLE users ADD COLUMN email TEXT`);
      } catch (e) {
        // La columna ya existe
      }

      try {
        await this.db.executeSql(`ALTER TABLE users ADD COLUMN phone TEXT`);
      } catch (e) {
        // La columna ya existe
      }

      await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_plate_number ON vehicle_entries(plate_number);`);
      await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_status ON vehicle_entries(status);`);
      await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_entry_time ON vehicle_entries(entry_time);`);
      await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_operator_id ON vehicle_entries(operator_id);`);

    } catch (error) {
      console.error('❌ Error creando tablas:', error);
      throw error;
    }
  }

  // Insertar configuraciones por defecto solo si la tabla está vacía
  public async insertDefaultSettings() {
  if (!this.db) return;
  const [result] = await this.db.executeSql(`SELECT COUNT(*) as count FROM app_settings`);
  if (result.rows.item(0).count === 0) {
    const defaultSettings = [
      // Tarifas
      { key: 'tariff_first_hour', value: '5.00' },
      { key: 'tariff_additional_hour', value: '3.00' },
      { key: 'tariff_max_daily', value: '25.00' },
      { key: 'tariff_night_rate', value: '2.00' },
      { key: 'tariff_weekend_multiplier', value: '1.2' },
      
      // Información del negocio
      { key: 'business_name', value: 'AutoParking Control' },
      { key: 'business_address', value: 'Av. Principal 123, Arequipa' },
      { key: 'business_phone', value: '054-123456' },
      { key: 'business_email', value: 'info@autoparking.com' },
      { key: 'business_ruc', value: '20123456789' },
      { key: 'business_max_spots', value: '50' },
      
      // Configuración del sistema
      { key: 'system_auto_backup', value: 'true' },
      { key: 'system_print_tickets', value: 'true' },
      { key: 'system_use_ocr', value: 'true' },
      { key: 'system_sound_alerts', value: 'true' },
      { key: 'system_max_login_attempts', value: '3' },
      { key: 'system_session_timeout', value: '30' },
      { key: 'system_language', value: 'es' },
      
      // Configuraciones adicionales
      { key: 'grace_period_minutes', value: '15' },
      { key: 'app_version', value: '1.0.0' },
      { key: 'last_backup', value: new Date().toISOString() },
    ];
    
    for (const setting of defaultSettings) {
      try {
        await this.db.executeSql(
          'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
          [setting.key, setting.value]
        );
      } catch (error) {
        console.warn('Warning: Error insertando configuración por defecto:', error);
      }
    }
    console.log('✅ Configuraciones por defecto insertadas');
  }
}


  // Solo inserta usuarios mock si la tabla está vacía
  async insertMockUsersIfNeeded() {
    if (!this.db) throw new Error('Base de datos no inicializada');
    const [result] = await this.db.executeSql(
      `SELECT COUNT(*) as count FROM users`,
    );
    if (result.rows.item(0).count === 0) {
      await this.db.executeSql(
        `INSERT INTO users (username, password, name, role) VALUES 
          ('admin', 'admin123', 'Administrador', 'admin'),
          ('operador', 'operador123', 'Operador', 'operador')`,
      );
    }
  }

  // Registrar entrada de vehículo
  async registerEntry(
    plateNumber: string,
    operatorId?: number,
    confidence?: number,
  ): Promise<number> {
    try {
      const entryTime = new Date().toISOString();
      if (!this.db) throw new Error('Base de datos no inicializada');
      const results = await this.db.executeSql(
        `INSERT INTO vehicle_entries 
       (plate_number, entry_time, status, confidence, operator_id) 
       VALUES (?, ?, 'parked', ?, ?)`,
        [plateNumber, entryTime, confidence || 0, operatorId || null],
      );
      console.log('✅ Vehículo registrado:', plateNumber);
      return results[0].insertId;
    } catch (error) {
      console.error('❌ Error registrando entrada:', error);
      throw new Error('No se pudo registrar la entrada del vehículo');
    }
  }

  // Procesar salida de vehículo
  async processExit(plateNumber: string): Promise<VehicleEntry | null> {
    try {
      const vehicle = await this.getActiveVehicle(plateNumber);
      if (!vehicle) {
        throw new Error('Vehículo no encontrado o ya procesado');
      }
      const exitTime = new Date().toISOString();
      const entryDate = new Date(vehicle.entryTime);
      const exitDate = new Date(exitTime);
      const duration = Math.ceil(
        (exitDate.getTime() - entryDate.getTime()) / (1000 * 60),
      ); // minutos
      const hourlyRate =
        parseFloat(await this.getSetting('hourly_rate')) || 2.0;
      const hours = Math.ceil(duration / 60);
      const amount = hours * hourlyRate;

      if (!this.db) throw new Error('Base de datos no inicializada');
      if (typeof vehicle.id !== 'number') {
        throw new Error('El vehículo no tiene un ID válido');
      }
      await this.db.executeSql(
        `UPDATE vehicle_entries 
         SET exit_time = ?, duration = ?, amount = ?, status = 'exited' 
         WHERE id = ?`,
        [exitTime, duration, amount, vehicle.id],
      );
      console.log('✅ Salida procesada:', plateNumber, 'Monto:', amount);

      return {
        ...vehicle,
        exitTime,
        duration,
        amount,
        status: 'exited',
      };
    } catch (error) {
      console.error('❌ Error procesando salida:', error);
      throw error;
    }
  }

  // Obtener vehículo activo por placa
  async getActiveVehicle(plateNumber: string): Promise<VehicleEntry | null> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      const results = await this.db.executeSql(
        `SELECT * FROM vehicle_entries 
         WHERE plate_number = ? AND status = 'parked' 
         ORDER BY entry_time DESC LIMIT 1`,
        [plateNumber],
      );
      if (results[0].rows.length === 0) return null;
      const row = results[0].rows.item(0);
      return {
        id: row.id,
        plateNumber: row.plate_number,
        entryTime: row.entry_time,
        exitTime: row.exit_time,
        duration: row.duration,
        amount: row.amount,
        status: row.status,
        confidence: row.confidence,
      };
    } catch (error) {
      console.error('❌ Error obteniendo vehículo:', error);
      return null;
    }
  }

  // Obtener todos los vehículos activos
  async getActiveVehicles(): Promise<VehicleEntry[]> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      const results = await this.db.executeSql(
        `SELECT * FROM vehicle_entries 
         WHERE status = 'parked' 
         ORDER BY entry_time DESC`,
      );
      const vehicles: VehicleEntry[] = [];
      for (let i = 0; i < results[0].rows.length; i++) {
        const row = results[0].rows.item(i);
        vehicles.push({
          id: row.id,
          plateNumber: row.plate_number,
          entryTime: row.entry_time,
          exitTime: row.exit_time,
          duration: row.duration,
          amount: row.amount,
          status: row.status,
          confidence: row.confidence,
        });
      }
      return vehicles;
    } catch (error) {
      console.error('❌ Error obteniendo vehículos activos:', error);
      return [];
    }
  }

  // Obtener resumen diario
  async getDailySummary(date?: string): Promise<DailySummary> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      if (!this.db) throw new Error('Base de datos no inicializada');
      const results = await this.db.executeSql(
        `SELECT 
           COUNT(*) as total_vehicles,
           SUM(CASE WHEN status = 'parked' THEN 1 ELSE 0 END) as vehicles_parked,
           COALESCE(SUM(amount), 0) as total_earnings,
           COALESCE(AVG(duration), 0) as average_stay
         FROM vehicle_entries 
         WHERE DATE(entry_time) = ?`,
        [targetDate],
      );
      const row = results[0].rows.item(0);
      return {
        totalVehicles: row.total_vehicles || 0,
        vehiclesParked: row.vehicles_parked || 0,
        totalEarnings: row.total_earnings || 0,
        averageStay: row.average_stay || 0,
      };
    } catch (error) {
      console.error('❌ Error obteniendo resumen diario:', error);
      return {
        totalVehicles: 0,
        vehiclesParked: 0,
        totalEarnings: 0,
        averageStay: 0,
      };
    }
  }

  // Obtener configuración
  async getSetting(key: string): Promise<string> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      const results = await this.db.executeSql(
        'SELECT value FROM app_settings WHERE key = ?',
        [key],
      );
      if (results[0].rows.length === 0) return '';
      return results[0].rows.item(0).value || '';
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      return '';
    }
  }

  // Guardar configuración
  async setSetting(key: string, value: string): Promise<void> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      await this.db.executeSql(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, new Date().toISOString()],
      );
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      throw error;
    }
  }

  // Cerrar conexión de base de datos
  async closeDatabase(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
        console.log('✅ Base de datos cerrada correctamente');
      }
    } catch (error) {
      console.error('❌ Error cerrando base de datos:', error);
    }
  }

  // Obtener usuario
  async getUser(username: string, password: string) {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      const [result] = await this.db.executeSql(
        `SELECT username, name, role FROM users WHERE username = ? AND password = ? LIMIT 1`,
        [username, password],
      );
      if (result.rows.length > 0) {
        return result.rows.item(0);
      }
      return null;
    } catch (error) {
      console.error('❌ Error en getUser:', error);
      return null;
    }
  }

  async getReports({ operatorId = 'all', startDate = '', endDate = '' } = {}) {
    if (!this.db) throw new Error('Base de datos no inicializada');
    let query = `
    SELECT ve.*, u.name as operatorName
    FROM vehicle_entries ve
    LEFT JOIN users u ON ve.operator_id = u.id
    WHERE 1=1
  `;
    const params: any[] = [];

    if (operatorId !== 'all') {
      query += ' AND ve.operator_id = ?';
      params.push(operatorId);
    }
    if (startDate) {
      query += ' AND DATE(ve.entry_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(ve.entry_time) <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY ve.entry_time DESC';

    const results = await this.db.executeSql(query, params);
    const reports: any[] = [];
    for (let i = 0; i < results[0].rows.length; i++) {
      const row = results[0].rows.item(i);
      reports.push({
        id: row.id,
        plateNumber: row.plate_number,
        operatorName: row.operatorName || 'Sistema',
        entryTime: new Date(row.entry_time).toLocaleString('es-PE'),
        exitTime: row.exit_time
          ? new Date(row.exit_time).toLocaleString('es-PE')
          : null,
        duration: row.duration
          ? `${Math.floor(row.duration / 60)}h ${row.duration % 60}m`
          : null,
        amount: row.amount || 0,
        status: row.status === 'exited' ? 'completed' : 'active',
      });
    }
    return reports;
  }

  async getOperators() {
  if (!this.db) throw new Error('Base de datos no inicializada');
  try {
    const [result] = await this.db.executeSql(`
      SELECT 
        u.*,
        COALESCE(stats.totalVehicles, 0) as totalVehiclesProcessed,
        COALESCE(stats.totalEarnings, 0) as totalEarnings
      FROM users u
      LEFT JOIN (
        SELECT 
          operator_id,
          COUNT(*) as totalVehicles,
          SUM(COALESCE(amount, 0)) as totalEarnings
        FROM vehicle_entries 
        WHERE status = 'exited' AND operator_id IS NOT NULL
        GROUP BY operator_id
      ) stats ON u.id = stats.operator_id
      WHERE u.role = 'operador'
      ORDER BY u.name
    `);
    
    const operators: any[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      operators.push({
        id: row.id.toString(),
        username: row.username,
        name: row.name,
        email: row.email || '',
        phone: row.phone || '',
        isActive: Boolean(row.isActive),
        totalVehiclesProcessed: row.totalVehiclesProcessed || 0,
        totalEarnings: parseFloat(row.totalEarnings || '0'),
        lastLogin: null // Por ahora null, puedes implementar tracking más tarde
      });
    }
    return operators;
  } catch (error: any) {
    console.error('❌ Error obteniendo operadores:', error);
    return [];
  }
}

  async addOperator(operator: any) {
  if (!this.db) throw new Error('Base de datos no inicializada');
  try {
    await this.db.executeSql(
      `INSERT INTO users (username, password, name, role, email, phone, isActive) 
       VALUES (?, ?, ?, 'operador', ?, ?, 1)`,
      [
        operator.username, 
        operator.password || 'operador123', 
        operator.name,
        operator.email || '',
        operator.phone || ''
      ]
    );
    console.log('✅ Operador agregado:', operator.name);
  } catch (error) {
    console.error('❌ Error agregando operador:', error);
    throw error;
  }
}

async updateOperator(operator: any) {
  if (!this.db) throw new Error('Base de datos no inicializada');
  try {
    await this.db.executeSql(
      `UPDATE users 
       SET name = ?, username = ?, email = ?, phone = ? 
       WHERE id = ?`,
      [operator.name, operator.username, operator.email || '', operator.phone || '', operator.id]
    );
    console.log('✅ Operador actualizado:', operator.name);
  } catch (error) {
    console.error('❌ Error actualizando operador:', error);
    throw error;
  }
}

async setOperatorStatus(operatorId: string, isActive: boolean) {
  if (!this.db) throw new Error('Base de datos no inicializada');
  try {
    await this.db.executeSql(
      `UPDATE users SET isActive = ? WHERE id = ?`,
      [isActive ? 1 : 0, operatorId]
    );
    console.log(`✅ Estado del operador ${operatorId} cambiado a:`, isActive);
  } catch (error) {
    console.error('❌ Error cambiando estado del operador:', error);
    throw error;
  }
}

async getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const placeholders = keys.map(() => '?').join(',');
    const results = await this.db.executeSql(
      `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`,
      keys
    );
    
    const settings: Record<string, string> = {};
    for (let i = 0; i < results[0].rows.length; i++) {
      const row = results[0].rows.item(i);
      settings[row.key] = row.value;
    }
    
    return settings;
  } catch (error) {
    console.error('❌ Error obteniendo configuraciones:', error);
    return {};
  }
}

async saveSettings(settings: Record<string, string>): Promise<void> {
  try {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    for (const [key, value] of Object.entries(settings)) {
      await this.db.executeSql(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, new Date().toISOString()]
      );
    }
    console.log('✅ Configuraciones guardadas:', Object.keys(settings));
  } catch (error) {
    console.error('❌ Error guardando configuraciones:', error);
    throw error;
  }
}

async getAllSettings(): Promise<{
  tariffs: any;
  businessInfo: any;
  systemConfig: any;
}> {
  try {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    const [result] = await this.db.executeSql('SELECT key, value FROM app_settings');
    const settings: Record<string, string> = {};
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      settings[row.key] = row.value;
    }

    return {
      tariffs: {
        firstHour: parseFloat(settings.tariff_first_hour || '5.00'),
        additionalHour: parseFloat(settings.tariff_additional_hour || '3.00'),
        maxDailyRate: parseFloat(settings.tariff_max_daily || '25.00'),
        nightRate: parseFloat(settings.tariff_night_rate || '2.00'),
        weekendMultiplier: parseFloat(settings.tariff_weekend_multiplier || '1.2'),
      },
      businessInfo: {
        name: settings.business_name || 'AutoParking Control',
        address: settings.business_address || 'Av. Principal 123, Arequipa',
        phone: settings.business_phone || '054-123456',
        email: settings.business_email || 'info@autoparking.com',
        ruc: settings.business_ruc || '20123456789',
        maxSpots: parseInt(settings.business_max_spots || '50'),
      },
      systemConfig: {
        autoBackup: settings.system_auto_backup === 'true',
        printTickets: settings.system_print_tickets === 'true',
        useOCR: settings.system_use_ocr === 'true',
        soundAlerts: settings.system_sound_alerts === 'true',
        maxLoginAttempts: parseInt(settings.system_max_login_attempts || '3'),
        sessionTimeout: parseInt(settings.system_session_timeout || '30'),
        language: settings.system_language || 'es',
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo todas las configuraciones:', error);
    return {
      tariffs: { firstHour: 5.00, additionalHour: 3.00, maxDailyRate: 25.00, nightRate: 2.00, weekendMultiplier: 1.2 },
      businessInfo: { name: 'AutoParking Control', address: 'Av. Principal 123, Arequipa', phone: '054-123456', email: 'info@autoparking.com', ruc: '20123456789', maxSpots: 50 },
      systemConfig: { autoBackup: true, printTickets: true, useOCR: true, soundAlerts: true, maxLoginAttempts: 3, sessionTimeout: 30, language: 'es' }
    };
  }
}

async deleteAllSettings(): Promise<void> {
    try {
      if (!this.db) throw new Error('Base de datos no inicializada');
      await this.db.executeSql('DELETE FROM app_settings');
      console.log('✅ Todas las configuraciones han sido eliminadas');
    } catch (error) {
      console.error('❌ Error eliminando todas las configuraciones:', error);
      throw error;
    }
}

}


export const databaseService = new DatabaseService();
