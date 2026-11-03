import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'public/vendor/cdek-widget.umd.js'), 'utf8')

describe('vendored CDEK search callback', () => {
  it('calls the callback from the real search result handler with longitude first', () => {
    // Execute the shipped handler so removing the local vendor patch breaks this test.
    const start = source.indexOf('e=>{let r=Cs.GENERAL;')
    const end = source.indexOf('})(e)', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const onSearchLocation = vi.fn()
    const moveMap = vi.fn()
    runInNewContext(`(${source.slice(start, end + 1)})(result)`, {
      Cs: { GENERAL: 10, STREET: 15, HOME: 17 },
      Es: { DOOR: 'door' },
      ii: { LOCALITY: 'locality', HOUSE: 'house', ENTRANCE: 'entrance', STREET: 'street' },
      ai: { EXACT: 'exact', NUMBER: 'number' },
      n: { params: { hideDeliveryOptions: { door: false }, onSearchLocation }, debug: false },
      c: moveMap,
      result: { position: [39.7231, 43.5855], kind: 'locality', precision: 'other' },
    })
    expect(onSearchLocation).toHaveBeenCalledWith([39.7231, 43.5855])
    expect(moveMap).toHaveBeenCalledWith({ center: [39.7231, 43.5855], zoom: 10 })
  })
})
