'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, FileText, TrendingUp, Dumbbell, ShieldCheck, User } from 'lucide-react'

interface ReportData {
  generatedAt: string
  coachName: string
  client: {
    name: string
    email: string
    memberSince: string
    goals: string | null
    package: string | null
  }
  body: {
    firstCheckin: { date: string; weight: number | null; bodyFat: number | null; muscle: number | null } | null
    lastCheckin: { date: string; weight: number | null; bodyFat: number | null; muscle: number | null } | null
    totalCheckins: number
  }
  training: {
    totalSessions: number
    totalVolume: number
    totalSets: number
    averageDuration: number
    volumeByGroup: Record<string, number>
    personalRecords: { exercise: string; type: string; value: number; date: string }[]
  }
  accountability: {
    totalLogs: number
    responded: number
    workoutCompliance: number
    nutritionCompliance: number
  }
}

export default function ClientReportPage() {
  const params = useParams() as unknown as { id: string }
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/reports/client/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setReport(data.data)
        }
      } catch (error) {
        console.error('Failed to load report:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !report) return
    setGenerating(true)

    try {
      // Use browser print to PDF
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Pop-up geblokkeerd. Sta pop-ups toe om het rapport te downloaden.')
        setGenerating(false)
        return
      }

      const content = reportRef.current.innerHTML

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="nl-BE">
        <head>
          <meta charset="utf-8">
          <title>MŌVE Rapport — ${report.client.name}</title>
          <style>
            @page { margin: 20mm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #1A1A18;
              line-height: 1.5;
              font-size: 12px;
            }
            .report-header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #1A1917;
              margin-bottom: 24px;
            }
            .report-header h1 {
              font-size: 28px;
              color: #1A1917;
              font-weight: 700;
              letter-spacing: 2px;
            }
            .report-header .subtitle {
              color: #8E8E93;
              font-size: 13px;
              margin-top: 4px;
            }
            .section { margin-bottom: 24px; }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #1A1A18;
              margin-bottom: 12px;
              padding-bottom: 6px;
              border-bottom: 1px solid #E8E4DC;
            }
            .stat-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 16px;
            }
            .stat-card {
              background: #FAFAFA;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
            }
            .stat-label { font-size: 10px; color: #8E8E93; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
            .stat-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
            .stat-unit { font-size: 10px; color: #C7C7CC; }
            .delta-positive { color: #34C759; }
            .delta-negative { color: #FF3B30; }
            .delta-neutral { color: #8E8E93; }
            .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E8E4DC; font-size: 12px; }
            .info-label { color: #8E8E93; }
            .info-value { font-weight: 600; }
            .pr-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .pr-table th { text-align: left; padding: 6px 8px; background: #FAFAFA; font-size: 10px; color: #8E8E93; text-transform: uppercase; }
            .pr-table td { padding: 6px 8px; border-bottom: 1px solid #E8E4DC; }
            .bar-container { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
            .bar-label { width: 80px; font-size: 11px; color: #8E8E93; }
            .bar-fill { height: 16px; border-radius: 4px; background: #1A1917; }
            .bar-value { font-size: 11px; font-weight: 600; }
            .footer {
              margin-top: 32px;
              padding-top: 12px;
              border-top: 1px solid #E8E4DC;
              text-align: center;
              font-size: 10px;
              color: #C7C7CC;
            }
            .compliance-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
            .compliance-track { flex: 1; height: 8px; background: #E8E4DC; border-radius: 4px; overflow: hidden; }
            .compliance-fill { height: 100%; border-radius: 4px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `)
      printWindow.document.close()

      // Wait for rendering then trigger print
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => printWindow.close(), 500)
      }, 300)
    } catch (error) {
      console.error('PDF generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1917]" strokeWidth={1.5} />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6">
        <Link href={`/coach/clients/${params.id}`} className="inline-flex items-center gap-2 text-[#1A1917] mb-6">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} /> Terug
        </Link>
        <p className="text-[#8E8E93]">Kon rapport niet laden.</p>
      </div>
    )
  }

  const bodyDelta = (field: 'weight' | 'bodyFat' | 'muscle') => {
    const first = report.body.firstCheckin
    const last = report.body.lastCheckin
    if (!first || !last) return null
    const fVal = field === 'weight' ? first.weight : field === 'bodyFat' ? first.bodyFat : first.muscle
    const lVal = field === 'weight' ? last.weight : field === 'bodyFat' ? last.bodyFat : last.muscle
    if (fVal == null || lVal == null) return null
    return Number(lVal) - Number(fVal)
  }

  const maxGroupVolume = Math.max(...Object.values(report.training.volumeByGroup), 1)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href={`/coach/clients/${params.id}`} className="inline-flex items-center gap-2 text-[#1A1917] font-medium text-[15px]">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} /> Terug
        </Link>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1917] text-white rounded-xl font-semibold text-[14px] hover:bg-[#6B5110] transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Download className="w-4 h-4" strokeWidth={1.5} />
          )}
          Download PDF
        </button>
      </div>

      {/* Preview card */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E8E4DC] overflow-hidden">
        <div className="p-4 bg-[#1A1917]/5 border-b border-[#E8E4DC] flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#1A1917]" strokeWidth={1.5} />
          <div>
            <h2 className="text-[15px] font-semibold text-[#1A1A18]">Voortgangsrapport</h2>
            <p className="text-[12px] text-[#8E8E93]">{report.client.name} — {new Date(report.generatedAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Report content (used for PDF print) */}
        <div ref={reportRef} className="p-6">
          {/* Header */}
          <div className="report-header" style={{ textAlign: 'center', paddingBottom: 20, borderBottom: '2px solid #1A1917', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, color: '#1A1917', fontWeight: 700, letterSpacing: 2 }}>MŌVE</h1>
            <div className="subtitle" style={{ color: '#8E8E93', fontSize: 13, marginTop: 4 }}>
              Voortgangsrapport — {report.client.name}
            </div>
            <div style={{ color: '#C7C7CC', fontSize: 11, marginTop: 4 }}>
              Gegenereerd op {new Date(report.generatedAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })} door {report.coachName}
            </div>
          </div>

          {/* Client Info */}
          <div className="section" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E8E4DC' }}>
              Cliënt Overzicht
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {[
                { label: 'Naam', value: report.client.name },
                { label: 'Lid sinds', value: new Date(report.client.memberSince).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Pakket', value: report.client.package || '—' },
                { label: 'Doelen', value: report.client.goals || '—' },
              ].map(row => (
                <div key={row.label} className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E8E4DC', fontSize: 12 }}>
                  <span className="info-label" style={{ color: '#8E8E93' }}>{row.label}</span>
                  <span className="info-value" style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body Composition */}
          <div className="section" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E8E4DC' }}>
              Lichaamssamenstelling
            </div>
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Gewicht', delta: bodyDelta('weight'), unit: 'kg', inverted: false },
                { label: 'Vetpercentage', delta: bodyDelta('bodyFat'), unit: '%', inverted: true },
                { label: 'Spiermassa', delta: bodyDelta('muscle'), unit: 'kg', inverted: false },
              ].map(stat => {
                const color = stat.delta == null ? '#8E8E93' : (stat.inverted ? stat.delta < 0 : stat.delta > 0) ? '#34C759' : stat.delta === 0 ? '#8E8E93' : '#FF3B30'
                return (
                  <div key={stat.label} className="stat-card" style={{ background: '#FAFAFA', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div className="stat-label" style={{ fontSize: 10, color: '#8E8E93', textTransform: 'uppercase', fontWeight: 600 }}>{stat.label}</div>
                    <div className="stat-value" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color }}>
                      {stat.delta != null ? `${stat.delta > 0 ? '+' : ''}${stat.delta.toFixed(1)}` : '—'}
                    </div>
                    <div className="stat-unit" style={{ fontSize: 10, color: '#C7C7CC' }}>{stat.unit} verschil</div>
                  </div>
                )
              })}
            </div>
            {report.body.firstCheckin && report.body.lastCheckin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11 }}>
                <div style={{ background: '#FAFAFA', padding: 10, borderRadius: 8 }}>
                  <div style={{ color: '#8E8E93', fontWeight: 600, fontSize: 10, marginBottom: 4 }}>START ({new Date(report.body.firstCheckin.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })})</div>
                  {report.body.firstCheckin.weight && <div>Gewicht: <strong>{Number(report.body.firstCheckin.weight).toFixed(1)} kg</strong></div>}
                  {report.body.firstCheckin.bodyFat && <div>Vetpercentage: <strong>{Number(report.body.firstCheckin.bodyFat).toFixed(1)}%</strong></div>}
                  {report.body.firstCheckin.muscle && <div>Spiermassa: <strong>{Number(report.body.firstCheckin.muscle).toFixed(1)} kg</strong></div>}
                </div>
                <div style={{ background: '#FAFAFA', padding: 10, borderRadius: 8 }}>
                  <div style={{ color: '#8E8E93', fontWeight: 600, fontSize: 10, marginBottom: 4 }}>HUIDIG ({new Date(report.body.lastCheckin.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })})</div>
                  {report.body.lastCheckin.weight && <div>Gewicht: <strong>{Number(report.body.lastCheckin.weight).toFixed(1)} kg</strong></div>}
                  {report.body.lastCheckin.bodyFat && <div>Vetpercentage: <strong>{Number(report.body.lastCheckin.bodyFat).toFixed(1)}%</strong></div>}
                  {report.body.lastCheckin.muscle && <div>Spiermassa: <strong>{Number(report.body.lastCheckin.muscle).toFixed(1)} kg</strong></div>}
                </div>
              </div>
            )}
          </div>

          {/* Training Stats */}
          <div className="section" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E8E4DC' }}>
              Training Statistieken
            </div>
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Sessies', value: report.training.totalSessions, unit: '' },
                { label: 'Totaal volume', value: report.training.totalVolume.toLocaleString('nl-BE'), unit: 'kg' },
                { label: 'Totaal sets', value: report.training.totalSets, unit: '' },
                { label: 'Gem. duur', value: report.training.averageDuration, unit: 'min' },
              ].map(stat => (
                <div key={stat.label} className="stat-card" style={{ background: '#FAFAFA', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div className="stat-label" style={{ fontSize: 10, color: '#8E8E93', textTransform: 'uppercase', fontWeight: 600 }}>{stat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: '#007AFF' }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: '#C7C7CC' }}>{stat.unit}</div>
                </div>
              ))}
            </div>

            {/* Volume by group */}
            {Object.keys(report.training.volumeByGroup).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#8E8E93' }}>Volume per spiergroep</div>
                {Object.entries(report.training.volumeByGroup)
                  .sort(([, a], [, b]) => b - a)
                  .map(([group, volume]) => (
                    <div key={group} className="bar-container" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="bar-label" style={{ width: 80, fontSize: 11, color: '#8E8E93' }}>
                        {group.charAt(0).toUpperCase() + group.slice(1)}
                      </span>
                      <div style={{ flex: 1, height: 16, background: '#E8E4DC', borderRadius: 4, overflow: 'hidden' }}>
                        <div className="bar-fill" style={{ width: `${(volume / maxGroupVolume) * 100}%`, height: '100%', borderRadius: 4, background: '#1A1917' }} />
                      </div>
                      <span className="bar-value" style={{ fontSize: 11, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                        {Math.round(volume).toLocaleString('nl-BE')} kg
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Personal Records */}
          {report.training.personalRecords.length > 0 && (
            <div className="section" style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E8E4DC' }}>
                Persoonlijke Records
              </div>
              <table className="pr-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', background: '#FAFAFA', fontSize: 10, color: '#8E8E93', textTransform: 'uppercase' }}>Oefening</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', background: '#FAFAFA', fontSize: 10, color: '#8E8E93', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', background: '#FAFAFA', fontSize: 10, color: '#8E8E93', textTransform: 'uppercase' }}>Waarde</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', background: '#FAFAFA', fontSize: 10, color: '#8E8E93', textTransform: 'uppercase' }}>Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {report.training.personalRecords.map((pr, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #E8E4DC' }}>{pr.exercise}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #E8E4DC' }}>
                        {pr.type === 'weight' ? 'Max gewicht' : pr.type === 'reps' ? 'Max reps' : 'Volume'}
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #E8E4DC', textAlign: 'right', fontWeight: 700, color: '#AF52DE' }}>
                        {pr.value} {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'reps' : 'kg'}
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #E8E4DC', textAlign: 'right', color: '#8E8E93' }}>
                        {new Date(pr.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Accountability */}
          <div className="section" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E8E4DC' }}>
              Accountability (laatste 30 dagen)
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="compliance-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 100, fontSize: 12, color: '#8E8E93' }}>Workouts</span>
                <div className="compliance-track" style={{ flex: 1, height: 8, background: '#E8E4DC', borderRadius: 4, overflow: 'hidden' }}>
                  <div className="compliance-fill" style={{ width: `${report.accountability.workoutCompliance}%`, height: '100%', borderRadius: 4, background: '#34C759' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{report.accountability.workoutCompliance}%</span>
              </div>
              <div className="compliance-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 100, fontSize: 12, color: '#8E8E93' }}>Voeding</span>
                <div className="compliance-track" style={{ flex: 1, height: 8, background: '#E8E4DC', borderRadius: 4, overflow: 'hidden' }}>
                  <div className="compliance-fill" style={{ width: `${report.accountability.nutritionCompliance}%`, height: '100%', borderRadius: 4, background: '#FF9500' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{report.accountability.nutritionCompliance}%</span>
              </div>
              <div style={{ fontSize: 11, color: '#C7C7CC', marginTop: 4 }}>
                {report.accountability.responded} van {report.accountability.totalLogs} dagelijkse checks beantwoord
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer" style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #E8E4DC', textAlign: 'center', fontSize: 10, color: '#C7C7CC' }}>
            MŌVE Personal Training Studio — Knokke &bull; Vertrouwelijk document &bull; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  )
}
