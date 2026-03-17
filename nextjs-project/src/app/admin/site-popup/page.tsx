import type { JSONContent } from '@tiptap/core'
import { loadSitePopup } from './actions'
import { SitePopupForm } from './site-popup-form'

export const dynamic = 'force-dynamic'

export default async function AdminSitePopupPage() {
  const popup = await loadSitePopup()

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Попап на главной</h1>
        <p className="text-gray-500 text-sm mb-6">
          Настройте всплывающий попап на главной странице: контент, кнопку и поведение показа.
        </p>
        <SitePopupForm
          initialValue={{
            ...popup,
            richJson: (popup.richJson as JSONContent | null) ?? null,
          }}
        />
      </div>
    </div>
  )
}

