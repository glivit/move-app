'use client'

import Link from 'next/link'
import { Card } from './Card'
import { PackageBadge } from './PackageBadge'
import { ArrowRight } from 'lucide-react'
import type { Profile } from '@/types'

interface ClientCardProps {
  client: Profile
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatStartDate(date: string | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('nl-NL', {
    month: 'long',
    year: 'numeric',
  })
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Link href={`/coach/clients/${client.id}`} className="block">
      <div className="bg-white rounded-2xl border border-[#F0F0EE] p-5 hover:border-[#1A1917]/10 transition-all duration-200 flex flex-col h-full group cursor-pointer">
        <div className="flex flex-col h-full">
          {/* Avatar Section */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar Circle */}
            <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
              {client.avatar_url ? (
                <img
                  src={client.avatar_url}
                  alt={client.full_name || 'Client'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-base font-semibold">
                  {getInitials(client.full_name)}
                </span>
              )}
            </div>

            {/* Name and Package */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-text-primary truncate">
                {client.full_name}
              </h3>
              {client.package && (
                <div className="mt-2">
                  <PackageBadge tier={client.package as any} size="sm" />
                </div>
              )}
            </div>

            <ArrowRight
              className="h-4 w-4 text-[#C5C2BC] group-hover:text-accent-dark group-hover:translate-x-1 transition-all shrink-0 mt-1"
              strokeWidth={1.5}
            />
          </div>

          {/* Start Date */}
          {client.start_date && (
            <div className="mb-4 pb-4 border-b border-client-border">
              <p className="text-[11px] uppercase tracking-wider text-client-text-muted font-medium">Inschrijfdatum</p>
              <p className="text-[13px] text-text-primary mt-1">
                {formatStartDate(client.start_date)}
              </p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-2 flex-1">
            {client.email && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-client-text-muted font-medium">Email</p>
                <p className="text-[13px] text-text-primary truncate">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-client-text-muted font-medium">Telefoon</p>
                <p className="text-[13px] text-text-primary">{client.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

