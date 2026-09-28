import React from 'react';
import { useAuth } from './AuthContext';
import { MyRegistrationCard } from './MyRegistrationCard';

// Perfil de asistentes y empresas (inscripciones sin paper): solo su inscripción.
export const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#0D2C54] to-[#1E4D8C] rounded-3xl p-8 text-white shadow-lg">
        <h3 className="text-2xl font-bold mb-2">¡Bienvenido/a, {user?.name || 'participante'}!</h3>
        <p className="text-blue-100 max-w-xl">
          Aquí puedes revisar el estado de tu inscripción al CLAGTEE 2026, pagar y subir tu comprobante.
        </p>
      </div>

      <MyRegistrationCard accountEmail={user?.email} registerHref="/#inscripcion" />
    </div>
  );
};
