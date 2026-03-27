import {
  AccountAddressesManager,
  type AccountAddress,
} from '@/components/site/account/account-addresses-manager'
import Link from 'next/link'
import { requireUserPageSession } from '@/lib/auth/require-user-page-session'
import { listUserAddresses } from '@/services/user-address.service'

export const dynamic = 'force-dynamic'

export default async function AccountAddressesPage() {
  const session = await requireUserPageSession({ requiresVerifiedEmail: true })
  const addresses = await listUserAddresses(session.user.id as string)
  const accountAddresses = addresses
    .filter(
      (address): address is typeof address & { deliveryMethod: 'cdek_pvz' | 'cdek_door' } =>
        address.deliveryMethod === 'cdek_pvz' || address.deliveryMethod === 'cdek_door'
    )
    .map(
      (address): AccountAddress => ({
        ...address,
        deliveryMethod: address.deliveryMethod,
      })
    )

  return (
    <div className="mx-auto max-w-[min(70rem,92vw)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-text">Мои адреса</h1>
        <Link
          href="/account"
          className="rounded-full border border-gray-300 bg-white px-4 py-2 min-h-[40px] inline-flex items-center justify-center text-sm font-medium text-text transition hover:border-action-blue"
        >
          Вернуться в профиль
        </Link>
      </div>
      <AccountAddressesManager initialAddresses={accountAddresses} />
    </div>
  )
}
