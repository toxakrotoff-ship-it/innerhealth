import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserSession } from '@/lib/auth/require-user-session'
import { updateUserAddressBodySchema, userAddressParamsSchema } from '@/lib/validations/user-address'
import {
  USER_ADDRESS_ERROR_CODES,
  type UserAddressServiceError,
  deleteUserAddress,
  updateUserAddress,
} from '@/services/user-address.service'

function isUserAddressServiceError(error: unknown): error is UserAddressServiceError {
  if (!error || typeof error !== 'object') return false
  return 'code' in error
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUserSession({ requiresVerifiedEmail: true })
  if (session instanceof NextResponse) return session

  let parsedParams: z.infer<typeof userAddressParamsSchema>
  let payload: z.infer<typeof updateUserAddressBodySchema>

  try {
    parsedParams = userAddressParamsSchema.parse(await params)
    payload = updateUserAddressBodySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid request'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const address = await updateUserAddress(session.user.id as string, parsedParams.id, payload)
    return NextResponse.json(address)
  } catch (error) {
    if (isUserAddressServiceError(error) && error.code === USER_ADDRESS_ERROR_CODES.addressNotFound) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    console.error('[account/addresses/:id] Failed to update address:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUserSession({ requiresVerifiedEmail: true })
  if (session instanceof NextResponse) return session

  let parsedParams: z.infer<typeof userAddressParamsSchema>
  try {
    parsedParams = userAddressParamsSchema.parse(await params)
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid params'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    await deleteUserAddress(session.user.id as string, parsedParams.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (isUserAddressServiceError(error) && error.code === USER_ADDRESS_ERROR_CODES.addressNotFound) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    console.error('[account/addresses/:id] Failed to delete address:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
