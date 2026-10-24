import { X509Certificate } from 'node:crypto'
import { Agent, getGlobalDispatcher, setGlobalDispatcher, type Dispatcher } from 'undici'
import { afterEach, expect, it, vi } from 'vitest'
import { createMaxBot, withMaxApiDispatcher } from './max-api-client'
import { RUSSIAN_TRUSTED_ROOT_CA } from './russian-trusted-root-ca'

const originalDispatcher = getGlobalDispatcher()
const agents: Agent[] = []

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setGlobalDispatcher(originalDispatcher)
  await Promise.all(agents.splice(0).map((agent) => agent.close()))
})

it.each([
  ['https://platform-api2.max.ru', true],
  ['https://api.yookassa.ru', false],
  ['https://api.cdek.ru', false],
  ['https://platform-api2.max.ru.example.test', false],
  ['http://platform-api2.max.ru', false],
  ['https://platform-api2.max.ru:8443', false],
])('uses the MAX certificate only for the exact HTTPS origin (%s)', (origin, isMax) => {
  const current = new Agent()
  const max = new Agent()
  agents.push(current, max)
  const currentDispatch = vi.spyOn(current, 'dispatch').mockReturnValue(true)
  const maxDispatch = vi.spyOn(max, 'dispatch').mockReturnValue(true)
  const dispatcher = withMaxApiDispatcher(current, max)
  const options: Dispatcher.DispatchOptions = { origin, path: '/me', method: 'GET' }
  dispatcher.dispatch(options, { onError: vi.fn() })
  expect(currentDispatch).toHaveBeenCalledTimes(isMax ? 0 : 1)
  expect(maxDispatch).toHaveBeenCalledTimes(isMax ? 1 : 0)
})

it('pins the official self-signed public root certificate', () => {
  const certificate = new X509Certificate(RUSSIAN_TRUSTED_ROOT_CA)
  expect(certificate.ca).toBe(true)
  expect(certificate.verify(certificate.publicKey)).toBe(true)
  expect(certificate.fingerprint256.replaceAll(':', '')).toBe(
    'D26D2D0231B7C39F92CC738512BA54103519E4405D68B5BD703E9788CA8ECF31'
  )
})

it('uses SDK v2 with header authentication and configures the dispatcher once', async () => {
  const info = { user_id: 123, first_name: 'Test', is_bot: true, last_activity_time: 0 }
  const fetchMock = vi.fn(async () => Response.json(info))
  vi.stubGlobal('fetch', fetchMock)
  const bot = createMaxBot('test-token-no-network')
  const configuredDispatcher = getGlobalDispatcher()
  createMaxBot('second-test-token-no-network')
  expect(getGlobalDispatcher()).toBe(configuredDispatcher)
  await expect(bot.api.getMyInfo()).resolves.toEqual(info)
  expect(fetchMock).toHaveBeenCalledWith('https://platform-api2.max.ru/me', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'test-token-no-network' }),
  }))
})
