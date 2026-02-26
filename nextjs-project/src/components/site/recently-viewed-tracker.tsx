'use client';

import { useEffect } from 'react';
import { pushRecentlyViewedId } from '@/lib/browser-product-lists';

interface RecentlyViewedTrackerProps {
  productId: string;
}

export function RecentlyViewedTracker({ productId }: RecentlyViewedTrackerProps) {
  useEffect(() => {
    pushRecentlyViewedId(productId);
  }, [productId]);

  return null;
}
