import React, { createContext, useContext, useState, useEffect } from 'react';
import { PersonaProfile } from '../../server/types/index.js';
import { api } from '../lib/api.js';
import { hasRouteAccess } from '../lib/rbac.js';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AuthContextType {
  personas: PersonaProfile[];
  currentPersona: PersonaProfile | null;
  isAuthenticated: boolean;
  login: (personaId: string) => Promise<boolean>;
  loginWithCredentials: (
    identifier: string,
    password?: string,
    role?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchPersona: (personaId: string) => void;
  hasAccess: (route: string) => boolean;
  isSessionLocked: boolean;
  lockSession: () => void;
  unlockSession: () => void;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);
  const [currentPersona, setCurrentPersona] = useState<PersonaProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const isAuth = localStorage.getItem('college_erp_authenticated') === 'true';
    const personaId = localStorage.getItem('college_erp_active_persona_id');
    return isAuth && !!personaId;
  });
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const res = await api.get('/personas');
        if (res.data.success && res.data.data.length > 0) {
          const list: PersonaProfile[] = res.data.data;
          setPersonas(list);

          // Restore session if authenticated
          const isAuth = localStorage.getItem('college_erp_authenticated') === 'true';
          const savedId = localStorage.getItem('college_erp_active_persona_id');
          const token = localStorage.getItem('college_erp_jwt_token');

          if (isAuth && savedId) {
            const found = list.find((p) => p.id === savedId);
            if (found) {
              setCurrentPersona(found);
              setIsAuthenticated(true);
              // Ensure we have a valid JWT token stored for this persona
              if (!token) {
                try {
                  const loginRes = await api.post('/auth/login', { personaId: found.id });
                  if (loginRes.data.success) {
                    const jwt = loginRes.data.accessToken || loginRes.data.token;
                    if (jwt) localStorage.setItem('college_erp_jwt_token', jwt);
                    if (loginRes.data.refreshToken) {
                      localStorage.setItem('college_erp_refresh_token', loginRes.data.refreshToken);
                    }
                  }
                } catch {
                  // Keep ephemeral state
                }
              }
            } else {
              localStorage.removeItem('college_erp_authenticated');
              localStorage.removeItem('college_erp_jwt_token');
              localStorage.removeItem('college_erp_refresh_token');
              localStorage.removeItem('college_erp_active_persona_id');
              setIsAuthenticated(false);
              setCurrentPersona(null);
            }
          } else {
            setIsAuthenticated(false);
            setCurrentPersona(null);
          }
        }
      } catch {
        // Fallback default persona list if offline
        const fallback: PersonaProfile = {
          id: 'user_super_admin',
          name: 'Dr. Aris Thorne',
          role: 'SUPER_ADMIN',
          roleLabel: 'Dean of Information & Technology',
          department: 'Central Administration',
          staffId: 'DIR-001',
          email: 'admin@nexusuniv.edu',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          allowedModules: ['*'],
        };
        setPersonas([fallback]);
        setIsAuthenticated(false);
        setCurrentPersona(null);
      }
    };
    fetchPersonas();
  }, []);

  const login = async (personaId: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { personaId });
      if (res.data.success && res.data.data) {
        const target: PersonaProfile = res.data.data;
        setCurrentPersona(target);
        setIsAuthenticated(true);
        if (res.data.accessToken || res.data.token) {
          localStorage.setItem('college_erp_jwt_token', res.data.accessToken || res.data.token);
        }
        if (res.data.refreshToken) {
          localStorage.setItem('college_erp_refresh_token', res.data.refreshToken);
        }
        localStorage.setItem('college_erp_active_persona_id', target.id);
        localStorage.setItem('college_erp_authenticated', 'true');
        showToast(
          'success',
          'Role Access Granted',
          `Logged in as ${target.name} (${target.roleLabel})`
        );
        return true;
      }
    } catch {
      // If login failed, return false
    }
    return false;
  };

  const loginWithCredentials = async (
    identifier: string,
    password?: string,
    role?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.post('/auth/login', { identifier, password, role });
      if (res.data.success && res.data.data) {
        const target: PersonaProfile = res.data.data;
        setCurrentPersona(target);
        setIsAuthenticated(true);
        if (res.data.accessToken || res.data.token) {
          localStorage.setItem('college_erp_jwt_token', res.data.accessToken || res.data.token);
        }
        if (res.data.refreshToken) {
          localStorage.setItem('college_erp_refresh_token', res.data.refreshToken);
        }
        localStorage.setItem('college_erp_active_persona_id', target.id);
        localStorage.setItem('college_erp_authenticated', 'true');
        showToast(
          'success',
          'IAM Clearance Verified',
          `Logged into ${target.role} portal as ${target.name}`
        );
        return { success: true };
      }
      return { success: false, error: res.data.error || 'Authentication rejected' };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        'Invalid institutional credentials or passcode for designated role.';
      showToast('error', 'Authentication Failed', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setCurrentPersona(null);
      setIsAuthenticated(false);
      localStorage.removeItem('college_erp_authenticated');
      localStorage.removeItem('college_erp_jwt_token');
      localStorage.removeItem('college_erp_refresh_token');
      localStorage.removeItem('college_erp_active_persona_id');
      showToast('info', 'Logged Out', 'Your institutional session has been terminated safely.');
    }
  };

  const switchPersona = async (personaId: string) => {
    const target = personas.find((p) => p.id === personaId);
    if (target) {
      setCurrentPersona(target);
      setIsAuthenticated(true);
      localStorage.setItem('college_erp_active_persona_id', target.id);
      localStorage.setItem('college_erp_authenticated', 'true');
      try {
        const res = await api.post('/auth/login', { personaId: target.id });
        if (res.data?.success) {
          const jwt = res.data.accessToken || res.data.token;
          if (jwt) localStorage.setItem('college_erp_jwt_token', jwt);
          if (res.data.refreshToken) {
            localStorage.setItem('college_erp_refresh_token', res.data.refreshToken);
          }
        }
      } catch {
        // Continue with local identity
      }
      showToast(
        'info',
        'Switched Role Clearance',
        `Active Identity: ${target.name} (${target.roleLabel})`
      );
    }
  };

  const hasAccess = (route: string): boolean => {
    return hasRouteAccess(route, currentPersona);
  };

  const lockSession = () => {
    setIsSessionLocked(true);
    showToast('warning', 'Session Suspended', 'Workstation state locked. Enter passcode to resume.');
  };

  const unlockSession = () => {
    setIsSessionLocked(false);
    showToast('success', 'Session Resumed', 'Workstation state restored.');
  };

  const showToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        personas,
        currentPersona,
        isAuthenticated,
        login,
        loginWithCredentials,
        logout,
        switchPersona,
        hasAccess,
        isSessionLocked,
        lockSession,
        unlockSession,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
