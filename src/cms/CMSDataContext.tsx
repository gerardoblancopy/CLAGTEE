import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './api';

export type PaperStatus = 'pending' | 'under-review' | 'accepted' | 'rejected' | 'withdrawn';

export interface AuthorEntry {
  name: string;
  email: string;
  affiliation: string;
}

export interface ReviewEntry {
  id: string;
  reviewerId: string;
  score: number;
  confidence: number;
  recommendation: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  comments: string;
  submittedAt: string;
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  authors: AuthorEntry[];
  track: string;
  status: PaperStatus;
  submitterId: string;
  submittedAt: string;
  updatedAt: string;
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
  revisedFileName?: string;
  revisedFileUrl?: string;
  revisedFileKey?: string;
  revisedAt?: string;
  revisionNote?: string;
  assignedReviewerIds: string[];
  reviews: ReviewEntry[];
}

export interface RevisionInput {
  fileName: string;
  fileUrl?: string;
  fileKey: string;
  revisionNote?: string;
}

export interface PaperInput {
  title: string;
  abstract: string;
  keywords: string;
  authors: AuthorEntry[];
  track: string;
  fileName?: string;
  fileUrl?: string;
  fileKey?: string;
}

export interface EmailResult {
  emailSent: boolean;
  emailError: string | null;
  papersCount?: number;
}

interface CMSDataContextType {
  papers: Paper[];
  isLoading: boolean;
  error: string | null;
  refreshPapers: () => Promise<void>;
  createPaper: (input: PaperInput) => Promise<Paper | null>;
  updatePaper: (paperId: string, input: PaperInput) => Promise<Paper | null>;
  submitRevision: (paperId: string, input: RevisionInput) => Promise<Paper | null>;
  assignReviewer: (paperId: string, reviewerId: string) => Promise<EmailResult | null>;
  notifyReviewerAssignments: (reviewerId: string) => Promise<EmailResult | null>;
  unassignReviewer: (paperId: string, reviewerId: string) => Promise<void>;
  submitReview: (
    paperId: string,
    review: Omit<ReviewEntry, 'id' | 'submittedAt'>,
    status?: PaperStatus
  ) => Promise<void>;
  setDecision: (paperId: string, status: PaperStatus) => Promise<void>;
  withdrawPaper: (paperId: string) => Promise<void>;
  deletePaper: (paperId: string) => Promise<void>;
}

const CMSDataContext = createContext<CMSDataContextType | undefined>(undefined);

const upsertPaper = (papers: Paper[], next: Paper) => {
  const index = papers.findIndex((paper) => paper.id === next.id);
  if (index >= 0) {
    const updated = [...papers];
    updated[index] = next;
    return updated;
  }
  return [next, ...papers];
};

export const CMSDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El servidor decide que trabajos devuelve segun la sesion: el autor los
  // suyos, el revisor los asignados, chair/staff todos.
  const refreshPapers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers');
      if (!response.ok) {
        throw new Error('No se pudieron cargar los trabajos.');
      }
      const payload = (await response.json()) as { papers: Paper[] };
      setPapers(payload.papers || []);
    } catch (fetchError) {
      setError('No se pudieron cargar los trabajos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setPapers([]);
      return;
    }

    void refreshPapers();

    const interval = window.setInterval(() => {
      void refreshPapers();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [user?.id, user?.role]);

  const createPaper = async (input: PaperInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!response.ok) {
        throw new Error('No se pudo crear el trabajo.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
      return payload.paper;
    } catch (fetchError) {
      setError('No se pudo crear el trabajo.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePaper = async (paperId: string, input: PaperInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, input }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'No se pudo actualizar el trabajo.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
      return payload.paper;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'No se pudo actualizar el trabajo.';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const submitRevision = async (paperId: string, input: RevisionInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, input, action: 'revision' }),
      });
      if (!response.ok) {
        throw new Error('No se pudo enviar la version revisada.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
      return payload.paper;
    } catch (fetchError) {
      setError('No se pudo enviar la version revisada.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const assignReviewer = async (paperId: string, reviewerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/assign-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, reviewerId }),
      });
      if (!response.ok) {
        throw new Error('No se pudo asignar el revisor.');
      }
      const payload = (await response.json()) as {
        paper: Paper;
        emailSent?: boolean;
        emailError?: string | null;
      };
      setPapers((prev) => upsertPaper(prev, payload.paper));
      return {
        emailSent: Boolean(payload.emailSent),
        emailError: payload.emailError || null,
      };
    } catch (fetchError) {
      setError('No se pudo asignar el revisor.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Reenvio manual del aviso con todos los trabajos ya asignados al revisor.
  const notifyReviewerAssignments = async (reviewerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/assign-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId, action: 'notify' }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        emailSent?: boolean;
        emailError?: string | null;
        papersCount?: number;
      };
      return {
        emailSent: Boolean(payload.emailSent),
        emailError: payload.emailError || null,
        papersCount: payload.papersCount || 0,
      };
    } catch (fetchError) {
      setError('No se pudo enviar el aviso al revisor.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const unassignReviewer = async (paperId: string, reviewerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/assign-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, reviewerId, action: 'unassign' }),
      });
      if (!response.ok) {
        throw new Error('No se pudo quitar el revisor.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
    } catch (fetchError) {
      setError('No se pudo quitar el revisor.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitReview = async (
    paperId: string,
    review: Omit<ReviewEntry, 'id' | 'submittedAt'>,
    status?: PaperStatus
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, review, status }),
      });
      if (!response.ok) {
        throw new Error('No se pudo guardar la evaluacion.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
    } catch (fetchError) {
      setError('No se pudo guardar la evaluacion.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDecision = async (paperId: string, status: PaperStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, status }),
      });
      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
    } catch (fetchError) {
      setError('No se pudo actualizar el estado.');
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawPaper = async (paperId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      });
      if (!response.ok) {
        throw new Error('No se pudo retirar el trabajo.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
    } catch (fetchError) {
      setError('No se pudo retirar el trabajo.');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePaper = async (paperId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/papers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      });
      if (!response.ok) {
        throw new Error('No se pudo eliminar el trabajo.');
      }
      setPapers((prev) => prev.filter((paper) => paper.id !== paperId));
    } catch (fetchError) {
      setError('No se pudo eliminar el trabajo.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      papers,
      isLoading,
      error,
      refreshPapers,
      createPaper,
      updatePaper,
      submitRevision,
      assignReviewer,
      notifyReviewerAssignments,
      unassignReviewer,
      submitReview,
      setDecision,
      withdrawPaper,
      deletePaper,
    }),
    [papers, isLoading, error]
  );

  return <CMSDataContext.Provider value={value}>{children}</CMSDataContext.Provider>;
};

export const useCMSData = () => {
  const context = useContext(CMSDataContext);
  if (!context) {
    throw new Error('useCMSData must be used within a CMSDataProvider');
  }
  return context;
};
