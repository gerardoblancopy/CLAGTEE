import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SubmissionIcon,
  ReviewIcon,
  SettingsIcon,
  LogoutIcon,
  UserIcon,
  ChevronRightIcon
} from '../../components/icons';
import { User, useAuth } from './AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: Array<'author' | 'reviewer' | 'chair' | 'staff' | 'all'>;
}

const navItems: NavItem[] = [
  { id: 'submissions', label: 'Mis Trabajos', icon: <SubmissionIcon className="w-5 h-5" />, roles: ['author'] },
  { id: 'new-submission', label: 'Nuevo Envío', icon: <ChevronRightIcon className="w-5 h-5" />, roles: ['author'] },
  { id: 'reviews', label: 'Revisiones', icon: <ReviewIcon className="w-5 h-5" />, roles: ['reviewer'] },
  { id: 'admin', label: 'Administración', icon: <SettingsIcon className="w-5 h-5" />, roles: ['chair'] },
  { id: 'staff', label: 'Inscripciones', icon: <SubmissionIcon className="w-5 h-5" />, roles: ['staff', 'chair'] },
];

interface CMSLayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeId: string;
  onNavigate: (id: string) => void;
}

export const CMSLayout: React.FC<CMSLayoutProps> = ({
  children,
  user,
  onLogout,
  activeId,
  onNavigate
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { changePassword, error, clearError, isLoading } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const openPasswordModal = () => {
    setShowPasswordModal(true);
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordFeedback(null);
    setLocalError(null);
    clearError();
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordFeedback(null);
    setLocalError(null);
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setPasswordFeedback(null);

    if (passwordForm.next.length < 6) {
      setLocalError('La nueva contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setLocalError('La confirmacion no coincide con la nueva contrasena.');
      return;
    }

    const ok = await changePassword(passwordForm.current, passwordForm.next);
    if (ok) {
      setPasswordFeedback('Contrasena actualizada correctamente.');
      setPasswordForm({ current: '', next: '', confirm: '' });
      setTimeout(() => closePasswordModal(), 1500);
    }
  };

  const filteredNavItems = navItems.filter(
    item => item.roles.includes('all') || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-['Roboto']">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-[#0D2C54] text-white flex flex-col shadow-xl z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <img
                src="/CLAGTEE_2026_blanco.png"
                alt="CLAGTEE 2026 Logo"
                className="h-8 object-contain"
              />
              <span className="text-[10px] font-bold bg-[#2A9D8F] text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                CMS
              </span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRightIcon className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-grow px-4 mt-6">
          <ul className="space-y-2">
            {filteredNavItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${
                    activeId === item.id 
                    ? 'bg-[#2A9D8F] text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-3 font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center p-3 mb-4 rounded-xl bg-white/5 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-[#F4A261] flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-6 h-6 text-[#0D2C54]" />
            </div>
            {isSidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={openPasswordModal}
            className={`w-full flex items-center p-3 mb-2 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <SettingsIcon className="w-5 h-5" />
            {isSidebarOpen && <span className="ml-3 font-medium">Cambiar contraseña</span>}
          </button>
          <button
            onClick={onLogout}
            className={`w-full flex items-center p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogoutIcon className="w-5 h-5" />
            {isSidebarOpen && <span className="ml-3 font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto relative bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-[#0D2C54] capitalize">
            {navItems.find(n => n.id === activeId)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
             <div className="bg-[#2A9D8F]/10 text-[#2A9D8F] px-4 py-1.5 rounded-full text-sm font-bold border border-[#2A9D8F]/20">
               Estado: Conectado
             </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="px-8 pb-8 text-center text-xs text-gray-400">
          © 2026 Escuela de Ingeniería Eléctrica - PUCV
        </footer>
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-[#0D2C54]">Cambiar contraseña</h4>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña actual</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-gray-400 mt-1">Mínimo 6 caracteres</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>

              {(localError || error) && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {localError || error}
                </div>
              )}

              {passwordFeedback && (
                <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">
                  {passwordFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#2A9D8F] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#238C7E] disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : 'Cambiar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
