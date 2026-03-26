import { Resend } from 'resend'
import type { WasteCalculation } from './waste'

interface EmailInput {
  to: string
  contactName: string
  companyName: string
  waste: WasteCalculation
}

function cleanName(raw: string): string {
  return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
}

export async function sendReportEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const resend = new Resend(apiKey)
  const { to, contactName, companyName, waste } = input
  const firstName = contactName.split(' ')[0]
  const displayName = cleanName(companyName)

  const text = `Hi ${firstName},

Your audit for ${displayName} is done.

We found areas where your business could recover around ${waste.totalWaste >= 1000000 ? (waste.totalWaste / 1000000).toFixed(1) + 'm' : Math.round(waste.totalWaste / 1000) + 'k'} per year. The full breakdown is on your results page, and you can download the PDF from there.

If you want to talk through the findings, book a quick call:
calendly.com/jorge-linklemon/30min

15 minutes. No pitch. Just your numbers.

Best,
Kuhnic`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <p>Hi ${firstName},</p>
    <p>Your audit for <strong>${displayName}</strong> is done.</p>
    <p>We found areas where your business could recover around ${waste.totalWaste >= 1000000 ? (waste.totalWaste / 1000000).toFixed(1) + 'm' : Math.round(waste.totalWaste / 1000) + 'k'} per year. The full breakdown is on your results page, and you can download the PDF from there.</p>
    <p>If you want to talk through the findings:</p>
    <p><a href="https://calendly.com/jorge-linklemon/30min" style="color:#0066cc;">Book a 15-minute call</a></p>
    <p>No pitch. Just your numbers.</p>
    <p style="margin-top:24px;color:#666;">Best,<br/>Kuhnic</p>
  </div>
</body></html>`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await resend.emails.send({
    from: 'Kuhnic AI <noreply@audit.kuhnic.ai>',
    to,
    subject: `Here's your audit for ${displayName}`,
    html,
    text,
  } as any)

  return result
}
