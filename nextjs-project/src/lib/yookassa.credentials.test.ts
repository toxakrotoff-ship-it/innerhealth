import { afterEach, describe, expect, it } from 'vitest'
import {
  assertYookassaCredentialsAllowedForEnvironment,
  isYookassaTestSecretKey,
  requireYookassaCredentials,
} from './yookassa'

describe('requireYookassaCredentials', () => {
  it('returns trimmed credentials when both fields are present', () => {
    expect(
      requireYookassaCredentials({
        shopId: ' 12345 ',
        secretKey: ' live_abc ',
      })
    ).toEqual({ shopId: '12345', secretKey: 'live_abc' })
  })

  it('throws when credentials are missing instead of falling back to env', () => {
    const prevShop = process.env.YOOKASSA_SHOP_ID
    const prevSecret = process.env.YOOKASSA_SECRET_KEY
    process.env.YOOKASSA_SHOP_ID = 'env-shop'
    process.env.YOOKASSA_SECRET_KEY = 'test_env_secret'

    expect(() => requireYookassaCredentials(undefined)).toThrow(/required/i)
    expect(() => requireYookassaCredentials(null)).toThrow(/required/i)
    expect(() => requireYookassaCredentials({ shopId: '', secretKey: 'live_x' })).toThrow(
      /required/i
    )

    process.env.YOOKASSA_SHOP_ID = prevShop
    process.env.YOOKASSA_SECRET_KEY = prevSecret
  })
})

describe('isYookassaTestSecretKey', () => {
  it('detects test_ prefix', () => {
    expect(isYookassaTestSecretKey('test_abc')).toBe(true)
    expect(isYookassaTestSecretKey(' live_abc ')).toBe(false)
  })
})

describe('assertYookassaCredentialsAllowedForEnvironment', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalAllowTest = process.env.YOOKASSA_ALLOW_TEST_KEYS

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalAllowTest === undefined) delete process.env.YOOKASSA_ALLOW_TEST_KEYS
    else process.env.YOOKASSA_ALLOW_TEST_KEYS = originalAllowTest
  })

  it('blocks test keys in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.YOOKASSA_ALLOW_TEST_KEYS

    expect(() =>
      assertYookassaCredentialsAllowedForEnvironment({
        shopId: '1',
        secretKey: 'test_secret',
      })
    ).toThrow(/test credentials/i)
  })

  it('allows live keys in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.YOOKASSA_ALLOW_TEST_KEYS

    expect(() =>
      assertYookassaCredentialsAllowedForEnvironment({
        shopId: '1',
        secretKey: 'live_secret',
      })
    ).not.toThrow()
  })

  it('allows test keys when YOOKASSA_ALLOW_TEST_KEYS=1', () => {
    process.env.NODE_ENV = 'production'
    process.env.YOOKASSA_ALLOW_TEST_KEYS = '1'

    expect(() =>
      assertYookassaCredentialsAllowedForEnvironment({
        shopId: '1',
        secretKey: 'test_secret',
      })
    ).not.toThrow()
  })
})
