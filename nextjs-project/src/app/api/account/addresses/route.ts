import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserSession } from '@/lib/auth/require-user-session'
import { createUserAddressBodySchema } from '@/lib/validations/user-address'
import {
  USER_ADDRESS_ERROR_CODES,
  type UserAddressServiceError,
  createUserAddress,
  listUserAddresses,
} from '@/services/user-address.service'

function isUserAddressServiceError(error: unknown): error is UserAddressServiceError {
  if (!error || typeof error !== 'object') return false
  return 'code' in error
}

export async function GET() {
  const session = await requireUserSession({ requiresVerifiedEmail: true })
  if (session instanceof NextResponse) return session

  try {
    const addresses = await listUserAddresses(session.user.id as string)
    return NextResponse.json(addresses)
  } catch (error) {
    console.error('[account/addresses] Failed to fetch addresses:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireUserSession({ requiresVerifiedEmail: true })
  if (session instanceof NextResponse) return session

  let payload: z.infer<typeof createUserAddressBodySchema>
  try {
    payload = createUserAddressBodySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const address = await createUserAddress(session.user.id as string, payload)
    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    if (
      isUserAddressServiceError(error) &&
      error.code === USER_ADDRESS_ERROR_CODES.addressLimitExceeded
    ) {
      return NextResponse.json({ error: 'Address limit exceeded' }, { status: 409 })
    }
    console.error('[account/addresses] Failed to create address:', error)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}
