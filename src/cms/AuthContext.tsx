import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type UserRole = 'author' | 'reviewer' | 'chair';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  affiliation?: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    affiliation?: string;
  }) => Promise<boolean>;
  inviteReviewer: (payload: {
    name: string;
    email: string;
    affiliation?: string;
  }) => Promise<{ email: string; tempPassword: string } | null>;
  deleteReviewer: (userId: string) => Promise<boolean>;
  refreshUsers: (role?: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  session: 'clagtee_session',
  legacyUser: 'clagtee_user',
};

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  'Missing required fields': 'Completa el email, la contrasena y el rol.',
  'User not found for role': 'No encontramos un usuario con ese rol. Verifica el rol seleccionado.',
  'Invalid credentials': 'Email o contrasena incorrectos.',
  'Failed to login': 'No se pudo iniciar sesion. Intenta de nuevo.',
};

const resolveLoginErrorMessage = (rawError?: string) => {
  if (!rawError) {
    return 'No se pudo iniciar sesion. Intenta de nuevo.';
  }
  return LOGIN_ERROR_MESSAGES[rawError] || 'No se pudo iniciar sesion. Intenta de nuevo.';
};

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return fallback;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSession = safeParse<{ user: User } | null>(
      localStorage.getItem(STORAGE_KEYS.session),
      null
    );
    const legacyUser = safeParse<User | null>(localStorage.getItem(STORAGE_KEYS.legacyUser), null);
    if (storedSession?.user) {
      setUser(storedSession.user);
    } else if (legacyUser) {
      setUser(legacyUser);
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user: legacyUser }));
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'chair') {
      void refreshUsers('reviewer');
    }
  }, [user?.role]);

  const refreshUsers = async (role?: UserRole) => {
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      const response = await fetch(`/api/auth/users${query}`);
      if (!response.ok) {
        throw new Error('No se pudieron cargar los usuarios.');
      }
      const payload = (await response.json()) as { users: User[] };
      setUsers(payload.users);
    } catch (fetchError) {
      setError('No se pudieron cargar los usuarios.');
    }
  };

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      if (!response.ok) {
        let payloadError: string | undefined;
        try {
          const payload = (await response.json()) as { error?: string };
          payloadError = payload.error;
        } catch (parseError) {
          payloadError = undefined;
        }
        setError(resolveLoginErrorMessage(payloadError));
        setIsLoading(false);
        return false;
      }
      const payload = (await response.json()) as { user: User };
      setUser(payload.user);
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user: payload.user }));
      setIsLoading(false);
      if (payload.user.role === 'chair') {
        await refreshUsers('reviewer');
      }
      return true;
    } catch (fetchError) {
      setError(resolveLoginErrorMessage());
      setIsLoading(false);
      return false;
    }
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    affiliation?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        setError(errorPayload.error || 'No se pudo registrar.');
        setIsLoading(false);
        return false;
      }
      const payloadResponse = (await response.json()) as { user: User };
      setUser(payloadResponse.user);
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user: payloadResponse.user }));
      setIsLoading(false);
      return true;
    } catch (fetchError) {
      setError('No se pudo registrar.');
      setIsLoading(false);
      return false;
    }
  };

  const inviteReviewer = async (payload: {
    name: string;
    email: string;
    affiliation?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/invite-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        setError(errorPayload.error || 'No se pudo invitar al revisor.');
        setIsLoading(false);
        return null;
      }
      const result = (await response.json()) as { email: string; tempPassword: string };
      setIsLoading(false);
      await refreshUsers('reviewer');
      return result;
    } catch (fetchError) {
      setError('No se pudo invitar al revisor.');
      setIsLoading(false);
      return null;
    }
  };

  const deleteReviewer = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        setError(errorPayload.error || 'No se pudo eliminar al revisor.');
        setIsLoading(false);
        return false;
      }
      await refreshUsers('reviewer');
      setIsLoading(false);
      return true;
    } catch (fetchError) {
      setError('No se pudo eliminar al revisor.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem(STORAGE_KEYS.legacyUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isLoading,
        error,
        clearError,
        login,
        register,
        inviteReviewer,
        deleteReviewer,
        refreshUsers,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
