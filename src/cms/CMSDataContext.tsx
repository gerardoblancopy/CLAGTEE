import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User, useAuth } from './AuthContext';

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
  assignedReviewerIds: string[];
  reviews: ReviewEntry[];
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

interface CMSDataContextType {
  papers: Paper[];
  isLoading: boolean;
  error: string | null;
  refreshPapers: (options?: { submitterId?: string; reviewerId?: string }) => Promise<void>;
  createPaper: (input: PaperInput, submitter: User) => Promise<Paper | null>;
  assignReviewer: (paperId: string, reviewerId: string) => Promise<void>;
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

const buildQuery = (options?: { submitterId?: string; reviewerId?: string }) => {
  if (!options) return '';
  const params = new URLSearchParams();
  if (options.submitterId) params.set('submitterId', options.submitterId);
  if (options.reviewerId) params.set('reviewerId', options.reviewerId);
  const query = params.toString();
  return query ? `?${query}` : '';
};

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

  const refreshPapers = async (options?: { submitterId?: string; reviewerId?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/papers${buildQuery(options)}`);
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

    const options =
      user.role === 'author'
        ? { submitterId: user.id }
        : user.role === 'reviewer'
        ? { reviewerId: user.id }
        : undefined;

    void refreshPapers(options);

    const interval = window.setInterval(() => {
      void refreshPapers(options);
    }, 12000);

    return () => window.clearInterval(interval);
  }, [user?.id, user?.role]);

  const createPaper = async (input: PaperInput, submitter: User) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, submitter }),
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

  const assignReviewer = async (paperId: string, reviewerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/papers/assign-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, reviewerId }),
      });
      if (!response.ok) {
        throw new Error('No se pudo asignar el revisor.');
      }
      const payload = (await response.json()) as { paper: Paper };
      setPapers((prev) => upsertPaper(prev, payload.paper));
    } catch (fetchError) {
      setError('No se pudo asignar el revisor.');
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
      const response = await fetch('/api/papers/submit-review', {
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
      const response = await fetch('/api/papers/decision', {
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
      const response = await fetch('/api/papers/withdraw', {
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
      const response = await fetch('/api/papers/delete', {
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
      assignReviewer,
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
