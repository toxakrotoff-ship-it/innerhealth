/** @vitest-environment jsdom */
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { CdekManualDelivery } from './cdek-manual-delivery'
import type { CdekPvzOption } from './delivery-section'

const pvz: CdekPvzOption = {
  code: 'SKT5',
  full_address: 'Россия, Республика Коми, Сыктывкар, ул. Первомайская, 40',
}

function DeliveryHarness() {
  const [selectedPvz, setSelectedPvz] = useState<CdekPvzOption | null>(null)

  return (
    <CdekManualDelivery
      brandId="inner"
      items={[{ productId: 'product-1', quantity: 1 }]}
      deliveryMethod="cdek_pvz"
      selectedCity={{ code: 404, city: 'Сыктывкар' }}
      selectedPvz={selectedPvz}
      onCitySelect={() => {}}
      onPvzChosen={({ pvz: chosen }) => setSelectedPvz(chosen)}
      onPvzClear={() => setSelectedPvz(null)}
      onDoorReady={() => {}}
      onStreetChosen={() => {}}
    />
  )
}

describe('manual CDEK pickup selection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the selected point in the field and lets the customer choose another', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const payload = String(input).includes('/api/cdek/deliverypoints')
        ? { deliveryPoints: [pvz], source: 'cache' }
        : { tariffs: [{ tariffCode: 136, deliverySum: 440, periodMin: 3, periodMax: 4 }] }
      return new Response(JSON.stringify(payload), { status: 200 })
    }))

    const { container } = render(<DeliveryHarness />)
    const field = container.querySelector('#cdek-manual-pvz-search') as HTMLInputElement
    await waitFor(() => expect(container.querySelector('[role="list"] button')?.textContent).toContain('Первомайская, 40'))
    const pointButton = container.querySelector('[role="list"] button') as HTMLButtonElement
    await waitFor(() => expect(pointButton.disabled).toBe(false))

    fireEvent.click(pointButton)

    expect(field.value).toContain('Первомайская, 40')
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Пункт выдачи выбран: SKT5')
    expect(container.querySelector('[role="list"]')).toBeNull()

    const changeButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Изменить')
    fireEvent.click(changeButton!)

    expect(field.value).toBe('')
    expect(container.querySelector('[role="list"]')).toBeTruthy()
  })
})
