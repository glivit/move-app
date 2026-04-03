export interface CheckInData {
  clientName: string
  date: string
  weight_kg?: number | null
  body_fat_pct?: number | null
  muscle_mass_kg?: number | null
  waist_cm?: number | null
  chest_cm?: number | null
  hips_cm?: number | null
  left_arm_cm?: number | null
  right_arm_cm?: number | null
  left_thigh_cm?: number | null
  right_thigh_cm?: number | null
  left_calf_cm?: number | null
  right_calf_cm?: number | null
  coachNotes?: string | null
}

const ACCENT_COLOR = '#1A1917'
const TEXT_COLOR = '#1A1A18'
const BG_COLOR = '#FAFAFA'
const SECONDARY_TEXT = '#8B8B88'

export async function generateCheckInPDF(data: CheckInData): Promise<Buffer> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin

  let yPosition = margin

  // Header
  doc.setFillColor(200, 169, 110) // Accent color
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(245, 240, 234) // Light background color
  doc.text('MŌVE', margin, yPosition + 15)

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Coaching Check-In Report', margin, yPosition + 25)

  yPosition = 50

  // Client Info Section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(26, 26, 24) // Text color
  doc.text('Client:', margin, yPosition)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(data.clientName, margin + 20, yPosition)

  // Date
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Date:', margin, yPosition + 8)

  const formatDate = new Date(data.date).toLocaleDateString('nl-BE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(formatDate, margin + 20, yPosition + 8)

  yPosition += 25

  // Metrics Section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(200, 169, 110)
  doc.text('Metingen', margin, yPosition)

  yPosition += 10

  // Create metrics table
  const metrics = [
    { label: 'Gewicht', value: data.weight_kg, unit: 'kg' },
    { label: 'Vetpercentage', value: data.body_fat_pct, unit: '%' },
    { label: 'Spiermassa', value: data.muscle_mass_kg, unit: 'kg' },
    { label: 'Taille', value: data.waist_cm, unit: 'cm' },
    { label: 'Borstomvang', value: data.chest_cm, unit: 'cm' },
    { label: 'Heupomvang', value: data.hips_cm, unit: 'cm' },
    { label: 'Linkerarm', value: data.left_arm_cm, unit: 'cm' },
    { label: 'Rechterarm', value: data.right_arm_cm, unit: 'cm' },
    { label: 'Linkerdij', value: data.left_thigh_cm, unit: 'cm' },
    { label: 'Rechterdij', value: data.right_thigh_cm, unit: 'cm' },
    { label: 'Linkerkuit', value: data.left_calf_cm, unit: 'cm' },
    { label: 'Rechterkuit', value: data.right_calf_cm, unit: 'cm' },
  ]

  const metricsPerRow = 2
  const colWidth = contentWidth / metricsPerRow
  let metricIndex = 0

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(26, 26, 24)

  for (let i = 0; i < Math.ceil(metrics.length / metricsPerRow); i++) {
    for (let j = 0; j < metricsPerRow; j++) {
      const metric = metrics[metricIndex]
      if (!metric) break

      const xPos = margin + j * colWidth
      const value = metric.value !== null && metric.value !== undefined ? `${metric.value} ${metric.unit}` : 'N/A'

      doc.text(`${metric.label}:`, xPos, yPosition)
      doc.setFont('helvetica', 'bold')
      doc.text(value, xPos, yPosition + 5)
      doc.setFont('helvetica', 'normal')

      metricIndex++
    }
    yPosition += 12
  }

  yPosition += 8

  // Coach Notes Section
  if (data.coachNotes && data.coachNotes.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(200, 169, 110)
    doc.text('Opmerkingen van Coach', margin, yPosition)

    yPosition += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(26, 26, 24)

    // Add notes with text wrapping
    const notesLines = doc.splitTextToSize(data.coachNotes, contentWidth - 4)
    doc.text(notesLines, margin + 2, yPosition)

    yPosition += notesLines.length * 5 + 5
  }

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(139, 139, 136)
  const footerText = `MŌVE Coaching | Generated on ${new Date().toLocaleDateString('nl-BE')}`
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(footerText, margin, pageHeight - 10)
  }

  return Buffer.from(doc.output('arraybuffer'))
}
