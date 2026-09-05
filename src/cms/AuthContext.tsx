import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type UserRole = 'author' | 'reviewer' | 'chair' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  affiliation?: string;
  // Set when the reviewer invitation email was dispatched; absent for
  // reviewers invited before this was recorded.
  invitationSentAt?: string | null;
  invitationError?: string | null;
  // Ultimo aviso de trabajos asignados enviado al revisor.
  assignmentNotifiedAt?: string | null;
  assignmentNotifyError?: string | null;
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
  }) => Promise<{
    email: string;
    tempPassword: string;
    emailSent?: boolean;
    emailError?: string | null;
  } | null>;
  resendReviewerInvitation: (email: string) => Promise<{
    email: string;
    tempPassword: string;
  } | null>;
  deleteReviewer: (userId: string) => Promise<boolean>;
  deleteAuthor: (userId: string) => Promise<boolean>;
  sendEmailToUser: (payload: {
    to: string | string[];
    name?: string;
    subject: string;
    body: string;
  }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  requestPasswordReset: (email: string, role: UserRole) => Promise<boolean>;
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
      void refreshUsers();
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
        await refreshUsers();
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
      const result = (await response.json()) as {
        email: string;
        tempPassword: string;
        emailSent?: boolean;
        emailError?: string | null;
      };
      setIsLoading(false);
      await refreshUsers();
      return result;
    } catch (fetchError) {
      setError('No se pudo invitar al revisor.');
      setIsLoading(false);
      return null;
    }
  };

  const deleteUserByRole = async (userId: string, role: UserRole, errorLabel: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        setError(errorPayload.error || `No se pudo eliminar al ${errorLabel}.`);
        setIsLoading(false);
        return false;
      }
      await refreshUsers();
      setIsLoading(false);
      return true;
    } catch (fetchError) {
      setError(`No se pudo eliminar al ${errorLabel}.`);
      setIsLoading(false);
      return false;
    }
  };

  const deleteReviewer = (userId: string) => deleteUserByRole(userId, 'reviewer', 'revisor');
  const deleteAuthor = (userId: string) => deleteUserByRole(userId, 'author', 'autor');

  const resendReviewerInvitation = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/invite-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'resend' }),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string; emailError?: string };
        setError(errorPayload.emailError || errorPayload.error || 'No se pudo reenviar la invitacion.');
        setIsLoading(false);
        return null;
      }
      const result = (await response.json()) as { email: string; tempPassword: string };
      setIsLoading(false);
      await refreshUsers();
      return result;
    } catch (fetchError) {
      setError('No se pudo reenviar la invitacion.');
      setIsLoading(false);
      return null;
    }
  };

  const sendEmailToUser = async (payload: {
    to: string | string[];
    name?: string;
    subject: string;
    body: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        setError(errorPayload.error || 'No se pudo enviar el correo.');
        setIsLoading(false);
        return false;
      }
      const result = (await response.json().catch(() => ({}))) as {
        sent?: number;
        failed?: number;
      };
      if (result.failed) {
        const total = (result.sent || 0) + result.failed;
        setError(`Enviado a ${result.sent || 0} de ${total} destinatarios. ${result.failed} fallaron.`);
      }
      setIsLoading(false);
      return true;
    } catch (fetchError) {
      setError('No se pudo enviar el correo.');
      setIsLoading(false);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) {
      setError('No hay una sesion activa.');
      return false;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          role: user.role,
          currentPassword,
          newPassword,
        }),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        const messageMap: Record<string, string> = {
          'Current password is incorrect': 'La contrasena actual es incorrecta.',
          'New password must be at least 6 characters': 'La nueva contrasena debe tener al menos 6 caracteres.',
          'User not found': 'No se encontro el usuario.',
        };
        setError(messageMap[errorPayload.error || ''] || errorPayload.error || 'No se pudo cambiar la contrasena.');
        setIsLoading(false);
        return false;
      }
      setIsLoading(false);
      return true;
    } catch (fetchError) {
      setError('No se pudo cambiar la contrasena.');
      setIsLoading(false);
      return false;
    }
  };

  const requestPasswordReset = async (email: string, role: UserRole) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        setError(errorPayload.error || 'No se pudo solicitar la recuperacion.');
        setIsLoading(false);
        return false;
      }
      setIsLoading(false);
      return true;
    } catch (fetchError) {
      setError('No se pudo solicitar la recuperacion.');
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
        resendReviewerInvitation,
        deleteReviewer,
        deleteAuthor,
        sendEmailToUser,
        changePassword,
        requestPasswordReset,
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
