interface OrderStatusPresentation {
  label: string;
  badgeClassName: string;
}

/**
 * Returns unified admin UI presentation for order status values.
 */
export function getOrderStatusPresentation(status: string): OrderStatusPresentation {
  const statusMap: Record<string, string> = {
    pending: 'В обработке',
    paid: 'Оплачен',
    completed: 'Завершен',
    cancelled: 'Отменен',
    canceled: 'Отменен',
    shipped: 'Отправлен',
  };

  if (status === 'paid' || status === 'completed') {
    return {
      label: statusMap[status] ?? status,
      badgeClassName: 'bg-green-100 text-green-800',
    };
  }

  if (status === 'pending') {
    return {
      label: statusMap[status] ?? status,
      badgeClassName: 'bg-amber-100 text-amber-800',
    };
  }

  if (status === 'cancelled' || status === 'canceled') {
    return {
      label: statusMap[status] ?? status,
      badgeClassName: 'bg-red-100 text-red-800',
    };
  }

  return {
    label: statusMap[status] ?? status,
    badgeClassName: 'bg-gray-100 text-gray-800',
  };
}
