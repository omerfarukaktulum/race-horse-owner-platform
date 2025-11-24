'use client'

import * as React from 'react'
import { ChevronDown, CalendarDays, Image as ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Label } from '@/app/components/ui/label'
import { TurkishDateInput, TurkishDateInputProps } from '@/app/components/ui/turkish-date-input'
import { Input } from '@/app/components/ui/input'

const baseInputClasses =
  'h-11 w-full rounded-xl border border-gray-200/80 bg-white px-4 text-sm text-gray-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60 focus-visible:border-[#6366f1] placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50'

interface ModalFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  helperText?: string
}

export function ModalField({ label, required, children, helperText }: ModalFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-700 font-medium">
        {label}
        {required && <span className="text-[#ef4444]">*</span>}
      </Label>
      {children}
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  )
}

interface ModalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  icon?: React.ReactNode
  helperText?: string
}

export const ModalSelect = React.forwardRef<HTMLSelectElement, ModalSelectProps>(
  ({ label, required, icon, className, children, helperText, ...props }, ref) => (
    <ModalField label={label} required={required} helperText={helperText}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <select
          ref={ref}
          className={cn(
            baseInputClasses,
            'appearance-none pr-12 cursor-pointer',
            icon && 'pl-11',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </ModalField>
  )
)
ModalSelect.displayName = 'ModalSelect'

interface ModalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  startIcon?: React.ReactNode
}

export const ModalInput = React.forwardRef<HTMLInputElement, ModalInputProps>(
  ({ label, required, helperText, startIcon, className, ...props }, ref) => (
    <ModalField label={label} required={required} helperText={helperText}>
      <div className="relative">
        {startIcon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {startIcon}
          </span>
        )}
        <Input
          ref={ref}
          className={cn(baseInputClasses, startIcon && 'pl-11', className)}
          {...props}
        />
      </div>
    </ModalField>
  )
)
ModalInput.displayName = 'ModalInput'

interface ModalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  helperText?: string
}

export const ModalTextarea = React.forwardRef<HTMLTextAreaElement, ModalTextareaProps>(
  ({ label, required, helperText, className, rows = 3, ...props }, ref) => (
    <ModalField label={label} required={required} helperText={helperText}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-xl border border-gray-200/80 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60 focus-visible:border-[#6366f1] placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className
        )}
        {...props}
      />
    </ModalField>
  )
)
ModalTextarea.displayName = 'ModalTextarea'

interface ModalDateFieldProps extends Omit<TurkishDateInputProps, 'className'> {
  label: string
  helperText?: string
}

export const ModalDateField = React.forwardRef<HTMLInputElement, ModalDateFieldProps>(
  ({ label, required, helperText, ...props }, ref) => (
    <ModalField label={label} required={required} helperText={helperText}>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <CalendarDays className="h-4 w-4" />
        </span>
        <TurkishDateInput
          ref={ref}
          className={cn(baseInputClasses, 'pl-11 pr-12')}
          {...props}
        />
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </ModalField>
  )
)
ModalDateField.displayName = 'ModalDateField'

interface ModalPhotoUploadProps {
  label: string
  inputId: string
  disabled?: boolean
  previews: string[]
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  helperText?: string
}

export function ModalPhotoUpload({
  label,
  inputId,
  disabled,
  previews,
  onChange,
  onRemove,
  helperText,
}: ModalPhotoUploadProps) {
  return (
    <ModalField label={label} helperText={helperText}>
      <div className="relative">
        <label htmlFor={inputId} className={cn('block')}>
          <div
            className={cn(
              'rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 px-4 py-5 text-center transition hover:border-[#6366f1] hover:bg-[#eef2ff]',
              disabled && 'cursor-not-allowed opacity-60',
              !disabled && 'cursor-pointer'
            )}
          >
            <div className="flex flex-col items-center gap-2 text-sm font-medium text-gray-600">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Fotoğraf Seç</span>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG maksimum 5MB</p>
            </div>
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div
                    key={`${preview}-${index}`}
                    className="relative h-16 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onRemove(index)
                      }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white shadow"
                      aria-label="Fotoğrafı kaldır"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            onChange={onChange}
            className="hidden"
          />
        </label>
      </div>
    </ModalField>
  )
}


