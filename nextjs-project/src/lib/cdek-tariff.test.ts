import { describe, expect, it } from 'vitest'
import { getNextTariff } from './cdek-tariff'

describe('getNextTariff', () => {
  it('returns first tariff when calculator has values', () => {
    const currentTariff = {
      deliverySum: 225,
      periodMin: 1,
      periodMax: 1,
      tariffCode: 136,
    }

    const result = getNextTariff({
      currentTariff,
      nextTariffs: [
        { deliverySum: 260, periodMin: 2, periodMax: 3, tariffCode: 136 },
        { deliverySum: 300, periodMin: 1, periodMax: 2, tariffCode: 138 },
      ],
      preserveCurrentOnEmpty: true,
    })

    expect(result).toEqual({ deliverySum: 260, periodMin: 2, periodMax: 3, tariffCode: 136 })
  })

  it('preserves chosen tariff when response is empty and preserve flag is on', () => {
    const currentTariff = {
      deliverySum: 225,
      periodMin: 1,
      periodMax: 1,
      tariffCode: 136,
    }

    const result = getNextTariff({
      currentTariff,
      nextTariffs: [],
      preserveCurrentOnEmpty: true,
    })

    expect(result).toEqual(currentTariff)
  })

  it('clears tariff when response is empty and preserve flag is off', () => {
    const result = getNextTariff({
      currentTariff: { deliverySum: 225, periodMin: 1, periodMax: 1, tariffCode: 136 },
      nextTariffs: [],
      preserveCurrentOnEmpty: false,
    })

    expect(result).toBeNull()
  })
})
