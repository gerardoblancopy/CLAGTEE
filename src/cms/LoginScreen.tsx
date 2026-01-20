import React, { useState, useEffect } from 'react';
import { ChevronRightIcon } from '../../components/icons';
import { useAuth, UserRole } from './AuthContext';

const roleLabels: Record<UserRole, string> = {
  author: 'Autor',
  reviewer: 'Revisor',
  chair: 'Chair',
};

export const LoginScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    affiliation: '',
    role: 'author' as UserRole,
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    setFormError(null);
    if (mode === 'register' && formState.role === 'chair') {
      setFormState((prev) => ({ ...prev, role: 'author' }));
    }
  }, [mode, clearError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const email = formState.email.trim();
    const password = formState.password;

    if (mode === 'login') {
      if (!email && !password) {
        setFormError('Ingresa tu email y contrasena.');
        return;
      }
      if (!email) {
        setFormError('Ingresa tu email.');
        return;
      }
      if (!password) {
        setFormError('Ingresa tu contrasena.');
        return;
      }
      await login(email, password, formState.role);
      return;
    }

    if (!formState.name.trim()) {
      setFormError('Ingresa tu nombre completo.');
      return;
    }
    if (!email || !password) {
      setFormError('Completa el email y la contrasena.');
      return;
    }
    await register({
      name: formState.name,
      email,
      password,
      role: formState.role,
      affiliation: formState.affiliation,
    });
  };

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (formError) {
      setFormError(null);
    }
    if (error) {
      clearError();
    }
  };

  const displayError = formError || error;

  return (
    <div className="min-h-screen bg-[#0D2C54] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl flex overflow-hidden max-w-5xl w-full">
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <div className="mb-6">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mb-6 inline-flex items-center text-sm font-bold text-[#0D2C54] hover:text-[#1A4B8A] transition-colors"
              >
                <span className="mr-2 inline-block rotate-180">
                  <ChevronRightIcon className="w-4 h-4" />
                </span>
                Atrás
              </button>
            )}
            <h2 className="text-3xl font-bold text-[#0D2C54] mb-2">
              {mode === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}
            </h2>
            <p className="text-gray-500">
              {mode === 'login'
                ? 'Ingresa a la plataforma de gestión CLAGTEE 2026'
                : 'Registra tu perfil para gestionar envíos y revisiones'}
            </p>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === tab ? 'bg-white text-[#0D2C54] shadow' : 'text-gray-500'
                }`}
              >
                {tab === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre completo</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                  placeholder="Nombre y apellido"
                  value={formState.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                placeholder="tu@email.com"
                value={formState.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                placeholder="••••••••"
                value={formState.password}
                onChange={(event) => updateField('password', event.target.value)}
              />
            </div>

            {mode === 'login' && (
              <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Rol de acceso
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['author', 'reviewer', 'chair'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => updateField('role', role)}
                      className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${
                        formState.role === role
                          ? 'bg-[#2A9D8F] text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Afiliacion</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all"
                    placeholder="Universidad / Empresa"
                    value={formState.affiliation}
                    onChange={(event) => updateField('affiliation', event.target.value)}
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                    Rol de registro (solo autor o revisor)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['author', 'reviewer'] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => updateField('role', role)}
                        className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${
                          formState.role === role
                            ? 'bg-[#2A9D8F] text-white'
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        }`}
                      >
                        {roleLabels[role]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {displayError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0D2C54] text-white py-4 rounded-xl font-bold hover:bg-[#1A4B8A] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Iniciar Sesion' : 'Registrar Cuenta'}</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-sm text-gray-500 space-y-2">
            <p className="font-bold text-gray-400 uppercase tracking-wide text-xs">Accesos demo</p>
            <div className="flex flex-col gap-1">
              <span>Chair: chair@clagtee.org / chair2026</span>
              <span>Reviewer: reviewer@clagtee.org / reviewer2026</span>
              <span>Author: author@clagtee.org / author2026</span>
            </div>
          </div>
        </div>

        <div className="hidden md:block w-1/2 bg-[#F8FAFC] relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2A9D8F]/20 to-[#0D2C54]/20 z-10" />
          <img
            src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            alt="Conference networking"
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-50"
          />
          <div className="absolute top-8 right-8 z-20 rounded-2xl bg-white/40 backdrop-blur-sm p-0 shadow-lg">
            <img
              src="https://res.cloudinary.com/dnh5bxvvy/image/upload/v1753825283/image_efe0xn.png"
              alt="Logo CLAGTEE 2026"
              className="h-32 w-auto lg:h-40"
            />
          </div>
          <div className="relative z-20 h-full flex flex-col justify-end p-12 pr-28 text-white">
            <h3 className="text-xl font-bold mb-4 text-[#0D2C54]">Sistema de Gestión de Artículos</h3>
            <p className="text-gray-600 leading-relaxed">
              Registra autores, asigna revisores y emite decisiones desde un panel unificado con
              trazabilidad completa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
