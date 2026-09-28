import React, { useEffect, useState } from 'react';
import { RegistrationRecord, RegistrationStatus } from '../../types';
import { apiFetch } from './api';
import { categoryLabels, statusLabels, statusStyles } from './StaffDashboard';

// Lo que devuelve GET /api/registrations?scope=mine: sin token, con el enlace para retomar.
type OwnRegistration = Omit<RegistrationRecord, 'token'> & { resumeUrl: string };

// Estados en que el participante aún debe pagar o corregir su comprobante.
const ACTION_STATUSES: RegistrationStatus[] = ['pre-registro-creado', 'observado'];

export const MyRegistrationCard: React.FC<{ accountEmail?: string }> = ({ accountEmail }) => {
  const [registrations, setRegistrations] = useState<OwnRegistration[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/registrations?scope=mine')
      .then(async (response) => {
        if (!response.ok) throw new Error('fetch-failed');
        const payload = (await response.json()) as { registrations: OwnRegistration[] };
        if (!cancelled) {
          setRegistrations((payload.registrations || []).filter((reg) => reg.status !== 'cancelada'));
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xl font-bold text-[#0D2C54]">Mi Inscripción al Congreso</h4>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          No se pudo cargar tu inscripción. Intenta recargar la página.
        </div>
      ) : registrations === null ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : registrations.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-gray-500 mb-1">Aún no encontramos una inscripción asociada a tu cuenta.</p>
          <p className="text-xs text-gray-400 mb-4">
            Se muestran las inscripciones hechas con tu correo{accountEmail ? ` (${accountEmail})` : ''} o
            asociadas a tus trabajos. Si te inscribiste con otro correo, usa el enlace del correo de pre-registro.
          </p>
          <a
            href="/?cat=autor#inscripcion"
            className="inline-block bg-[#2A9D8F] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#238C7E] transition-colors"
          >
            Inscribirme al congreso
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {registrations.map((reg) => {
            const needsAction = ACTION_STATUSES.includes(reg.status);
            return (
              <div
                key={reg.id}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="font-bold text-[#0D2C54]">
                    {reg.id} · {categoryLabels[reg.category]}
                  </p>
                  <p className="text-sm text-gray-500">
                    {reg.firstName} {reg.lastName} · USD {reg.amountUsd}
                    {reg.cmsPaperId ? ` · Paper ${reg.cmsPaperId}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${statusStyles[reg.status]}`}>
                    {statusLabels[reg.status]}
                  </span>
                  <a
                    href={reg.resumeUrl}
                    className={
                      needsAction
                        ? 'bg-[#F4A261] hover:bg-[#E76F51] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors'
                        : 'text-[#2A9D8F] text-sm font-bold hover:underline'
                    }
                  >
                    {needsAction ? 'Completar inscripción' : 'Ver detalle'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
