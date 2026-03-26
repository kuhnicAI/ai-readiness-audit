import { Resend } from 'resend'
import type { WasteCalculation } from './waste'

const fmt = (n: number) => '£' + n.toLocaleString('en-GB')

interface EmailInput {
  to: string
  contactName: string
  companyName: string
  waste: WasteCalculation
  report: string
  pdfBuffer?: Buffer
}

export async function sendReportEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const resend = new Resend(apiKey)
  const { to, contactName, companyName, waste, report } = input

  const firstName = contactName.split(' ')[0]

  // Clean the report text for email
  const reportHtml = report
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return '<br/>'
      if (trimmed.startsWith('SECTION')) {
        const title = trimmed.replace(/^SECTION \d+:\s*/, '')
        return `<h2 style="color:#1a1a2e;font-size:20px;font-weight:bold;margin:32px 0 12px 0;padding-top:24px;border-top:1px solid #eee;">${title}</h2>`
      }
      if (trimmed.startsWith('Fix ') && trimmed.includes(':')) {
        return `<h3 style="color:#1a1a2e;font-size:18px;font-weight:bold;margin:28px 0 8px 0;">${trimmed}</h3>`
      }
      if (trimmed.startsWith('Estimated annual impact:')) {
        return `<p style="color:#00D084;font-size:16px;font-weight:600;margin:0 0 16px 0;">${trimmed}</p>`
      }
      if (trimmed.startsWith('Now:') || trimmed.startsWith('The problem:') || trimmed.startsWith('What is broken:')) {
        return `<p style="color:#666;font-size:15px;line-height:1.7;margin:0 0 8px 0;">${trimmed}</p>`
      }
      if (trimmed.startsWith('After:') || trimmed.startsWith('The fix:') || trimmed.startsWith('What fixing it looks like:')) {
        return `<p style="color:#1a1a2e;font-size:15px;line-height:1.7;margin:0 0 8px 0;">${trimmed}</p>`
      }
      return `<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 8px 0;">${trimmed}</p>`
    })
    .join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;">
      <p style="font-size:13px;color:#999;margin:0;">AI Readiness Audit Report</p>
    </div>

    <!-- Main card -->
    <div style="background:white;border-radius:16px;padding:40px 32px;border:1px solid #eee;">

      <p style="font-size:16px;color:#666;margin:0 0 8px 0;">Hi ${firstName},</p>
      <p style="font-size:16px;color:#444;margin:0 0 32px 0;line-height:1.6;">
        Here are the results from your AI readiness audit for <strong>${companyName}</strong>.
      </p>

      <!-- The number -->
      <div style="text-align:center;padding:32px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;margin-bottom:32px;">
        <p style="font-size:14px;color:#999;margin:0 0 8px 0;">Estimated annual cost of inefficiency</p>
        <p style="font-size:48px;font-weight:bold;color:#1a1a2e;margin:0;line-height:1;">${fmt(waste.totalWaste)}</p>
        <p style="font-size:14px;color:#d97706;font-weight:600;margin:12px 0 0 0;">
          That's approximately ${fmt(Math.round(waste.totalWaste / 52 / 100) * 100)} every week.
        </p>
      </div>

      <!-- Breakdown -->
      <table style="width:100%;margin-bottom:32px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:16px;background:#f9f9f9;border-radius:12px;">
            <p style="font-size:24px;font-weight:bold;color:#00D084;margin:0;">${fmt(waste.revenueAtRisk)}</p>
            <p style="font-size:12px;color:#999;margin:4px 0 0 0;">Revenue at risk</p>
          </td>
          <td style="width:12px;"></td>
          <td style="text-align:center;padding:16px;background:#f9f9f9;border-radius:12px;">
            <p style="font-size:24px;font-weight:bold;color:#00D084;margin:0;">${fmt(waste.adminCost)}</p>
            <p style="font-size:12px;color:#999;margin:4px 0 0 0;">Manual admin cost</p>
          </td>
        </tr>
      </table>

      <!-- Report -->
      ${reportHtml}

      <!-- CTA -->
      <div style="text-align:center;padding:40px 0 16px 0;border-top:1px solid #eee;margin-top:32px;">
        <p style="font-size:18px;font-weight:bold;color:#1a1a2e;margin:0 0 8px 0;">Ready to eliminate this waste?</p>
        <p style="font-size:14px;color:#999;margin:0 0 24px 0;">15 minutes. We look at your specific numbers together.</p>
        <a href="https://calendly.com/jorge-linklemon/30min"
           style="display:inline-block;background:#00D084;color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:600;">
          Book a Free Consultation
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;margin-top:24px;">
      <p style="font-size:11px;color:#ccc;margin:0;">Kuhnic AI &middot; kuhnic.ai</p>
    </div>
  </div>
</body>
</html>`

  const result = await resend.emails.send({
    from: 'Kuhnic AI <noreply@audit.kuhnic.ai>',
    to,
    subject: `Your AI Audit: ${fmt(waste.totalWaste)} in annual waste identified — ${companyName}`,
    html,
  })

  return result
}
