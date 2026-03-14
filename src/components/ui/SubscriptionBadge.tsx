import { CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react'

type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | null

interface SubscriptionBadgeProps {
  status: SubscriptionStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<Exclude<SubscriptionStatus, null>, { label: string; className: string; icon: React.ReactNode }> = {
  active: {
    label: 'Actief',
    className: 'bg-green-50 text-green-700 border border-green-200',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  past_due: {
    label: 'Achterstallig',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  cancelled: {
    label: 'Geannuleerd',
    className: 'bg-red-50 text-red-700 border border-red-200',
    icon: <XCircle className="w-4 h-4" />,
  },
  trialing: {
    label: 'Proefperiode',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
    icon: <Clock className="w-4 h-4" />,
  },
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function SubscriptionBadge({ status, size = 'sm' }: SubscriptionBadgeProps) {
  if (!status) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-300 ${sizeStyles[size]}`}>
        <span className="w-4 h-4" />
        Geen abonnement
      </span>
    )
  }

  const config = statusConfig[status]

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${config.className} ${sizeStyles[size]}`}>
      {config.icon}
      {config.label}
    </span>
  )
}
