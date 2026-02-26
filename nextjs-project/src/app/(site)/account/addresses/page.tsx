import {
  AccountAddressesManager,
  type AccountAddress,
} from '@/components/site/account/account-addresses-manager'
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
      <AccountAddressesManager initialAddresses={accountAddresses} />
    </div>
  )
}
