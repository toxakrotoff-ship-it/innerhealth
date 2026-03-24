'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { isInCompare, toggleCompareId } from '@/lib/browser-product-lists';

interface CompareToggleButtonProps {
  productId: string;
  compact?: boolean;
}

export function CompareToggleButton({ productId, compact = false }: CompareToggleButtonProps) {
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
        className={`desktop-secondary-button-scale inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
          selected
            ? 'border-action-blue bg-highlight-blue text-text'
            : 'border-gray-300 bg-white text-text hover:border-action-blue hover:text-action-blue'
        } ${compact ? 'min-h-[34px]' : 'min-h-[36px]'}`}
      >
        {label}
      </button>
      {selected && (
        <Link href="/compare" className="desktop-microtext-scale text-action-blue hover:underline">
          открыть
        </Link>
      )}
      {error && <span className="desktop-microtext-scale text-red-600">{error}</span>}
    </div>
  );
}
