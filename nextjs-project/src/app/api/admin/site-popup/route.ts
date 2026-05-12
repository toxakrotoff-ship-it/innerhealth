import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { updateSitePopup, type SitePopupFormInput } from '@/app/admin/site-popup/actions'

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const body = (await request.json()) as SitePopupFormInput
    const result = await updateSitePopup(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error ?? 'Validation failed' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SitePopup PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save popup' }, { status: 500 })
  }
}

