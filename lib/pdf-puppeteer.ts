import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import type { WasteCalculation } from './waste'
import type { FullReport } from './generate-report'

const fmt = (n: number) => '£' + n.toLocaleString('en-GB')
const fmtBenchmark = (n: number) => n >= 1000000 ? '£' + (n / 1000000).toFixed(1) + 'M' : '£' + n.toLocaleString('en-GB')

function loadLogoBase64(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'public', filename)
    const data = fs.readFileSync(filePath)
    return `data:image/svg+xml;base64,${data.toString('base64')}`
  } catch { return '' }
}

function truncWords(s: string, max: number): string {
  const words = s.split(/\s+/)
  return words.length <= max ? s : words.slice(0, max).join(' ')
}

interface PdfInput {
  companyName: string
  contactName: string
  role: string
  waste: WasteCalculation
  report: FullReport
  businessType: string
  employeeCount: string
  date: string
}

const BENCHMARKS: Record<string, Record<string, [number, number]>> = {
  'We sell services to clients (agency, consultancy, professional services)': { '1 to 10': [8000, 30000], '11 to 50': [40000, 150000], '51 to 200': [150000, 550000], '201 to 500': [400000, 1400000], '500+': [1000000, 3500000] },
  'We run a practice or clinic (legal, medical, financial)': { '1 to 10': [10000, 35000], '11 to 50': [50000, 180000], '51 to 200': [180000, 650000], '201 to 500': [500000, 1600000], '500+': [1200000, 4000000] },
  'We operate a location-based business (venue, retail, hospitality)': { '1 to 10': [8000, 25000], '11 to 50': [35000, 120000], '51 to 200': [120000, 400000], '201 to 500': [300000, 1000000], '500+': [800000, 2500000] },
  "We're a tech company or SaaS": { '1 to 10': [12000, 40000], '11 to 50': [60000, 200000], '51 to 200': [200000, 750000], '201 to 500': [500000, 1800000], '500+': [1500000, 4500000] },
}
const DEFAULT_BENCH: Record<string, [number, number]> = { '1 to 10': [8000, 30000], '11 to 50': [40000, 150000], '51 to 200': [150000, 500000], '201 to 500': [400000, 1200000], '500+': [1000000, 3000000] }

function cleanName(raw: string): string { return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

export async function generatePdfPuppeteer(input: PdfInput): Promise<Buffer> {
  const { companyName, contactName, role, waste, report, businessType, employeeCount, date } = input
  const w = waste, r = report
  const displayName = cleanName(companyName)
  const typeBenchmarks = BENCHMARKS[businessType] ?? DEFAULT_BENCH
  const [benchLow, benchHigh] = typeBenchmarks[employeeCount] ?? DEFAULT_BENCH[employeeCount] ?? [15000, 60000]
  const typeLabel = businessType.includes('services') ? 'professional services firm' : businessType.includes('practice') ? 'practice' : businessType.includes('location') ? 'location-based business' : businessType.includes('tech') ? 'tech company' : 'business'
  const sizeLabel = employeeCount === '500+' ? '500 or more' : employeeCount
  const kuhnicLogo = loadLogoBase64('kuhnic-logo.svg')
  const transputecLogo = loadLogoBase64('transputec-logo.svg')
  const coverBg = (() => {
    try {
      const p = path.join(process.cwd(), 'public', 'cover-bg.png')
      return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
    } catch { return '' }
  })()
  const footerLeft = `AI Readiness Audit — ${esc(displayName)}`
  const footerRight = (n: number) => `Confidential — ${date} · Page ${n}`
  const pf = (n: number) => `<div class="pf"><span>${footerLeft}</span><span>${footerRight(n)}</span></div>`
  const f1L = esc(truncWords(r.fix1Name, 5)), f2L = esc(truncWords(r.fix2Name, 5)), f3L = esc(truncWords(r.fix3Name, 5))
  const mHtml = (items: string[]) => items.slice(0, 4).map(m => `<li>${esc(truncWords(m, 6))}</li>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',sans-serif;color:#0a0a0a;font-size:13px;line-height:1.6;}
.page{width:210mm;min-height:297mm;padding:50px 55px;position:relative;page-break-after:always;}
.page::before{content:'';position:absolute;top:0;left:0;right:0;height:8px;background:#00c97d;}
.pf{position:absolute;bottom:25px;left:55px;right:55px;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af;}
.serif{font-family:'Playfair Display',serif;}
.green{color:#00c97d;}
.muted{color:#6b7280;}
.label{font-size:11px;text-transform:uppercase;letter-spacing:0.2em;font-weight:600;}
.divider{height:1px;background:#e5e7eb;margin:20px 0;}
.metric-row{display:flex;gap:14px;margin-top:20px;}
.metric-box{flex:1;background:#f5f5f5;border-radius:10px;padding:18px;}
.metric-box .ml{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:600;}
.metric-box .mv{font-size:24px;font-weight:700;color:#00c97d;margin:6px 0;}
.metric-box .md{font-size:10px;color:#6b7280;}
.two-col{display:flex;gap:28px;}
.two-col>div{flex:1;}
.calc-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #d1d5db;font-size:11px;}
.calc-row.bold{font-weight:700;border-bottom:2px solid #0a0a0a;}
.green-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-top:20px;font-size:12px;line-height:1.6;}
.fix-block{page-break-inside:avoid;margin-bottom:20px;}
.fix-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.fix-cols{display:flex;gap:20px;margin-top:12px;}
.fix-cols>div{flex:1;}
.fix-cols .col-label{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:6px;}
.tl-box{background:#f5f5f5;border-radius:12px;padding:24px;margin-top:16px;page-break-inside:avoid;height:auto;overflow:visible;}
.tl-bar-wrap{position:relative;margin:20px 0 30px;height:32px;}
.tl-bar{height:8px;background:#e5e7eb;border-radius:4px;display:flex;overflow:hidden;position:absolute;top:12px;left:0;right:0;}
.tl-bar div{flex:1;}
.tl-dots{display:flex;position:relative;z-index:1;}
.tl-dot-wrap{flex:1;text-align:center;}
.tl-dot-wrap .dot{width:12px;height:12px;border-radius:50%;background:#00c97d;margin:0 auto;border:2px solid white;position:relative;z-index:2;}
.tl-labels{display:flex;margin-bottom:10px;}
.tl-labels div{flex:1;text-align:center;}
.tl-labels .month{font-size:13px;font-weight:700;}
.tl-labels .sub{font-size:11px;color:#6b7280;}
.tl-cols{display:flex;gap:14px;margin-top:10px;}
.tl-col{flex:1;page-break-inside:avoid;}
.tl-col li{font-size:12px;color:#374151;margin-bottom:6px;list-style:none;padding-left:14px;position:relative;line-height:1.4;white-space:normal;overflow:visible;text-overflow:unset;}
.tl-col li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:#00c97d;}
.benchmark-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-top:20px;font-size:12px;line-height:1.6;}
.next-grid{display:flex;gap:28px;margin-top:20px;}
.steps-left{flex:1.2;}
.steps-right{flex:0.8;}
.step-item{display:flex;gap:14px;margin-bottom:20px;}
.step-num{font-family:'Playfair Display',serif;font-size:40px;color:#e5e7eb;line-height:1;min-width:44px;}
.step-content h4{font-size:14px;font-weight:700;margin-bottom:3px;}
.step-content p{font-size:12px;color:#6b7280;line-height:1.5;}
.dark-box{background:#0a1628;color:white;border-radius:14px;padding:28px;}
.dark-box h3{font-family:'Playfair Display',serif;font-size:22px;margin-bottom:8px;}
.dark-box .sub{color:#9ca3af;font-size:14px;margin-bottom:16px;}
.dark-box .cal-link{color:#00c97d;font-size:13px;font-weight:600;}
.dark-box .credit{font-size:11px;color:white;margin-top:20px;opacity:0.7;}
</style></head><body>

<!-- COVER -->
<div style="width:100vw;min-height:100vh;margin:0;padding:0;background:white;position:relative;overflow:hidden;page-break-after:always;color:#0a0a0a;">
  <!-- Background image -->
  ${coverBg ? `<img src="${coverBg}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;"/>` : ''}

  <!-- Content overlay -->
  <div style="position:relative;z-index:1;padding:60px 60px 50px;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;">
    <!-- Top bar -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        ${kuhnicLogo ? `<img src="${kuhnicLogo}" style="height:32px;"/>` : '<div style="font-size:20px;font-weight:700;">Kuhnic</div>'}
      </div>
      <div style="font-size:12px;color:#9ca3af;">${date}</div>
    </div>

    <!-- Main title + money + prepared for -->
    <div style="margin-top:-80px;">
      <div style="font-size:100px;font-weight:900;color:#0a0a0a;line-height:0.9;letter-spacing:-3px;">AI<br/>READINESS</div>
      <div style="font-size:100px;font-weight:900;color:#0a0a0a;line-height:0.9;letter-spacing:-3px;opacity:0.12;">AUDIT</div>
      <div style="margin-top:36px;">
        <div style="font-size:64px;font-weight:900;color:#0a0a0a;line-height:1;letter-spacing:-2px;">${fmt(w.totalWaste)}</div>
        <div style="font-size:14px;color:#6b7280;margin-top:6px;letter-spacing:0.05em;">Estimated annual cost of inefficiency</div>
      </div>
      <div style="margin-top:28px;">
        <div style="font-size:11px;color:#9ca3af;letter-spacing:0.05em;">Prepared for</div>
        <div style="font-size:15px;font-weight:700;color:#0a0a0a;margin-top:2px;">${esc(contactName)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:1px;">${esc(role)} · ${esc(displayName)}</div>
      </div>
    </div>

    <!-- Bottom center credit -->
    <div style="text-align:center;padding-bottom:40px;">
      <div style="font-size:9px;color:#bbb;letter-spacing:0.08em;">Presented by Kuhnic AI</div>
      <div style="font-size:9px;color:#ccc;letter-spacing:0.08em;margin-top:3px;">Confidential</div>
    </div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <h1 class="serif" style="font-size:26px;margin-bottom:20px;page-break-inside:avoid;">Executive Summary</h1>
  <p style="margin-bottom:14px;font-size:13px;line-height:1.7;color:#374151;">${esc(r.executiveSummaryP1)}</p>
  <p style="margin-bottom:14px;font-size:13px;line-height:1.7;color:#374151;">${esc(r.executiveSummaryP2)}</p>
  <p style="margin-bottom:14px;font-size:13px;line-height:1.7;color:#374151;">${esc(r.executiveSummaryP3)}</p>
  <div class="divider"></div>
  <div class="metric-row">
    <div class="metric-box"><div class="ml">Total annual waste</div><div class="mv">${fmt(w.totalWaste)}</div><div class="md">Conservative estimate based on submitted data</div></div>
    <div class="metric-box"><div class="ml">Annual revenue at risk</div><div class="mv">${fmt(w.revenueAtRisk)}</div><div class="md">From missed and unresolved enquiries</div></div>
    <div class="metric-box"><div class="ml">Payback period</div><div class="mv">Under 90 days</div><div class="md">Typical for businesses this size and vertical</div></div>
  </div>
  ${pf(2)}
</div>

<!-- METHODOLOGY -->
<div class="page">
  <h1 class="serif" style="font-size:26px;margin-bottom:14px;page-break-inside:avoid;">Methodology</h1>
  <p class="muted" style="font-size:12px;line-height:1.6;margin-bottom:20px;">All figures use the lower bound of every range selected. The conversion assumption on missed enquiries is 15%, which is conservative for most professional service verticals. Actual recoverable value is likely higher.</p>
  <div class="two-col">
    <div>
      <h3 style="font-size:13px;font-weight:700;margin-bottom:10px;">Revenue at risk calculation</h3>
      <div class="calc-row"><span>Weekly inbound enquiries</span><span>${w.weeklyInbound}</span></div>
      <div class="calc-row"><span>Missed or unresolved rate</span><span>${Math.round(w.missedRate*100)}%</span></div>
      <div class="calc-row"><span>Missed enquiries per week</span><span>${Math.round(w.missedEnquiriesPerWeek)}</span></div>
      <div class="calc-row"><span>Assumed conversion rate</span><span>${Math.round(w.conversionRate*100)}%</span></div>
      <div class="calc-row"><span>Average client value</span><span>${fmt(w.clientValue)}</span></div>
      <div class="calc-row bold"><span>Annual revenue at risk</span><span>${fmt(w.revenueAtRisk)}</span></div>
    </div>
    <div>
      <h3 style="font-size:13px;font-weight:700;margin-bottom:10px;">Manual process cost calculation</h3>
      <div class="calc-row"><span>Weekly admin hours</span><span>${w.weeklyAdminHours}${w.adminHoursAssumed?' (est.)':''}</span></div>
      <div class="calc-row"><span>People involved</span><span>${w.adminHeadcount}</span></div>
      <div class="calc-row"><span>Hourly rate</span><span>£${w.hourlyRate.toFixed(0)}/hr${w.salaryAssumed?' (est.)':''}</span></div>
      <div class="calc-row"><span>Annual hours lost</span><span>${w.annualHoursLost.toLocaleString('en-GB')}</span></div>
      <div class="calc-row bold"><span>Annual admin cost</span><span>${fmt(w.adminCost)}</span></div>
    </div>
  </div>
  <div class="green-box"><strong>Total annual waste: ${fmt(w.revenueAtRisk)} + ${fmt(w.adminCost)} = ${fmt(w.totalWaste)}.</strong> These figures represent a conservative floor. The actual cost including opportunity cost and staff stress is typically 1.4 to 1.8 times this figure.</div>
  <svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;margin-top:16px;">
    <rect width="480" height="320" fill="white" rx="8"/>
    <rect x="40" y="20" width="200" height="130" fill="rgba(0,201,125,0.08)" rx="4"/>
    <text x="50" y="38" font-size="10" fill="#00c97d" font-family="Inter,sans-serif" font-weight="600">Highest priority</text>
    <line x1="40" y1="90" x2="460" y2="90" stroke="#e5e7eb" stroke-width="0.5"/>
    <line x1="40" y1="160" x2="460" y2="160" stroke="#e5e7eb" stroke-width="0.5"/>
    <line x1="40" y1="230" x2="460" y2="230" stroke="#e5e7eb" stroke-width="0.5"/>
    <line x1="145" y1="20" x2="145" y2="295" stroke="#e5e7eb" stroke-width="0.5"/>
    <line x1="250" y1="20" x2="250" y2="295" stroke="#e5e7eb" stroke-width="0.5"/>
    <line x1="355" y1="20" x2="355" y2="295" stroke="#e5e7eb" stroke-width="0.5"/>
    <text x="14" y="160" font-size="11" fill="#9ca3af" font-family="Inter,sans-serif" transform="rotate(-90,14,160)" text-anchor="middle">Financial Impact</text>
    <text x="250" y="315" font-size="11" fill="#9ca3af" font-family="Inter,sans-serif" text-anchor="middle">Implementation Effort →</text>
    <circle cx="${40+420*0.22}" cy="${20+275*0.15}" r="16" fill="#00c97d"/>
    <text x="${40+420*0.22}" y="${20+275*0.15+4}" font-size="11" fill="white" font-family="Inter,sans-serif" font-weight="700" text-anchor="middle">1</text>
    <text x="${40+420*0.22+22}" y="${20+275*0.15+4}" font-size="9" fill="#374151" font-family="Inter,sans-serif">${f1L}</text>
    <circle cx="${40+420*0.28}" cy="${20+275*0.45}" r="16" fill="#00c97d"/>
    <text x="${40+420*0.28}" y="${20+275*0.45+4}" font-size="11" fill="white" font-family="Inter,sans-serif" font-weight="700" text-anchor="middle">2</text>
    <text x="${40+420*0.28+22}" y="${20+275*0.45+4}" font-size="9" fill="#374151" font-family="Inter,sans-serif">${f2L}</text>
    <circle cx="${40+420*0.38}" cy="${20+275*0.65}" r="16" fill="#00c97d"/>
    <text x="${40+420*0.38}" y="${20+275*0.65+4}" font-size="11" fill="white" font-family="Inter,sans-serif" font-weight="700" text-anchor="middle">3</text>
    <text x="${40+420*0.38+22}" y="${20+275*0.65+4}" font-size="9" fill="#374151" font-family="Inter,sans-serif">${f3L}</text>
  </svg>
  ${pf(3)}
</div>

<!-- THREE FIXES -->
<div class="page">
  <h1 class="serif" style="font-size:26px;margin-bottom:6px;page-break-inside:avoid;">Recommended Actions Ranked by ROI</h1>
  <p class="muted" style="font-size:12px;margin-bottom:22px;">Each recommendation is specific to ${esc(displayName)} based on your submitted data.</p>
  <div class="fix-block">
    <div class="fix-header"><span class="label green">Fix 01</span><span style="font-size:13px;font-weight:700;color:#00c97d;">${esc(r.fix1Impact)} estimated annual impact</span></div>
    <div class="serif" style="font-size:18px;font-weight:700;margin-bottom:6px;">${esc(r.fix1Name)}</div>
    <div class="fix-cols">
      <div><div class="col-label" style="color:#d97706;">Right now</div><p style="font-size:12px;line-height:1.6;color:#374151;">${esc(r.fix1RightNow)}</p></div>
      <div><div class="col-label" style="color:#00c97d;">After the fix</div><p style="font-size:12px;line-height:1.6;color:#374151;">${esc(r.fix1AfterFix)}</p></div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="fix-block">
    <div class="fix-header"><span class="label green">Fix 02</span><span style="font-size:13px;font-weight:700;color:#00c97d;">${esc(r.fix2Impact)} estimated annual impact</span></div>
    <div class="serif" style="font-size:18px;font-weight:700;margin-bottom:6px;">${esc(r.fix2Name)}</div>
    <div class="fix-cols">
      <div><div class="col-label" style="color:#d97706;">Right now</div><p style="font-size:12px;line-height:1.6;color:#374151;">${esc(r.fix2RightNow)}</p></div>
      <div><div class="col-label" style="color:#00c97d;">After the fix</div><p style="font-size:12px;line-height:1.6;color:#374151;">${esc(r.fix2AfterFix)}</p></div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="fix-block">
    <div class="fix-header"><span class="label green">Fix 03</span><span style="font-size:13px;font-weight:700;color:#00c97d;">${esc(r.fix3Impact)} estimated annual impact</span></div>
    <div class="serif" style="font-size:18px;font-weight:700;margin-bottom:6px;">${esc(r.fix3Name)}</div>
    <div class="fix-cols">
      <div><div class="col-label" style="color:#d97706;">Right now</div><p style="font-size:12px;line-height:1.6;color:#374151;">${esc(r.fix3RightNow)}</p></div>
      <div><div class="col-label" style="color:#00c97d;">After the fix</div><p style="font-size:12px;line-height:1.6;color:#374151;">${esc(r.fix3AfterFix)}</p></div>
    </div>
  </div>
  ${pf(4)}
</div>

<!-- ROADMAP -->
<div class="page">
  <h1 class="serif" style="font-size:26px;margin-bottom:6px;page-break-inside:avoid;">Implementation Roadmap</h1>
  <p class="muted" style="font-size:12px;margin-bottom:18px;">A phased approach based on impact priority and implementation complexity.</p>
  <div class="tl-box">
    <div class="tl-labels">
      <div><div class="month">Month 1</div><div class="sub">Foundation</div></div>
      <div><div class="month">Month 2</div><div class="sub">Activation</div></div>
      <div><div class="month">Month 3</div><div class="sub">Optimisation</div></div>
    </div>
    <div class="tl-bar-wrap">
      <div class="tl-bar"><div style="background:#00c97d;"></div><div style="background:#34d399;"></div><div style="background:#6ee7b7;"></div></div>
      <div class="tl-dots" style="position:absolute;top:6px;left:0;right:0;">
        <div class="tl-dot-wrap"><div class="dot"></div></div>
        <div class="tl-dot-wrap"><div class="dot"></div></div>
        <div class="tl-dot-wrap"><div class="dot"></div></div>
      </div>
    </div>
    <div class="tl-cols">
      <div class="tl-col"><ul>${mHtml(r.month1Milestones)}</ul></div>
      <div class="tl-col"><ul>${mHtml(r.month2Milestones)}</ul></div>
      <div class="tl-col"><ul>${mHtml(r.month3Milestones)}</ul></div>
    </div>
  </div>
  <p class="muted" style="font-size:11px;margin-top:14px;">Timelines are indicative. Exact scope is confirmed during the initial consultation.</p>
  <div class="benchmark-box">The average ${typeLabel} with ${sizeLabel} employees loses ${fmtBenchmark(benchLow)} to ${fmtBenchmark(benchHigh)} annually to these same inefficiencies. ${esc(displayName)} is currently operating within this range. Closing the gap to best-in-class represents significant upside beyond the ${fmt(w.totalWaste)} calculated here.</div>
  ${pf(5)}
</div>

<!-- NEXT STEPS -->
<div class="page" style="display:flex;flex-direction:column;justify-content:space-between;page-break-after:avoid;">
  <div>
    <h1 class="serif" style="font-size:26px;margin-bottom:20px;">What Happens Next</h1>
    <div class="next-grid">
      <div class="steps-left">
        <div class="step-item"><div class="step-num">1</div><div class="step-content"><h4>15 minutes, that's it</h4><p>We jump on a call, look at your numbers together, and tell you exactly what we'd do. No deck. No pitch.</p></div></div>
        <div class="step-item"><div class="step-num">2</div><div class="step-content"><h4>We show you the build</h4><p>If it makes sense, we map out exactly what gets built, how long it takes, and what it costs. You'll know everything before committing to anything.</p></div></div>
        <div class="step-item"><div class="step-num">3</div><div class="step-content"><h4>You decide</h4><p>Most clients start with one fix. If the numbers work, we move. If they don't, we tell you that too.</p></div></div>
      </div>
      <div class="steps-right">
        <div class="dark-box">
          <h3>15 minutes. No pitch.</h3>
          <div class="sub">We look at your numbers together and tell you exactly what we'd build. If it doesn't make sense, we'll tell you that too.</div>
          <a href="https://calendly.com/jorge-linklemon/30min" style="display:inline-block;background:#00c97d;color:white;text-decoration:none;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;">Book a free call →</a>
        </div>
      </div>
    </div>
  </div>
  ${pf(6)}
</div>

<div id="content-ready"></div>
</body></html>`

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  await page.waitForSelector('#content-ready', { timeout: 10000 })
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
  await browser.close()
  return Buffer.from(pdfBuffer)
}
