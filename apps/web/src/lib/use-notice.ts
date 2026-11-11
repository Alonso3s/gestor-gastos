import { useCallback, useEffect, useState } from 'react';

const NOTICE_DURATION_MS = 4000;

export interface Notice {
  variant: 'success' | 'error';
  message: string;
}

/** Mensaje de feedback temporal (éxito o error) que se oculta solo. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [notice]);

  const showSuccess = useCallback(
    (message: string) => setNotice({ variant: 'success', message }),
    [],
  );
  const showError = useCallback((message: string) => setNotice({ variant: 'error', message }), []);

  return { notice, showSuccess, showError };
}
