import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  variant?: 'default' | 'clean'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, variant = 'default', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const baseStyles = variant === 'clean'
      ? 'bg-client-surface-muted border-0 rounded-2xl focus:ring-2 focus:ring-accent focus:bg-white'
      : 'bg-surface border border-border rounded-2xl focus:ring-2 focus:ring-accent focus:border-transparent'

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-5 py-3 text-[15px]
            ${baseStyles}
            text-text-primary placeholder:text-text-muted
            transition-colors duration-150 ease-out
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-error focus:ring-error' : ''}
            ${className}
          `.trim()}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {hint && !error && <p className="text-sm text-text-muted">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
