import Link from 'next/link'
import type { BrandId } from '@/lib/brand/brand'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'

export interface AccountHeaderProps {
  readonly title: string
  readonly activeBrand: BrandId
}

export function AccountHeader({ title, activeBrand }: AccountHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={getBrandSiteUrl(activeBrand)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-gray-300 bg-white px-5 py-3 min-h-[44px] inline-flex items-center justify-center text-sm font-medium text-text transition hover:border-action-blue hover:text-action-blue"
        >
          На сайт
        </Link>
      </div>
    </div>
  )
}
