import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'muted' | 'clean' | 'accent'
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const variantStyles = {
  default: 'bg-surface border border-border shadow-card',
  elevated: 'bg-surface shadow-elevated',
  muted: 'bg-surface-muted border border-border',
  clean: 'bg-white shadow-clean hover:shadow-clean-hover transition-shadow duration-150',
  accent: 'bg-accent-surface shadow-clean',
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'
