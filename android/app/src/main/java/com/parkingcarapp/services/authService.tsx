import { databaseService } from './databaseService';

type User = {
  username: string;
  name: string;
  role: string;
};

class AuthService {
  private currentUser: User | null = null;

  async login(username: string, password: string): Promise<User | null> {
  try {
    console.log('🔐 Intentando autenticación para:', username);
    
    // Verificar que el servicio de base de datos esté disponible
    if (!databaseService) {
      throw new Error('Servicio de base de datos no disponible');
    }

    const user = await databaseService.getUser(username, password);
    if (user) {
      this.currentUser = user;
      console.log('✅ Usuario autenticado exitosamente:', user.name);
      return user;
    }
    
    console.log('❌ Credenciales incorrectas para:', username);
    return null;
  } catch (error) {
    console.error('❌ Error en authService.login:', error);
    throw error;
  }
}

  logout() {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

export const authService = new AuthService();