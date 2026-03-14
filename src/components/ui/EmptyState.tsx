import { type LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="text-center py-16 px-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bg-secondary mb-4">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <h3 className="text-base font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mx-auto mb-6">{description}</p>
      {action && (
        action.href ? (
          <a href={action.href}>
            <Button variant="primary" size="sm">{action.label}</Button>
          </a>
        ) : (
          <Button variant="primary" size="sm" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  )
}
