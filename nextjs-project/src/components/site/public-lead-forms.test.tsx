import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PartnershipForm } from './partnership-form'
import { ContactHelpForm } from './contact-help-form'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(Response.json({ success: true }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe.each([false, true])('lead forms, sprint theme: %s', isSprintTheme => {
  const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } })
  it('rejects invalid partnership social profiles before submission', async () => {
    const { container } = render(<PartnershipForm isSprintTheme={isSprintTheme} />)
    fill('partnership-name', 'Анна Иванова')
    fill('partnership-email', 'anna@gmail.com')
    fill('partnership-phone', '+79991234567')
    fill('partnership-social', '7226992791')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('@username'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('submits valid partnership fields with trap signals', async () => {
    const { container } = render(<PartnershipForm isSprintTheme={isSprintTheme} />)
    fill('partnership-name', 'Анна Иванова')
    fill('partnership-email', 'anna@gmail.com')
    fill('partnership-phone', '+79991234567')
    fill('partnership-social', '@anna')
    fill('partnership-message', 'Хочу сотрудничать с вами')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ website: '', formStartedAt: expect.any(Number), socialLinks: '@anna' })
  })
  it('rejects generated contact messages before submission', async () => {
    const { container } = render(<ContactHelpForm isSprintTheme={isSprintTheme} />)
    fill('contact-help-name', 'Анна Иванова')
    fill('contact-help-email', 'anna@gmail.com')
    fill('contact-help-message', 'PiCaIKQUXcnnpGNFYKQWOlZ')
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('текст'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
