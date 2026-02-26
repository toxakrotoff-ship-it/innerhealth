import { accountOrdersQuerySchema } from '@/lib/validations/account'
import { requireUserPageSession } from '@/lib/auth/require-user-page-session'
import { getUserOrders } from '@/services/account.service'
import { AccountOrdersTable } from '@/components/site/account/account-orders-table'

interface AccountOrdersPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function AccountOrdersPage({ searchParams }: AccountOrdersPageProps) {
  const session = await requireUserPageSession({ requiresVerifiedEmail: true })
  const rawSearchParams = await searchParams
  const parsedQuery = accountOrdersQuerySchema.parse(rawSearchParams)
  const orders = await getUserOrders(session.user.id as string, parsedQuery)

  return (
    <div className="mx-auto max-w-[min(70rem,92vw)] px-4 py-10 sm:px-6 lg:px-8">
      <AccountOrdersTable
        items={orders.items}
        page={orders.pagination.page}
        totalPages={orders.pagination.totalPages}
      />
    </div>
  )
}
