'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase'
import { getPrograms, assignProgram } from '@/lib/hevy'
import { Download, CheckCircle2 } from 'lucide-react'
import type { HevyProgram } from '@/lib/hevy'

interface ProgramAssignmentProps {
  clientId: string
  onAssigned?: () => void
}

export function ProgramAssignment({ clientId, onAssigned }: ProgramAssignmentProps) {
  const [programs, setPrograms] = useState<HevyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [assignedProgramId, setAssignedProgramId] = useState<string | null>(null)

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        setLoading(true)
        const data = await getPrograms()
        setPrograms(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load programs')
      } finally {
        setLoading(false)
      }
    }

    loadPrograms()
  }, [])

  const handleAssign = async (program: HevyProgram) => {
    setAssigningId(program.id)
    setError('')
    setSuccess('')

    try {
      // Assign in HEVY
      const assignResult = await assignProgram(clientId, program.id)

      if (!assignResult.success) {
        throw new Error(assignResult.message)
      }

      // Save to database
      const supabase = createClient()

      const { error: insertError } = await supabase.from('programs').insert({
        client_id: clientId,
        title: program.title,
        description: program.description || '',
        hevy_program_id: program.id,
        is_active: true,
      })

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`)
      }

      setSuccess(`"${program.title}" succesvol toegewezen!`)
      setAssignedProgramId(program.id)

      if (onAssigned) {
        setTimeout(onAssigned, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign program')
    } finally {
      setAssigningId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
          <p className="text-sm text-accent">{success}</p>
        </div>
      )}

      {programs.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-text-muted">Geen HEVY-programma's beschikbaar</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
            <Card key={program.id} padding="sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary">{program.title}</h4>
                  {program.description && (
                    <p className="text-sm text-text-muted mt-1">{program.description}</p>
                  )}
                  {program.weeks && (
                    <p className="text-xs text-text-muted mt-2">{program.weeks} weken</p>
                  )}
                </div>
                <Button
                  onClick={() => handleAssign(program)}
                  loading={assigningId === program.id}
                  disabled={
                    assigningId !== null ||
                    assignedProgramId === program.id ||
                    assigningId === program.id
                  }
                  variant={assignedProgramId === program.id ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  {assignedProgramId === program.id ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Toegewezen
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Toewijzen
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
