import { databaseService } from './databaseService';

type User = {
  username: string;
  name: string;
  role: string;
};

class AuthService {
  private currentUser: User | null = null;

  async login(username: string, password: string): Promise<User | null> {
    const user = await databaseService.getUser(username, password);
    if (user) {
      this.currentUser = user;
      return user;
    }
    return null;
  }

  logout() {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

export const authService = new AuthService();