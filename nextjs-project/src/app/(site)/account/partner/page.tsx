import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as partnerService from '@/services/partner.service';
import { PartnerStatsContent } from './partner-stats-content';

export const dynamic = 'force-dynamic';

export default async function AccountPartnerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }
  if (session.user.role !== 'PARTNER') {
    redirect('/account');
  }

  const stats = await partnerService.getPartnerStatsForPartner(session.user.id);

  const totalOrders = stats.reduce((s, x) => s + x.ordersCount, 0);
  const totalIncome = stats.reduce((s, x) => s + x.partnerIncome, 0);

  return (
    <div className="mx-auto max-w-[min(70rem,92vw)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text">Партнёрская программа</h1>
        <p className="text-sm text-gray-600">
          Статистика по вашим промокодам: количество заказов и ваш доход (процент от заказа).
        </p>
        <PartnerStatsContent
          stats={stats}
          totalOrders={totalOrders}
          totalIncome={totalIncome}
        />
      </div>
    </div>
  );
}
