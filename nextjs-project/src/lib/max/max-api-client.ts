import { Bot } from '@maxhub/max-bot-api'
import { rootCertificates } from 'node:tls'
import { Agent, getGlobalDispatcher, setGlobalDispatcher, type Dispatcher } from 'undici'
import { RUSSIAN_TRUSTED_ROOT_CA } from './russian-trusted-root-ca'

const MAX_API_ORIGIN = 'https://platform-api2.max.ru'
const TLS_STATE = Symbol.for('innerhealth.max-api-tls')

/** Preserve the existing transport and trust settings for every other origin. */
export function withMaxApiDispatcher(current: Dispatcher, max: Dispatcher): Dispatcher {
  return current.compose((dispatch) => (options, handler) => {
    const origin = options.origin ? new URL(options.origin).origin : ''
    return origin === MAX_API_ORIGIN
      ? max.dispatch(options, handler)
      : dispatch(options, handler)
  })
}

function configureMaxApiTls(): void {
  const current = getGlobalDispatcher()
  const state = Reflect.get(globalThis, TLS_STATE) as
    | { dispatcher: Dispatcher; agent: Agent }
    | undefined
  if (state?.dispatcher === current) return

  const agent = state?.agent ?? new Agent({
    connect: { ca: [...rootCertificates, RUSSIAN_TRUSTED_ROOT_CA] },
  })
  const dispatcher = withMaxApiDispatcher(current, agent)
  setGlobalDispatcher(dispatcher)
  Reflect.set(globalThis, TLS_STATE, { dispatcher, agent })
}

export function createMaxBot(token: string): Bot {
  configureMaxApiTls()
  return new Bot(token)
}
