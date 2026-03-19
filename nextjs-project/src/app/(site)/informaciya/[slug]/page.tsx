import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Статейный URL под прежним префиксом: контент отдаётся страницей `/news/[slug]`.
 */
export default async function InformaciyaArticleAliasPage({ params }: PageProps) {
  const { slug } = await params
  redirect(`/news/${slug}`)
}
