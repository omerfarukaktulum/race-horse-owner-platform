'use client'

import * as React from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { tr } from 'date-fns/locale'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-datepicker/dist/react-datepicker.css'

// Register Turkish locale
registerLocale('tr', tr)

export interface TurkishDateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> {
  value?: string // ISO date string (YYYY-MM-DD)
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  min?: string // ISO date string
  max?: string // ISO date string
  onMouseDown?: (e: React.MouseEvent<HTMLInputElement>) => void
  onTouchStart?: (e: React.TouchEvent<HTMLInputElement>) => void
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
}

/**
 * Turkish Date Input Component using react-datepicker
 * 
 * A styled date input that:
 * - Has full Turkish locale support (month names, day names, etc.)
 * - Has consistent width with other form inputs
 * - Prevents auto-opening on modal open
 * - Has proper alignment with other form elements
 */
const TurkishDateInput = React.forwardRef<HTMLInputElement, TurkishDateInputProps>(
  ({ className, value, onChange, min, max, disabled, onMouseDown, onTouchStart, onClick, onFocus, autoFocus, ...props }, ref) => {
    const datePickerRef = React.useRef<DatePicker>(null)
    
    // Expose the input element via ref
    React.useImperativeHandle(ref, () => {
      // Access the input element from the DatePicker component
      const inputElement = (datePickerRef.current as any)?.input
      return inputElement || null
    })

    // Convert ISO string to Date object (using local time to avoid timezone issues)
    const dateValue = value ? (() => {
      const [year, month, day] = value.split('-').map(Number)
      return new Date(year, month - 1, day)
    })() : null
    
    const minDate = min ? (() => {
      const [year, month, day] = min.split('-').map(Number)
      return new Date(year, month - 1, day)
    })() : undefined
    
    const maxDate = max ? (() => {
      const [year, month, day] = max.split('-').map(Number)
      return new Date(year, month - 1, day)
    })() : undefined

    const handleDateChange = (date: Date | null) => {
      if (onChange && date) {
        // Convert Date to ISO string (YYYY-MM-DD) using local time to avoid timezone issues
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const isoString = `${year}-${month}-${day}`
        
        // Create a synthetic event
        const syntheticEvent = {
          target: { value: isoString },
          currentTarget: { value: isoString },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      } else if (onChange && !date) {
        // Handle clear
        const syntheticEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }

    const renderHeader = ({
      date: currentDate,
      decreaseMonth,
      increaseMonth,
      prevMonthButtonDisabled,
      nextMonthButtonDisabled,
    }: {
      date: Date
      decreaseMonth: () => void
      increaseMonth: () => void
      prevMonthButtonDisabled: boolean
      nextMonthButtonDisabled: boolean
    }) => (
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault()
            decreaseMonth()
          }}
          disabled={prevMonthButtonDisabled}
          className="rounded-full p-1.5 transition hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tracking-wide">
          {format(currentDate, 'MMMM yyyy', { locale: tr })}
        </span>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault()
            increaseMonth()
          }}
          disabled={nextMonthButtonDisabled}
          className="rounded-full p-1.5 transition hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )

    return (
      <div className="relative">
        <DatePicker
          ref={datePickerRef}
          selected={dateValue}
          onChange={handleDateChange}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          locale="tr"
          dateFormat="dd/MM/yyyy"
          placeholderText="GG/AA/YYYY"
          autoFocus={autoFocus}
          renderCustomHeader={renderHeader as any}
          className={cn(
            // Standard width and height to match other inputs
            'h-11 w-full',
            // Consistent padding
            'px-3 pr-10',
            // Text alignment
            'text-left',
            // Border and focus styles
            'rounded-md border border-gray-300 bg-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          wrapperClassName="w-full"
          onInputClick={onClick as any}
          onInputMouseDown={onMouseDown as any}
          onInputTouchStart={onTouchStart as any}
          onInputFocus={onFocus as any}
          {...(props as any)}
        />
        <style jsx global>{`
          .react-datepicker {
            font-family: inherit;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            z-index: 9999 !important;
          }
          .react-datepicker__portal {
            z-index: 9999 !important;
          }
          .react-datepicker__header {
            background-color: #6366f1;
            border-bottom: none;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            padding-top: 0.75rem;
          }
          .react-datepicker__current-month {
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            padding-bottom: 0.5rem;
          }
          .react-datepicker__day-name {
            color: white;
            font-weight: 500;
            width: 2rem;
            line-height: 2rem;
            margin: 0.166rem;
          }
          .react-datepicker__day {
            width: 2rem;
            line-height: 2rem;
            margin: 0.166rem;
            border-radius: 0.375rem;
          }
          .react-datepicker__day--selected,
          .react-datepicker__day--keyboard-selected {
            background-color: #6366f1;
            color: white;
          }
          .react-datepicker__day--selected:hover,
          .react-datepicker__day--keyboard-selected:hover {
            background-color: #4f46e5;
          }
          .react-datepicker__day:hover {
            background-color: #e0e7ff;
            border-radius: 0.375rem;
          }
          .react-datepicker__day--today {
            font-weight: 600;
            color: #6366f1;
          }
          .react-datepicker__day--disabled {
            color: #d1d5db;
            cursor: not-allowed;
          }
          .react-datepicker__navigation {
            top: 0.75rem;
          }
          .react-datepicker__navigation-icon::before {
            border-color: white;
          }
          .react-datepicker__navigation:hover *::before {
            border-color: #e0e7ff;
          }
        `}</style>
      </div>
    )
  }
)
TurkishDateInput.displayName = 'TurkishDateInput'

export { TurkishDateInput }
