'use client';

import { useEffect } from 'react';

/**
 * Показывает стандартный диалог браузера при обновлении/закрытии вкладки,
 * если передан isDirty === true (например, хотя бы одно поле формы заполнено).
 */
export function usePreventLeaveWhenDirty(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
