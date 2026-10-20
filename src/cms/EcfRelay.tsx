import React, { useEffect, useState } from 'react';
import {
  CAMERA_READY_SUPPORT_EMAIL,
  ECF_RETURN_ORIGINS,
  EcfAuthor,
  IEEE_ECF_REGISTERED_ORIGIN,
  buildEcfFields,
  buildEcfReturnUrl,
  submitEcfForm,
} from './ieeeEcf';

// Página puente /ecf del dominio registrado ante IEEE (clagtee2026.vercel.app).
// Recibe en el fragmento (#ticket=...&return=...) el pase que emitió la API,
// lo canjea por los datos del paper y envía el formulario al eCF: así IEEE ve
// como Referer el dominio registrado aunque el autor venga de clagtee2026.org.
export const EcfRelay: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [returnOrigin, setReturnOrigin] = useState(IEEE_ECF_REGISTERED_ORIGIN);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    // El pase no debe quedar en el historial del navegador
    window.history.replaceState(null, '', window.location.pathname);

    const ticket = params.get('ticket') || '';
    const requestedReturn = params.get('return') || '';
    const origin = ECF_RETURN_ORIGINS.includes(requestedReturn) ? requestedReturn : IEEE_ECF_REGISTERED_ORIGIN;
    setReturnOrigin(origin);

    if (!ticket) {
      setError('Este enlace no es válido. Vuelve al CMS y pulsa "Firmar en IEEE (eCF)" desde tu artículo aceptado.');
      return;
    }

    fetch('/api/papers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ecf-redeem', ticket }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          paper?: { id: string; title: string; authors: EcfAuthor[] };
          signerEmail?: string;
        };
        if (!response.ok || !payload.paper) {
          throw new Error(payload.error || 'No se pudo preparar el formulario de IEEE.');
        }
        const { paper, signerEmail } = payload;
        submitEcfForm(
          buildEcfFields(
            { paperId: paper.id, title: paper.title, authors: paper.authors, signerEmail },
            buildEcfReturnUrl(paper.id, origin)
          )
        );
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-3">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-[#0D2C54]">No pudimos abrir el formulario de IEEE</h1>
            <p className="text-sm text-slate-600">{error}</p>
            <a
              href={`${returnOrigin}/cms`}
              className="inline-block px-4 py-2 rounded-xl bg-[#0D2C54] hover:bg-[#1A4B8A] text-white text-sm font-bold"
            >
              Volver al CMS
            </a>
            <p className="text-xs text-slate-500">
              Si el problema continúa, escríbenos a{' '}
              <a href={`mailto:${CAMERA_READY_SUPPORT_EMAIL}`} className="text-[#00629B] font-semibold hover:underline">
                {CAMERA_READY_SUPPORT_EMAIL}
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <span className="animate-spin inline-block w-8 h-8 border-4 border-[#00629B] border-t-transparent rounded-full" />
            <h1 className="text-lg font-bold text-[#0D2C54]">Conectando con el copyright de IEEE…</h1>
            <p className="text-sm text-slate-600">
              En unos segundos se abrirá el formulario oficial de IEEE (ecopyright.ieee.org) con los datos de tu artículo.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
