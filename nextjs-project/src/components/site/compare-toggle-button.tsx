'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { isInCompare, toggleCompareId } from '@/lib/browser-product-lists';
import { cn } from '@/lib/utils';

interface CompareToggleButtonProps {
  productId: string;
  compact?: boolean;
  isSprintTheme?: boolean;
}

export function CompareToggleButton({ productId, compact = false, isSprintTheme = false }: CompareToggleButtonProps) {
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(isInCompare(productId));
  }, [productId]);

  const label = useMemo(() => (selected ? 'В сравнении' : 'Сравнить'), [selected]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const result = toggleCompareId(productId);
          setSelected(result.isSelected);
          setError(result.error ?? null);
        }}
        className={cn(
          'desktop-secondary-button-scale inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition-colors',
          selected
            ? isSprintTheme
              ? 'border-[#7AA2FF] bg-[#7AA2FF]/20 text-[#C8DAFF]'
              : 'border-action-blue bg-highlight-blue text-text'
            : isSprintTheme
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-[#7AA2FF] hover:text-[#9AB8FF]'
              : 'border-gray-300 bg-white text-text hover:border-action-blue hover:text-action-blue',
          compact ? 'min-h-[34px]' : 'min-h-[36px]'
        )}
      >
        {label}
      </button>
      {selected && (
        <Link
          href="/compare"
          className={cn('desktop-microtext-scale hover:underline', isSprintTheme ? 'text-[#9AB8FF]' : 'text-action-blue')}
        >
          открыть
        </Link>
      )}
      {error && <span className="desktop-microtext-scale text-red-600">{error}</span>}
    </div>
  );
}
