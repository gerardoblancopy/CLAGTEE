import React, { createContext, useContext, useState, useCallback } from 'react';
import { RegistrationInput, RegistrationRecord } from '../../types';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  fileName: string;
}

interface ComprobantePayload {
  comprobanteFileKey?: string;
  comprobanteUrl?: string;
  comprobanteFileName?: string;
  transactionCode?: string;
}

interface RegistrationContextValue {
  registration: RegistrationRecord | null;
  step: 'form' | 'summary';
  isSubmitting: boolean;
  error: string | null;
  createRegistration: (input: RegistrationInput) => Promise<boolean>;
  submitComprobante: (payload: ComprobantePayload) => Promise<boolean>;
  loadByToken: (id: string, token: string) => Promise<boolean>;
  uploadFile: (file: File, prefix: string) => Promise<UploadResult>;
  reset: () => void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registration, setRegistration] = useState<RegistrationRecord | null>(null);
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, prefix: string): Promise<UploadResult> => {
    const signResponse = await fetch('/api/gcs-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        prefix,
      }),
    });
    if (!signResponse.ok) throw new Error('sign-upload-failed');
    const signed = (await signResponse.json()) as {
      uploadUrl: string;
      fileKey: string;
      publicUrl?: string;
    };
    const putResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!putResponse.ok) throw new Error('upload-failed');
    return { fileKey: signed.fileKey, fileUrl: signed.publicUrl || '', fileName: file.name };
  }, []);

  const createRegistration = useCallback(async (input: RegistrationInput): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        let code = 'create-failed';
        try {
          const body = (await response.json()) as { code?: string };
          if (typeof body?.code === 'string') code = body.code;
        } catch {
          // ignore, keep generic code
        }
        setError(code);
        return false;
      }
      const data = (await response.json()) as { registration: RegistrationRecord };
      setRegistration(data.registration);
      setStep('summary');
      return true;
    } catch {
      setError('create-failed');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const submitComprobante = useCallback(
    async (payload: ComprobantePayload): Promise<boolean> => {
      if (!registration) return false;
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch('/api/registrations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: registration.id, token: registration.token, ...payload }),
        });
        if (!response.ok) {
          setError('comprobante-failed');
          return false;
        }
        const data = (await response.json()) as { registration: RegistrationRecord };
        setRegistration(data.registration);
        return true;
      } catch {
        setError('comprobante-failed');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [registration]
  );

  const loadByToken = useCallback(async (id: string, token: string): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/registrations?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`
      );
      if (!response.ok) {
        setError('not-found');
        return false;
      }
      const data = (await response.json()) as { registration: RegistrationRecord };
      setRegistration(data.registration);
      setStep('summary');
      return true;
    } catch {
      setError('not-found');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRegistration(null);
    setStep('form');
    setError(null);
  }, []);

  return (
    <RegistrationContext.Provider
      value={{
        registration,
        step,
        isSubmitting,
        error,
        createRegistration,
        submitComprobante,
        loadByToken,
        uploadFile,
        reset,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = (): RegistrationContextValue => {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
};
