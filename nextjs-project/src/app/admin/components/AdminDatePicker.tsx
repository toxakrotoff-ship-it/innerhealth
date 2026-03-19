'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useModalPresence } from '@/components/ui/modal-layer'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYMD(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function startOfMonth(d: Date): Date {
  const out = new Date(d)
  out.setDate(1)
  out.setHours(0, 0, 0, 0)
  return out
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + n)
  return out
}

/** Понедельник = 0. Для воскресенья (7) сдвигаем на -1 чтобы получить 6. */
function getDayOfWeek(d: Date): number {
  const n = d.getDay()
  return n === 0 ? 6 : n - 1
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(d: Date): boolean {
  const t = new Date()
  return isSameDay(d, t)
}

interface AdminDatePickerProps {
  name: string
  id: string
  label: string
  defaultValue?: string
  /** Минимальная дата (YYYY-MM-DD). Даты раньше неактивны. */
  minDate?: string
  /** Максимальная дата (YYYY-MM-DD). Даты позже неактивны; по умолчанию — сегодня. */
  maxDate?: string
}

export function AdminDatePicker({ name, id, label, defaultValue, minDate, maxDate }: AdminDatePickerProps) {
  const [open, setOpen] = useState(false)
  const { mounted: pickerMounted, visible: pickerVisible } = useModalPresence(open)
  const [value, setValue] = useState<string>(defaultValue ?? '')
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const from = parseYMD(defaultValue ?? '')
    return startOfMonth(from ?? new Date())
  })
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const viewStart = startOfMonth(viewMonth)
  const viewDayOfWeek = getDayOfWeek(viewStart)
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const prevMonthDays = viewDayOfWeek
  const totalCells = prevMonthDays + daysInMonth
  const rows = Math.ceil(totalCells / 7)

  const selectedDate = parseYMD(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const minDateParsed = minDate ? parseYMD(minDate) : null
  const maxDateParsed = maxDate ? parseYMD(maxDate) : null
  const effectiveMax = (() => {
    if (!maxDateParsed) return today
    return maxDateParsed > today ? today : maxDateParsed
  })()
  if (effectiveMax.getHours() !== 0) effectiveMax.setHours(0, 0, 0, 0)

  function isDateDisabled(date: Date): boolean {
    if (date > today) return true
    if (minDateParsed && date < minDateParsed) return true
    if (date > effectiveMax) return true
    return false
  }

  const displayLabel = value
    ? parseYMD(value)?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) ?? ''
    : ''

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={value} readOnly aria-hidden />
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className="form-input w-full min-w-[140px] text-left bg-white cursor-pointer flex items-center justify-between"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || 'Выберите дату'}
        </span>
        <CalendarIcon />
      </button>

      {pickerMounted && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-[280px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg transition-[opacity,transform] duration-200 ease-out motion-reduce:translate-y-0 motion-reduce:transition-none',
            pickerVisible ? 'translate-y-0 opacity-100' : 'translate-y-0.5 opacity-0'
          )}
          role="dialog"
          aria-label="Выбор даты"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Следующий месяц"
            >
              <ChevronRight />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-1.5 font-medium text-gray-500">
                {wd}
              </div>
            ))}
            {Array.from({ length: rows * 7 }, (_, i) => {
              const dayIndex = i - prevMonthDays + 1
              let date: Date
              let isCurrentMonth: boolean
              if (dayIndex < 1) {
                const prev = addMonths(viewStart, -1)
                const daysInPrev = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()
                date = new Date(prev.getFullYear(), prev.getMonth(), daysInPrev + dayIndex)
                isCurrentMonth = false
              } else if (dayIndex > daysInMonth) {
                date = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, dayIndex - daysInMonth)
                isCurrentMonth = false
              } else {
                date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayIndex)
                isCurrentMonth = true
              }
              date.setHours(0, 0, 0, 0)
              const disabled = isDateDisabled(date)
              const selected = selectedDate !== null && isSameDay(date, selectedDate)
              const todayCell = isToday(date)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return
                    setValue(toYMD(date))
                    setOpen(false)
                  }}
                  className={`flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors ${
                    disabled
                      ? 'cursor-not-allowed text-gray-300 bg-transparent'
                      : !isCurrentMonth
                        ? 'text-gray-300'
                        : selected
                          ? 'bg-gray-900 text-white'
                          : todayCell
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
            <button
              type="button"
              disabled={isDateDisabled(today)}
              onClick={() => {
                if (isDateDisabled(today)) return
                setValue(toYMD(today))
                setViewMonth(startOfMonth(today))
                setOpen(false)
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
