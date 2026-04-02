import Link from 'next/link'
import { notFound } from 'next/navigation'
import { syncCdekTrackNumberIfDue } from '@/lib/cdek'
import {
  ACCOUNT_SERVICE_ERROR_CODES,
  type AccountServiceError,
  getUserOrderById,
} from '@/services/account.service'
import { requireUserPageSession } from '@/lib/auth/require-user-page-session'
import { getOrderStatusPresentation } from '@/lib/order-status-presentation'

function isAccountServiceError(error: unknown): error is AccountServiceError {
  if (!error || typeof error !== 'object') return false
  return 'code' in error
}

interface AccountOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function AccountOrderDetailPage({ params }: AccountOrderDetailPageProps) {
  const session = await requireUserPageSession({ requiresVerifiedEmail: true })
  const { id } = await params

  let order: Awaited<ReturnType<typeof getUserOrderById>>
  try {
    await syncCdekTrackNumberIfDue(id)
    order = await getUserOrderById(session.user.id as string, id)
  } catch (error) {
    if (isAccountServiceError(error) && error.code === ACCOUNT_SERVICE_ERROR_CODES.orderNotFound) {
      notFound()
    }
    throw error
  }

  const shipping = order.shippingInfo
  const statusPresentation = getOrderStatusPresentation(order.status)
  const shouldShowCdekTrackingBlock =
    shipping?.deliveryMethod === 'cdek_pvz' || shipping?.deliveryMethod === 'cdek_door'
  const shippingTitle = shipping?.deliveryMethod === 'pickup' ? 'Самовывоз' : 'Доставка'
  const emptyShippingText =
    shipping?.deliveryMethod === 'pickup'
      ? 'Информация о самовывозе недоступна.'
      : 'Информация о доставке недоступна.'
  const cdekTrackingLink = order.cdekTrackNumber
    ? `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(order.cdekTrackNumber)}`
    : null

  return (
    <div className="mx-auto max-w-[min(70rem,92vw)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">Заказ {order.id}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/account"
              className="rounded-full border border-gray-300 bg-white px-4 py-2 min-h-[40px] inline-flex items-center justify-center text-sm font-medium text-text transition hover:border-action-blue"
            >
              Вернуться в профиль
            </Link>
            <Link
              href="/account/orders"
              className="rounded-full border border-gray-300 bg-white px-4 py-2 min-h-[40px] inline-flex items-center justify-center text-sm font-medium text-text transition hover:border-action-blue"
            >
              К списку заказов
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Статус:</span>{' '}
            <span
              className={[
                'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
                statusPresentation.badgeClassName,
              ].join(' ')}
            >
              {statusPresentation.label}
            </span>
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Сумма:</span> {order.total.toFixed(2)} ₽
          </p>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-text">Товары</h2>
          <ul className="mt-3 space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="font-medium text-text">{item.product.title}</div>
                <div className="text-gray-700">
                  {item.quantity} × {item.price.toFixed(2)} ₽
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-text">{shippingTitle}</h2>
          {shipping ? (
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <p>{shipping.fullName}</p>
              <p>{shipping.phone}</p>
              <p>{shipping.city}</p>
              <p>{shipping.address}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">{emptyShippingText}</p>
          )}
        </div>

        {shouldShowCdekTrackingBlock ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-lg font-semibold text-text">Трекинг CDEK</h2>
            {order.cdekOrderError ? (
              <>
                <p className="mt-2 text-sm text-amber-700">{order.cdekOrderError}</p>
                {order.cdekOrderUuid ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Невалидный UUID CDEK: {order.cdekOrderUuid}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">UUID заказа CDEK:</span> {order.cdekOrderUuid ?? '—'}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-medium">Трек-номер:</span> {order.cdekTrackNumber ?? 'Ещё не присвоен'}
                </p>
              </>
            )}
            {cdekTrackingLink && !order.cdekOrderError ? (
              <a
                href={cdekTrackingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-action-blue hover:underline"
              >
                Отследить отправление
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
