'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';

export default function AdminOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const base = useAdminBasePath();
  const pathname = usePathname();
  const ordersHref = `/${base}/orders`;
  const reportHref = `/${base}/orders/promo-report`;
  const isReport = pathname.startsWith(reportHref);

  return (
    <>
      <div className="admin-container pb-0">
        <div className="admin-content">
          <nav
            className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm mb-4"
            aria-label="Раздел заказов"
          >
            <Link
              href={ordersHref}
              className={`px-3 py-1.5 rounded-md ${
                !isReport ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Заказы
            </Link>
            <Link
              href={reportHref}
              className={`px-3 py-1.5 rounded-md ${
                isReport ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Отчёт по промокодам
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
