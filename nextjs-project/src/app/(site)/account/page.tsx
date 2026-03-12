import { AccountDashboard } from '@/components/site/account/account-dashboard'
import { VerifyEmailBanner } from '@/components/site/account/verify-email-banner'
import { requireUserPageSession } from '@/lib/auth/require-user-page-session'
import { getAccountDashboard } from '@/services/account.service'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await requireUserPageSession()
  const dashboard = await getAccountDashboard(session.user.id as string)

  const userDisplayName = session.user.name ?? dashboard.user?.email ?? 'Пользователь'
  const userEmail = session.user.email ?? dashboard.user?.email ?? ''

  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <div className="mx-auto max-w-280 space-y-6">
        {!session.user.isEmailVerified ? <VerifyEmailBanner /> : null}
        <AccountDashboard
          userName={userDisplayName}
          userEmail={userEmail}
          orderCount={dashboard.stats.orderCount}
          totalSpent={dashboard.stats.totalSpent}
          userRole={session.user.role}
        />
      </div>
    </AdaptiveContainer>
  )
}
