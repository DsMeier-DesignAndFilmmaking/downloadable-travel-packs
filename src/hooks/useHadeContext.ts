import { useContext } from 'react';
import { HadeCtx } from '@/context/HadeProvider';
import type { HadeContext } from '@/context/HadeContext';

export function useHadeContext(): HadeContext {
  const ctx = useContext(HadeCtx);
  if (!ctx) {
    throw new Error('useHadeContext must be used within a HadeProvider');
  }
  return ctx;
}
