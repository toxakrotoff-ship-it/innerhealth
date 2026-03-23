interface PostUrlInput {
  slug: string
  type: string
}

/**
 * Returns public path for post by content type.
 */
export function getPostPathByType(type: string, slug: string): string {
  const basePath = type === 'article' ? '/informaciya' : '/news'
  return `${basePath}/${slug}`
}

/**
 * Returns public path for post object.
 */
export function getPostPath(post: PostUrlInput): string {
  return getPostPathByType(post.type, post.slug)
}
