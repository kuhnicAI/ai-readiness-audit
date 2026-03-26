import { Resend } from 'resend'
import type { WasteCalculation } from './waste'

interface EmailInput {
  to: string
  contactName: string
  companyName: string
  waste: WasteCalculation
  report: string
  pdfBuffer?: Buffer
}

function cleanName(raw: string): string {
  return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
}

export async function sendReportEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const resend = new Resend(apiKey)
  const { to, contactName, companyName, waste, report } = input

  const firstName = contactName.split(' ')[0]
  const displayName = cleanName(companyName)

  // Parse the JSON report for clean text
  let execSummary = ''
  try {
    const parsed = JSON.parse(report.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
    execSummary = [parsed.executiveSummaryP1, parsed.executiveSummaryP2, parsed.executiveSummaryP3].filter(Boolean).join('\n\n')
  } catch {
    execSummary = ''
  }

  // Plain text version (spam filters prefer multipart emails)
  const textContent = `Hi ${firstName},

Your AI readiness audit for ${displayName} is ready.

We identified areas where your business could recover up to ${Math.round(waste.totalWaste / 1000)}k annually through operational improvements.

${execSummary}

To discuss these findings in detail, you can book a 15-minute call at:
calendly.com/jorge-linklemon/30min

No pressure. We walk through your specific numbers together and tell you what we would do.

Best,
The Kuhnic team
kuhnic.ai`

  // Minimal HTML — no images, no bright colours, no large fonts, one link only
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">
  <div style="max-width:580px;margin:0 auto;padding:32px 20px;">

    <p>Hi ${firstName},</p>

    <p>Your AI readiness audit for <strong>${displayName}</strong> is ready.</p>

    <p>We identified areas where your business could recover up to ${Math.round(waste.totalWaste / 1000)}k annually through operational improvements.</p>

    ${execSummary ? execSummary.split('\n\n').filter(Boolean).map(p => `<p style="color:#444;">${p.trim()}</p>`).join('\n') : ''}

    <p>If you want to walk through these findings together, you can book a quick call here:</p>

    <p><a href="https://calendly.com/jorge-linklemon/30min" style="color:#0066cc;">Book a 15-minute call</a></p>

    <p>No pressure. We look at your specific numbers and tell you what we would do.</p>

    <p style="margin-top:32px;color:#666;">Best,<br/>The Kuhnic team</p>

  </div>
</body>
</html>`

  const emailPayload: Record<string, unknown> = {
    from: 'Kuhnic AI <noreply@audit.kuhnic.ai>',
    to,
    subject: `Here's your audit for ${displayName}`,
    html,
    text: textContent,
  }

  // Attach PDF if available
  if (input.pdfBuffer) {
    emailPayload.attachments = [
      {
        filename: `AI-Audit-${displayName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
        content: input.pdfBuffer,
      },
    ]
    console.log('[Email] PDF attached:', input.pdfBuffer.length, 'bytes')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await resend.emails.send(emailPayload as any)

  return result
}
