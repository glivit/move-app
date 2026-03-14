type Package = 'essential' | 'performance' | 'elite'

interface PackageBadgeProps {
  tier: Package
  size?: 'sm' | 'md'
}

const tierConfig: Record<Package, { label: string; className: string }> = {
  essential: {
    label: 'Essential',
    className: 'bg-surface-muted text-text-secondary border border-border',
  },
  performance: {
    label: 'Performance',
    className: 'bg-accent/15 text-accent-dark',
  },
  elite: {
    label: 'Elite',
    className: 'bg-accent text-white',
  },
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function PackageBadge({ tier, size = 'sm' }: PackageBadgeProps) {
  const config = tierConfig[tier]
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.className} ${sizeStyles[size]}`}>
      {config.label}
    </span>
  )
}
