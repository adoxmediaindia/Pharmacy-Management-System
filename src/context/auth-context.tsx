import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, UserRole, AuthState } from '@/constants/types';
import { ApiClient } from '@/services/api-client';
import { CONFIG } from '@/constants/config';

// Safe, pure JS decoder to verify token expiration on client side
const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let raw = '';
    const cleanStr = payloadBase64.replace(/=+$/, '');
    for (let i = 0; i < cleanStr.length; i += 4) {
      const chunk = 
        (chars.indexOf(cleanStr.charAt(i)) << 18) |
        (chars.indexOf(cleanStr.charAt(i + 1)) << 12) |
        ((i + 2 < cleanStr.length ? chars.indexOf(cleanStr.charAt(i + 2)) : 0) << 6) |
        (i + 3 < cleanStr.length ? chars.indexOf(cleanStr.charAt(i + 3)) : 0);
      raw += String.fromCharCode((chunk >> 16) & 255);
      if (i + 2 < cleanStr.length) {
        raw += String.fromCharCode((chunk >> 8) & 255);
      }
      if (i + 3 < cleanStr.length) {
        raw += String.fromCharCode(chunk & 255);
      }
    }
    
    const payload = JSON.parse(raw);
    if (payload && typeof payload.exp === 'number') {
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    }
    return false;
  } catch {
    return true;
  }
};

// Pre-defined mock users mapping credentials to roles (Maintained for developer references)
export const MOCK_USERS: Record<string, { email: string; role: UserRole; fullName: string }> = {
  admin: { email: 'admin@pharmacy.com', role: 'ADMIN', fullName: 'Dr. Arthur Pendelton' },
  receiver: { email: 'receiver@pharmacy.com', role: 'CALL_RECEIVER', fullName: 'Clara Oswald' },
  biller: { email: 'biller@pharmacy.com', role: 'BILLER', fullName: 'Bill Potts' },
  packer: { email: 'packer@pharmacy.com', role: 'PACKER', fullName: 'Rose Tyler' },
  team: { email: 'team@pharmacy.com', role: 'DELIVERY_TEAM', fullName: 'Martha Jones' },
  rider: { email: 'rider@pharmacy.com', role: 'DELIVERY_BOY', fullName: 'Jack Harkness' },
};

interface AuthContextType {
  state: AuthState;
  login: (username: string, password?: string, bypassRole?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Session Restoration on startup & API token listener setup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync(CONFIG.AUTH_TOKEN_KEY);
        const userDataStr = await SecureStore.getItemAsync(CONFIG.AUTH_USER_KEY);

        if (token && userDataStr) {
          if (isTokenExpired(token)) {
            // Expired token: clean storage immediately
            await SecureStore.deleteItemAsync(CONFIG.AUTH_TOKEN_KEY);
            await SecureStore.deleteItemAsync(CONFIG.AUTH_USER_KEY);
            setUser(null);
          } else {
            const parsedUser = JSON.parse(userDataStr) as User;
            setUser(parsedUser);
          }
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    // Register dynamic 401 token expired listener
    ApiClient.onSessionExpired = () => {
      setUser(null);
    };

    return () => {
      ApiClient.onSessionExpired = null;
    };
  }, []);

  /**
   * Performs authentication against the backend API.
   */
  const login = async (
    username: string,
    password?: string,
    bypassRole?: UserRole
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // Prepare credentials (if developer bypass was used, map it to the corresponding dev account password)
    const loginUsername = username.trim().toLowerCase();
    const loginPassword = password || loginUsername; // Default password is username for seeded dev accounts

    try {
      // API call to authenticate
      const response = await ApiClient.post('/auth/login', {
        username: loginUsername,
        password: loginPassword,
      });

      if (response && response.success) {
        const loggedUser: User = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          role: response.user.role as UserRole,
          fullName: response.user.fullName,
        };

        // Save token and user details securely on device
        await SecureStore.setItemAsync(CONFIG.AUTH_TOKEN_KEY, response.token);
        await SecureStore.setItemAsync(CONFIG.AUTH_USER_KEY, JSON.stringify(loggedUser));

        setUser(loggedUser);
        setIsLoading(false);
        return true;
      } else {
        setError(response.error || 'Authentication failed');
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Map friendly client errors for database availability issues
      if (err.message === 'BACKEND_UNAVAILABLE') {
        setError('Cannot connect to backend server. Make sure the server is running and the API_BASE_URL IP in config.ts is updated.');
      } else {
        setError(err.message || 'Invalid username or password');
      }
      
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Destroys active session: logs event to backend and deletes local tokens.
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      // 1. Audit logout event on server
      await ApiClient.post('/auth/logout');
    } catch (err: any) {
      // Ignore network/expiration errors on logout since we want to clear client state anyway
      if (err.message !== 'SESSION_EXPIRED') {
        console.warn('Backend logout audit skipped:', err);
      }
    } finally {
      // 2. Clear credentials from Secure Store
      await SecureStore.deleteItemAsync(CONFIG.AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(CONFIG.AUTH_USER_KEY);
      
      // 3. Clear local memory state
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        state: {
          isAuthenticated: !!user,
          user,
          isLoading,
          error,
        },
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}
