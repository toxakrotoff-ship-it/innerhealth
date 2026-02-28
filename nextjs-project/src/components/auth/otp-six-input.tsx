'use client'

import { useRef, useCallback, useId } from 'react'

const LEN = 6

export interface OtpSixInputProps {
  value: string
  onChange: (code: string) => void
  'aria-label'?: string
  className?: string
}

function getDigits(value: string): string[] {
  const digits = value.replace(/\D/g, '').slice(0, LEN).split('')
  return Array.from({ length: LEN }, (_, i) => digits[i] ?? '')
}

export function OtpSixInput({
  value,
  onChange,
  'aria-label': ariaLabel = 'One-time code',
  className = '',
}: OtpSixInputProps) {
  const baseId = useId()
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const digits = getDigits(value)

  const commit = useCallback(
    (newDigits: string[]) => {
      const code = newDigits.join('')
      onChange(code)
    },
    [onChange]
  )

  const focusCell = useCallback((index: number) => {
    const i = Math.max(0, Math.min(index, LEN - 1))
    refs.current[i]?.focus()
  }, [])

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const cleaned = raw.replace(/\D/g, '')
      const digit = cleaned.slice(0, 1)
      const newDigits = [...digits]
      newDigits[index] = digit
      commit(newDigits)
      if (digit && cleaned.length <= 1) focusCell(index + 1)
    },
    [digits, commit, focusCell]
  )

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        e.preventDefault()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        commit(newDigits)
        focusCell(index - 1)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusCell(index - 1)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusCell(index + 1)
      }
    },
    [digits, commit, focusCell]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN)
      if (!raw) return
      const newDigits = Array.from({ length: LEN }, (_, i) => raw[i] ?? '')
      commit(newDigits)
      focusCell(Math.min(raw.length, LEN - 1))
    },
    [commit, focusCell]
  )

  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {digits.map((d, i) => (
        <input
          key={`${baseId}-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className="h-12 w-12 rounded-md border border-white/20 bg-white text-center text-xl text-[#1a2332] focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none"
          data-testid={`otp-cell-${i}`}
        />
      ))}
    </div>
  );
}
