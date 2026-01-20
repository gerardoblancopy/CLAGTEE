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
import { User } from './AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  role: 'author' | 'reviewer' | 'chair' | 'all';
}

const navItems: NavItem[] = [
  { id: 'submissions', label: 'Mis Trabajos', icon: <SubmissionIcon className="w-5 h-5" />, role: 'author' },
  { id: 'new-submission', label: 'Nuevo Envío', icon: <ChevronRightIcon className="w-5 h-5" />, role: 'author' },
  { id: 'reviews', label: 'Revisiones', icon: <ReviewIcon className="w-5 h-5" />, role: 'reviewer' },
  { id: 'admin', label: 'Administración', icon: <SettingsIcon className="w-5 h-5" />, role: 'chair' },
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

  const filteredNavItems = navItems.filter(
    item => item.role === 'all' || item.role === user.role
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
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold tracking-tight text-[#2A9D8F]"
            >
              CLAGTEE CMS
            </motion.h1>
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
      </main>
    </div>
  );
};
