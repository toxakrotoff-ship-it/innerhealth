// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCdnFallbackScript } from './cdn-fallback'

const CDN = 'https://cdn.example.test'

async function loadCdnModules(cdnUrl: string) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_CDN_URL', cdnUrl)
  const cdn = await import('./cdn')
  const loader = (await import('./next-image-cdn-loader')).default
  return { ...cdn, loader }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('toCdnUrl', () => {
  it('prefixes /uploads/* with the CDN origin and trims trailing slash', async () => {
    const { toCdnUrl } = await loadCdnModules(`${CDN}/`)
    expect(toCdnUrl('/uploads/products/a.png')).toBe(`${CDN}/uploads/products/a.png`)
  })

  it('leaves other paths, external URLs and empty values untouched', async () => {
    const { toCdnUrl } = await loadCdnModules(CDN)
    expect(toCdnUrl('/images/hero.png')).toBe('/images/hero.png')
    expect(toCdnUrl('https://static.tildacdn.com/x.png')).toBe('https://static.tildacdn.com/x.png')
    expect(toCdnUrl(null)).toBeNull()
    expect(toCdnUrl(undefined)).toBeUndefined()
  })

  it('is a no-op when NEXT_PUBLIC_CDN_URL is empty', async () => {
    const { toCdnUrl } = await loadCdnModules('')
    expect(toCdnUrl('/uploads/a.png')).toBe('/uploads/a.png')
  })
})

describe('cdnImageLoader', () => {
  it('moves uploads to the CDN and keeps width in the query', async () => {
    const { loader } = await loadCdnModules(CDN)
    expect(loader({ src: '/uploads/a.png', width: 640 })).toBe(`${CDN}/uploads/a.png?w=640`)
    expect(loader({ src: '/images/b.png', width: 828 })).toBe('/images/b.png?w=828')
    expect(loader({ src: 'https://static.tildacdn.com/c.png', width: 640 })).toBe(
      'https://static.tildacdn.com/c.png'
    )
  })
})

describe('buildCdnFallbackScript', () => {
  const originalSetAttribute = Element.prototype.setAttribute
  const descriptors = [
    [HTMLScriptElement.prototype, 'src'],
    [HTMLLinkElement.prototype, 'href'],
    [HTMLImageElement.prototype, 'src'],
    [HTMLImageElement.prototype, 'srcset'],
    [HTMLSourceElement.prototype, 'srcset'],
  ] as const
  const saved = descriptors.map(([proto, prop]) => Object.getOwnPropertyDescriptor(proto, prop)!)

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    Element.prototype.setAttribute = originalSetAttribute
    descriptors.forEach(([proto, prop], i) => Object.defineProperty(proto, prop, saved[i]))
  })

  function run() {
    new Function(buildCdnFallbackScript(CDN))()
  }

  it('retries a failed CDN image from origin and disables CDN when the probe fails', () => {
    run()
    const img = document.createElement('img')
    img.setAttribute('src', `${CDN}/uploads/a.png?w=640`)
    img.setAttribute('srcset', `${CDN}/uploads/a.png?w=640 1x, ${CDN}/uploads/a.png?w=1080 2x`)
    document.body.appendChild(img)

    img.dispatchEvent(new Event('error'))

    expect(img.getAttribute('src')).toBe('/uploads/a.png?w=640')
    expect(img.getAttribute('srcset')).toBe('/uploads/a.png?w=640 1x, /uploads/a.png?w=1080 2x')
    expect(localStorage.getItem('ih_cdn_off')).toBeNull()

    vi.advanceTimersByTime(5000) // probe times out → CDN unreachable
    expect(localStorage.getItem('ih_cdn_off')).not.toBeNull()

    const chunk = document.createElement('script')
    chunk.src = `${CDN}/_next/static/chunks/x.js`
    expect(chunk.getAttribute('src')).toBe('/_next/static/chunks/x.js')
  })

  it('replaces a failed CDN script with an origin copy', () => {
    run()
    const script = document.createElement('script')
    script.setAttribute('src', `${CDN}/_next/static/chunks/a.js`)
    script.setAttribute('async', '')
    document.head.appendChild(script)

    script.dispatchEvent(new Event('error'))

    const scripts = document.head.querySelectorAll('script[src]')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].getAttribute('src')).toBe('/_next/static/chunks/a.js')
    expect(scripts[0].hasAttribute('async')).toBe(true)
  })

  it('rewrites existing CDN tags on start when CDN was disabled recently', () => {
    localStorage.setItem('ih_cdn_off', String(Date.now()))
    document.head.innerHTML = `<link rel="stylesheet" href="${CDN}/_next/static/chunks/a.css">`
    run()
    expect(document.head.querySelector('link')!.getAttribute('href')).toBe('/_next/static/chunks/a.css')
  })

  it('does not touch non-CDN resources', () => {
    run()
    const img = document.createElement('img')
    img.setAttribute('src', '/images/a.png')
    document.body.appendChild(img)
    img.dispatchEvent(new Event('error'))
    vi.advanceTimersByTime(10000)
    expect(img.getAttribute('src')).toBe('/images/a.png')
    expect(localStorage.getItem('ih_cdn_off')).toBeNull()
  })
})
