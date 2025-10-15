import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  token: string | null;
  login: (token: string, user: Omit<User, 'password'>) => void;
  logout: () => void;
  getToken: () => string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount and validate token
  useEffect(() => {
    const validateAndLoadAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');
      
      if (storedToken && storedUser) {
        // Validate the token by making a test API call
        try {
          const response = await fetch('/api/dashboard/stats', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            // Token is valid, load the auth state
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // Token is invalid (401/403), clear everything
            console.log('[AUTH] Clearing invalid/expired token from localStorage');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } catch (error) {
          // Network error or other issue, clear auth state to be safe
          console.error('[AUTH] Error validating token:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
      }
      
      setIsLoading(false);
    };
    
    validateAndLoadAuth();
  }, []);

  const login = (newToken: string, newUser: Omit<User, 'password'>) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const getToken = () => {
    return token || localStorage.getItem('authToken');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        login, 
        logout, 
        getToken,
        isAuthenticated: !!token && !!user,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
