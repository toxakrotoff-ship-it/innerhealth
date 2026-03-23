import { describe, expect, it } from 'vitest'
import { getPostPath, getPostPathByType } from '@/lib/post-url'

describe('getPostPathByType', () => {
  it('returns article route for article type', () => {
    expect(getPostPathByType('article', 'my-post')).toBe('/informaciya/my-post')
  })

  it('returns news route for non-article type', () => {
    expect(getPostPathByType('news', 'my-post')).toBe('/news/my-post')
  })
})

describe('getPostPath', () => {
  it('builds path from post object', () => {
    expect(getPostPath({ type: 'article', slug: 'abc' })).toBe('/informaciya/abc')
  })
})
