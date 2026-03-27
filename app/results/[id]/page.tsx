'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { WasteCalculation } from '@/lib/waste'

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false })

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'outlook.co.uk', 'yahoo.com', 'yahoo.co.uk',
  'icloud.com', 'live.com', 'live.co.uk', 'me.com',
  'btinternet.com', 'sky.com', 'virginmedia.com', 'talktalk.net', 'aol.com',
])

function isPersonalEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1]
  return domain ? PERSONAL_DOMAINS.has(domain) : false
}

function normaliseWebsite(raw: string): string {
  let url = raw.trim()
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
  return url
}

const fmt = (n: number) => '£' + n.toLocaleString('en-GB')

function limitToTwoSentences(text: string): string {
  const sentences = text.split(/(?<=\.)\s+/).filter(s => s.trim().length > 0)
  return sentences.slice(0, 2).join(' ')
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`/g, '')
}

interface AuditData {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  role: string
  answers: Record<string, string | string[]>
  scores: WasteCalculation
  total_waste: number
  created_at: string
  ai_report?: string
}

interface ParsedFix {
  name: string
  impact: string
  now: string
  after: string
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    const duration = 2000
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <>{display.toLocaleString('en-GB')}</>
}

function parseFixes(report: string): ParsedFix[] {
  const cleaned = report.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.fix1Name) {
      return [
        { name: parsed.fix1Name, impact: parsed.fix1Impact ?? '', now: parsed.fix1RightNow ?? '', after: parsed.fix1AfterFix ?? '' },
        { name: parsed.fix2Name, impact: parsed.fix2Impact ?? '', now: parsed.fix2RightNow ?? '', after: parsed.fix2AfterFix ?? '' },
        { name: parsed.fix3Name, impact: parsed.fix3Impact ?? '', now: parsed.fix3RightNow ?? '', after: parsed.fix3AfterFix ?? '' },
      ].filter(f => f.name)
    }
  } catch { /* not JSON, try legacy parsing */ }

  const clean = stripMarkdown(report)
  const fixes: ParsedFix[] = []
  const fixRegex = /Fix\s+(\d+):\s*(.+?)(?=\n)/g
  let match

  while ((match = fixRegex.exec(clean)) !== null) {
    const startIdx = match.index
    const nextFixIdx = clean.indexOf('\nFix ', startIdx + 1)
    const sectionEndIdx = clean.indexOf('\nSECTION', startIdx + 1)
    const endIdx = Math.min(
      nextFixIdx > -1 ? nextFixIdx : clean.length,
      sectionEndIdx > -1 ? sectionEndIdx : clean.length
    )
    const block = clean.slice(startIdx, endIdx)
    const impactMatch = block.match(/Estimated annual impact:\s*(.+?)(?:\n|$)/)
    const nowMatch = block.match(/Now:\s*([\s\S]*?)(?=After:|$)/)
    const afterMatch = block.match(/After:\s*([\s\S]*?)(?=\n\n|Fix \d|SECTION|$)/)
    const brokenMatch = block.match(/What is broken:\s*([\s\S]*?)(?=What fixing it looks like:|The fix:|After:|$)/)
    const oldFixMatch = block.match(/What fixing it looks like:\s*([\s\S]*?)(?=Why they cannot|$)/)

    fixes.push({
      name: match[2].trim(),
      impact: impactMatch?.[1]?.trim() ?? '',
      now: (nowMatch?.[1] ?? brokenMatch?.[1] ?? '').trim().split('\n').join(' '),
      after: (afterMatch?.[1] ?? oldFixMatch?.[1] ?? '').trim().split('\n').join(' '),
    })
  }

  return fixes
}

function AnalysingMessages() {
  const messages = [
    'Analysing your business...',
    'Comparing against industry benchmarks...',
    'Identifying the highest-ROI fixes...',
    'Writing your personalised recommendations...',
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % messages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <section className="relative z-10 py-32 px-6 max-w-4xl mx-auto">
      <div className="text-center py-24">
        <div className="inline-block w-12 h-12 border-[3px] border-[#eee] border-t-[#00D084] rounded-full animate-spin mb-10" />
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            className="text-[clamp(1.4rem,3vw,1.8rem)] text-[#999] font-serif"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {messages[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  )
}

function formatCompanyName(raw: string): string {
  if (!raw || raw === 'pending') return 'your business'
  let name = raw.trim()
  name = name.replace(/^https?:\/\//, '')
  name = name.replace(/^www\./, '')
  name = name.replace(/\/+$/, '')
  if (name.includes('.')) {
    const parts = name.split('.')
    name = parts[0]
  }
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1)
  }
  return name || 'your business'
}

function PdfDownloadSection({ audit, waste, report, displayName }: { audit: AuditData; waste: WasteCalculation; report: string; displayName: string }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const handleDownload = async () => {
    setPdfLoading(true)
    setPdfError('')
    try {
      const res = await fetch('/api/audit/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: audit.company_name,
          contactName: audit.contact_name,
          role: audit.role ?? '',
          waste,
          reportRaw: report,
          businessType: audit.answers?.business_type ?? '',
          employeeCount: audit.answers?.employee_count ?? '',
          date: new Date(audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `Server returned ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AI-Audit-${displayName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF. Please try again.')
    }
    setPdfLoading(false)
  }

  return (
    <section className="relative z-10 py-12 px-6 max-w-4xl mx-auto">
      <motion.div
        className="rounded-2xl bg-[#1a1a2e] p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#00c97d]/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-[#00c97d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-[20px] font-bold text-white">Your full report is ready</h3>
          <p className="text-[14px] text-[#9ca3af] mt-1">6-page PDF with executive summary, three fixes ranked by ROI, and a 90-day roadmap.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={pdfLoading}
          className="shrink-0 rounded-full bg-[#00c97d] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#00b873] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-[#00c97d]/20"
        >
          {pdfLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : 'Download PDF'}
        </button>
      </motion.div>
      {pdfError && <p className="mt-3 text-[13px] text-red-500 text-center">{pdfError}</p>}
    </section>
  )
}

const calendarUrl = process.env.NEXT_PUBLIC_CALENDAR_URL ?? 'https://calendly.com/transputec-ai/consultation'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const fetchedRef = useRef(false)
  const reportFetchedRef = useRef(false)

  // Locked/unlocked state
  const [locked, setLocked] = useState(true)
  const [revealing, setRevealing] = useState(false)

  // Overlay form state
  const [overlayEmail, setOverlayEmail] = useState('')
  const [overlayWebsite, setOverlayWebsite] = useState('')
  const [personalEmailWarning, setPersonalEmailWarning] = useState(false)
  const [overlaySubmitting, setOverlaySubmitting] = useState(false)
  const [overlaySubmitAttempted, setOverlaySubmitAttempted] = useState(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch(`/api/audit/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.audit) {
          setAudit(d.audit)
          // If contact email exists and is not pending, unlock immediately (chat flow)
          if (d.audit.contact_email && d.audit.contact_email !== 'pending') {
            setLocked(false)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // Trigger report generation — only when unlocked (contact provided)
  useEffect(() => {
    if (!audit || reportFetchedRef.current || locked) return
    reportFetchedRef.current = true
    if (audit.ai_report) { setReport(audit.ai_report); return }
    setReportLoading(true)
    fetch('/api/audit/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audit_id: audit.id, answers: audit.answers, waste: audit.scores,
        companyName: audit.company_name, contactName: audit.contact_name, contactEmail: audit.contact_email, role: audit.role ?? 'Not specified',
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.report) setReport(d.report) })
      .catch(() => {})
      .finally(() => setReportLoading(false))
  }, [audit, locked])

  const handleReveal = async () => {
    setOverlaySubmitAttempted(true)
    if (!overlayEmail.trim() || !overlayWebsite.trim()) return

    setOverlaySubmitting(true)
    const isPersonal = isPersonalEmailDomain(overlayEmail)
    const normalisedWebsite = normaliseWebsite(overlayWebsite)

    try {
      // Update the audit record with contact info
      await fetch(`/api/audit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_email: overlayEmail.trim(),
          company_name: normalisedWebsite,
          personal_email: isPersonal,
        }),
      })

      // Update local audit state so report generation uses the real data
      setAudit(prev => prev ? {
        ...prev,
        contact_email: overlayEmail.trim(),
        contact_name: overlayEmail.trim().split('@')[0],
        company_name: normalisedWebsite,
      } : prev)

      // Start reveal animation
      setRevealing(true)
      setTimeout(() => {
        setLocked(false)
        setRevealing(false)
      }, 400)
    } catch {
      setOverlaySubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[15px] text-[#999]">Calculating your results...</div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#1a1a2e]">Audit not found</h1>
          <p className="mt-2 text-[14px] text-[#999]">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const w = audit.scores
  const m = w.methodology
  const fixes = report ? parseFixes(report) : []
  const displayName = formatCompanyName(audit.company_name)
  const weeklyLoss = Math.round(w.totalWaste / 52 / 100) * 100
  const overlayReady = overlayEmail.trim().length > 0 && overlayWebsite.trim().length > 0

  return (
    <div className="relative min-h-screen bg-white text-[#1a1a2e]">
      {/* ═══ COLORBENDS BG ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10">
        <ColorBends
          className=""
          rotation={45}
          speed={0.2}
          colors={['#00d084', '#04ace0']}
          transparent
          autoRotate={0}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* ═══ LOGOS ═══ */}
      <div className="relative z-10 px-6 md:px-16 pt-8">
        <a href="https://kuhnic.ai" target="_blank" rel="noopener noreferrer">
          <Image src="/kuhnic-logo.svg" alt="Kuhnic" width={100} height={26} className="h-[22px] w-auto" />
        </a>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[9px] text-[#aaa]">powered by</span>
          <a href="https://transputec.com" target="_blank" rel="noopener noreferrer">
            <Image src="/transputec-logo.svg" alt="Transputec" width={60} height={8} className="h-[7px] w-auto" />
          </a>
        </div>
      </div>

      {/* ═══ SECTION 1: THE NUMBER — always visible ═══ */}
      <section className="relative z-10 pt-16 pb-24 px-6 text-center">
        <motion.p
          className="text-[20px] text-[#999]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Based on your answers, here is what missed calls are costing {displayName} each year.
        </motion.p>

        <motion.p
          className="mt-8 text-[clamp(4rem,10vw,7rem)] font-serif text-[#1a1a2e] leading-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          £<AnimatedNumber value={w.revenueAtRisk} />
        </motion.p>

        <motion.p
          className="mt-3 text-[18px] text-[#999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          in annual revenue at risk from missed calls
          {w.afterHoursMultiplier > 1 && <span className="text-[14px]"> (including after-hours leakage estimate)</span>}
        </motion.p>

        <motion.p
          className="mt-3 text-[17px] font-semibold text-[#d97706]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          That is approximately {fmt(weeklyLoss)} in missed revenue every week.
        </motion.p>

        <motion.div
          className={`mt-14 grid grid-cols-1 gap-6 max-w-3xl w-full mx-auto ${w.showNetOpportunity && !w.consistencyError ? 'sm:grid-cols-3' : 'sm:grid-cols-2 max-w-2xl'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="text-center rounded-2xl bg-[#f8f9fa] border border-[#eee] p-6">
            <p className="text-[clamp(1.4rem,3vw,2rem)] font-serif text-[#1a1a2e]">{fmt(w.revenueAtRisk)}</p>
            <p className="mt-2 text-[14px] text-[#999]">Annual revenue at risk from missed calls</p>
          </div>
          <div className="text-center rounded-2xl bg-[#f8f9fa] border border-[#eee] p-6">
            <p className="text-[clamp(1.4rem,3vw,2rem)] font-serif text-[#1a1a2e]">{fmt(w.receptionistCost)}</p>
            <p className="mt-2 text-[14px] text-[#999]">Estimated annual cost of human call handling</p>
            <p className="mt-1 text-[11px] text-[#bbb]">Based on UK average salary</p>
          </div>
          {w.showNetOpportunity && !w.consistencyError && (
            <div className="text-center rounded-2xl bg-[#f8f9fa] border border-[#eee] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00D084] mb-2">Your opportunity</p>
              <p className="text-[clamp(1.4rem,3vw,2rem)] font-serif text-[#1a1a2e]">{fmt(w.netOpportunity)}</p>
              <p className="mt-2 text-[14px] text-[#999]">Estimated annual upside of switching to AI voice</p>
            </div>
          )}
        </motion.div>

        <motion.p
          className="mt-8 text-[15px] text-[#999] max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          Most businesses we work with recover the full cost of implementation within the first 30 to 60 days.
        </motion.p>
      </section>

      {/* Tension line — visible in locked state */}
      {locked && (
        <motion.p
          className="relative z-10 text-center text-[17px] text-[#888] mt-2 mb-8 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          Your three highest-ROI fixes are below.
        </motion.p>
      )}

      {/* Divider */}
      <div className="relative z-10 max-w-5xl mx-auto px-6"><div className="h-[1px] bg-[#eee]" /></div>

      {/* Report ready label — below the divider */}
      <div className="relative z-10 mt-10 mb-2 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#00D084]">Your full report is ready</p>
      </div>

      {/* ═══ FIRST FIX CARD — partially visible in locked state ═══ */}
      {fixes.length > 0 && (
        <section className="relative z-10 py-16 px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-serif text-[#1a1a2e] mb-4 text-center">
              The three highest-ROI fixes for {displayName}
            </h2>
            <p className="text-[17px] text-[#999] text-center mb-14">
              Most businesses we work with recover the cost of implementation within 60 days.
            </p>
          </motion.div>

          {/* First fix — name + impact visible, descriptions blurred when locked */}
          <motion.div
            className="rounded-2xl bg-white border border-[#eee] p-8 md:p-12 shadow-sm"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-5%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 mb-8">
              <h3 className="text-[24px] font-bold text-[#1a1a2e] leading-snug">{fixes[0].name}</h3>
              <span className="shrink-0 text-[16px] font-semibold text-[#00D084]">{fixes[0].impact}</span>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-400 ${locked ? 'blur-[8px] select-none' : ''}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d97706] mb-3">Right now</p>
                <p className="text-[18px] font-bold text-[#1a1a2e] leading-[1.6]">{limitToTwoSentences(fixes[0].now)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00D084] mb-3">After the fix</p>
                <p className="text-[18px] font-bold text-[#1a1a2e] leading-[1.6]">{limitToTwoSentences(fixes[0].after)}</p>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Loading state for fixes when report is generating (only visible when unlocked) */}
      {!locked && reportLoading && <AnalysingMessages />}

      {/* ═══ BLURRED SECTION — everything else ═══ */}
      <div className="relative">
        <div
          className={`transition-all duration-400 ease-out ${locked || revealing ? 'blur-[8px] pointer-events-none select-none' : ''}`}
        >
          {/* Remaining fix cards */}
          {fixes.length > 1 && (
            <div className="relative z-10 px-6 max-w-4xl mx-auto space-y-6 -mt-12 pb-24">
              {fixes.slice(1).map((fix, i) => (
                <motion.div
                  key={i}
                  className="rounded-2xl bg-white border border-[#eee] p-8 md:p-12 shadow-sm"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-5%' }}
                  transition={{ duration: 0.6, delay: (i + 1) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-start justify-between gap-4 mb-8">
                    <h3 className="text-[24px] font-bold text-[#1a1a2e] leading-snug">{fix.name}</h3>
                    <span className="shrink-0 text-[16px] font-semibold text-[#00D084]">{fix.impact}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d97706] mb-3">Right now</p>
                      <p className="text-[18px] font-bold text-[#1a1a2e] leading-[1.6]">{limitToTwoSentences(fix.now)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00D084] mb-3">After the fix</p>
                      <p className="text-[18px] font-bold text-[#1a1a2e] leading-[1.6]">{limitToTwoSentences(fix.after)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ═══ HOW WE CALCULATED THIS ═══ */}
          <section className="relative z-10 py-24 px-6">
            <div className="max-w-3xl mx-auto">
              <motion.p
                className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#bbb] mb-10 text-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                How we calculated this
              </motion.p>

              <motion.div
                className="rounded-2xl bg-white border border-[#eee] p-8 md:p-10 shadow-sm"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="space-y-4 text-[15px] text-[#444] font-mono leading-[1.8]">
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">Daily calls received</span>
                    <span className="font-semibold text-[#1a1a2e]">{m.dailyCallsReceived}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">Missed or unanswered</span>
                    <span className="font-semibold text-[#1a1a2e]">{m.missedPercent}% = {m.missedCallsPerDay} calls per day{w.missedRateAssumed ? ' *' : ''}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">Annual missed calls</span>
                    <span className="font-semibold text-[#1a1a2e]">{m.annualMissedCalls.toLocaleString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">Converted to clients at {m.conversionPercent}%{w.conversionRateAssumed ? ' *' : ''}</span>
                    <span className="font-semibold text-[#1a1a2e]">{m.lostClientsPerYear} lost clients per year</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">Average client value</span>
                    <span className="font-semibold text-[#1a1a2e]">{fmt(m.avgClientValue)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">Base revenue at risk</span>
                    <span className="font-semibold text-[#1a1a2e]">{fmt(m.baseRevenueAtRisk)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f0f0f0] pb-3">
                    <span className="text-[#888]">After hours adjustment ({m.afterHoursMultiplier}x)</span>
                    <span className="font-semibold text-[#1a1a2e]">{fmt(Math.round(m.baseRevenueAtRisk * m.afterHoursMultiplier))}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="font-bold text-[#1a1a2e]">Total annual revenue at risk</span>
                    <span className="font-bold text-[#00D084] text-[17px]">{fmt(m.adjustedRevenueAtRisk)}</span>
                  </div>
                </div>

                {(w.missedRateAssumed || w.conversionRateAssumed) && (
                  <p className="mt-6 text-[12px] text-[#999]">
                    * Assumed value — you selected &ldquo;Not sure&rdquo; or did not answer this question.
                    {w.missedRateAssumed ? ' Missed rate defaulted to 20%.' : ''}
                    {w.conversionRateAssumed ? ' Conversion rate defaulted to 15%.' : ''}
                  </p>
                )}

                {m.capApplied && (
                  <p className="mt-4 text-[12px] text-[#d97706]">{w.capReason}</p>
                )}
              </motion.div>

              <p className="mt-4 text-[13px] text-[#bbb] text-center">
                All figures use conservative midpoints derived from your inputs. Every assumption is labelled above.
              </p>
            </div>
          </section>

          {/* ═══ DOWNLOAD + EMAIL NOTE ═══ */}
          {report && !reportLoading && !locked && (
            <PdfDownloadSection audit={audit} waste={w} report={report} displayName={displayName} />
          )}

          {/* ═══ CTA ═══ */}
          <section className="relative z-10 py-28 px-6 bg-[#f5f5f5]/80 backdrop-blur-sm border-t border-[#e5e5e5]">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-serif text-[#1a1a2e]">
                Ready to eliminate this waste?
              </h2>
              <p className="mt-5 text-[16px] text-[#999] max-w-xl mx-auto leading-relaxed">
                We&rsquo;ll walk you through exactly how these numbers were calculated and what fixing them
                would look like for your business specifically. No pitch. Just the findings.
              </p>
              <a
                href="https://calendly.com/jorge-linklemon/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-block rounded-full bg-[#00D084] px-10 py-4 text-[16px] font-semibold text-white hover:bg-[#00b873] transition-colors shadow-lg shadow-[#00D084]/20"
              >
                Book a Free Consultation
              </a>
              <p className="mt-4 text-[14px] text-[#999]">
                15 minutes. We look at your specific numbers together. No proposal unless you ask for one.
              </p>
              <a
                href="https://www.linkedin.com/company/kuhnicai"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-block text-[#bbb] hover:text-[#0A66C2] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </motion.div>
          </section>
        </div>

        {/* ═══ GRADIENT OVERLAY — fades blurred content to white ═══ */}
        {locked && !revealing && (
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-transparent via-white/70 to-white" style={{ top: '10%' }} />
        )}

        {/* ═══ OVERLAY CARD ═══ */}
        <AnimatePresence>
          {locked && !revealing && (
            <motion.div
              className="absolute inset-x-0 z-30 flex justify-center px-4"
              style={{ top: '24px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8 max-w-[480px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                <h2 className="text-[22px] font-serif text-[#1a1a2e]">Your full breakdown is ready.</h2>
                <p className="mt-2 text-[15px] text-[#888] leading-[1.7]">
                  We&rsquo;ll personalise the findings for your specific business before showing you everything. Takes 30 seconds.
                </p>

                <div className="mt-6 space-y-3">
                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#888] mb-1.5">Work email</label>
                    <input
                      type="email"
                      value={overlayEmail}
                      onChange={e => setOverlayEmail(e.target.value)}
                      onBlur={() => setPersonalEmailWarning(isPersonalEmailDomain(overlayEmail))}
                      placeholder="you@yourcompany.co.uk"
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[#1a1a2e] placeholder-[#bbb] focus:outline-none transition-colors ${
                        overlaySubmitAttempted && !overlayEmail.trim()
                          ? 'border-red-400'
                          : 'border-[#e5e5e5] focus:border-[#00D084]'
                      }`}
                    />
                    {overlaySubmitAttempted && !overlayEmail.trim() && (
                      <p className="mt-1 text-[13px] text-red-500">We need this to generate your report.</p>
                    )}
                    {personalEmailWarning && overlayEmail.trim() && (
                      <p className="mt-1 text-[13px] text-amber-600">
                        Looks like a personal email. Please use your work email if you have one, or add your website below so we can find your business.
                      </p>
                    )}
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#888] mb-1.5">Your website</label>
                    <input
                      type="text"
                      value={overlayWebsite}
                      onChange={e => setOverlayWebsite(e.target.value)}
                      placeholder="www.yourbusiness.co.uk"
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[#1a1a2e] placeholder-[#bbb] focus:outline-none transition-colors ${
                        overlaySubmitAttempted && !overlayWebsite.trim()
                          ? 'border-red-400'
                          : 'border-[#e5e5e5] focus:border-[#00D084]'
                      }`}
                    />
                    {overlaySubmitAttempted && !overlayWebsite.trim() && (
                      <p className="mt-1 text-[13px] text-red-500">We need this to generate your report.</p>
                    )}
                    <p className="mt-1 text-[12px] text-[#aaa]">
                      No website? Paste your Google Business or LinkedIn company page URL instead.
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleReveal}
                    disabled={overlaySubmitting || !overlayReady}
                    className={`w-full h-[52px] rounded-lg text-[15px] font-medium transition-colors ${
                      overlayReady
                        ? 'bg-[#00D084] text-white hover:bg-[#00e090] cursor-pointer'
                        : 'bg-[#d1d5db] text-[#6b7280] cursor-not-allowed'
                    } disabled:opacity-70`}
                  >
                    {overlaySubmitting ? (
                      <span>Generating your report<span className="animate-pulse">...</span></span>
                    ) : 'Show Me Everything'}
                  </button>

                  <p className="text-[12px] text-[#aaa] text-center">We do not share your details with anyone. Ever.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
