import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as partnerService from '@/services/partner.service';
import { PartnerStatsContent } from './partner-stats-content';
import { PartnerTelegramBlock } from './partner-telegram-block';
import { PartnerMaxBlock } from './partner-max-block';
import { headers } from 'next/headers';
import { resolveBrand } from '@/lib/brand/brand';
import { AccountBrandSwitcher } from '@/components/site/account/account-brand-switcher';

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
  const headersStore = await headers();
  const activeBrand = resolveBrand({
    forwardedBrand: headersStore.get('x-brand'),
    host: headersStore.get('x-forwarded-host') || headersStore.get('host'),
  });

  const totalOrders = stats.reduce((s, x) => s + x.ordersCount, 0);
  const totalIncome = stats.reduce((s, x) => s + x.partnerIncome, 0);

  return (
    <div className="mx-auto max-w-[min(70rem,92vw)] px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <AccountBrandSwitcher activeBrand={activeBrand} />
        <h1 className="text-xl sm:text-2xl font-semibold text-text">Партнёрская программа</h1>
        <p className="text-sm text-gray-600">
          Статистика по вашим промокодам: применение промокода, оплаченные заказы и ваш доход.
        </p>
        <PartnerTelegramBlock />
        <PartnerMaxBlock />
        <PartnerStatsContent
          stats={stats}
          totalOrders={totalOrders}
          totalIncome={totalIncome}
        />
      </div>
    </div>
  );
}
