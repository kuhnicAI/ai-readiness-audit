'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import type { AuditScores, CategoryScore } from '@/lib/scoring'
import type { Finding } from '@/lib/waste'

interface AuditData {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  industry: string
  scores: AuditScores
  total_waste: number
  findings: Finding[]
  created_at: string
}

const fmt = (n: number) => '£' + n.toLocaleString('en-GB')

// ── Radar Chart ──
function RadarChart({ categories }: { categories: CategoryScore[] }) {
  const size = 300
  const center = size / 2
  const radius = 110
  const levels = 4
  const angleStep = (2 * Math.PI) / categories.length
  const startAngle = -Math.PI / 2

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const dataPoints = categories.map((c, i) => getPoint(i, c.score))

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {Array.from({ length: levels }).map((_, level) => {
        const r = ((level + 1) / levels) * radius
        const points = categories.map((_, i) => {
          const angle = startAngle + i * angleStep
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
        }).join(' ')
        return <polygon key={level} points={points} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      })}
      {categories.map((_, i) => {
        const angle = startAngle + i * angleStep
        return (
          <line key={i} x1={center} y1={center}
            x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)}
            stroke="#e5e7eb" strokeWidth="1" />
        )
      })}
      <polygon points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(0, 38, 62, 0.12)" stroke="#00263e" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#00263e" />
      ))}
      {categories.map((cat, i) => {
        const angle = startAngle + i * angleStep
        const labelR = radius + 26
        const x = center + labelR * Math.cos(angle)
        const y = center + labelR * Math.sin(angle)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] fill-[#6b7280] font-medium">
            {cat.label.split(' ').map((word, wi) => (
              <tspan key={wi} x={x} dy={wi === 0 ? 0 : 11}>{word}</tspan>
            ))}
          </text>
        )
      })}
    </svg>
  )
}

// ── Finding Card ──
function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 hover:bg-[#fafbfc] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#00263e] text-white text-[11px] font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <h3 className="text-[15px] font-bold text-[#00263e] leading-tight">{finding.title}</h3>
          </div>
          <p className="text-[13px] text-[#6b7280] mt-1 ml-9">{finding.problem}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-bold text-[#dc2626]">{fmt(finding.annualWaste)}<span className="text-[11px] font-normal text-[#9ca3af]">/yr</span></div>
          <svg className={`w-4 h-4 text-[#9ca3af] mt-1 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-[#f0f2f5]">
          <div className="pt-4">
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-1">The Detail</h4>
            <p className="text-[13px] text-[#3c4257] leading-relaxed">{finding.detail}</p>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-1">How We&apos;d Fix It</h4>
            <p className="text-[13px] text-[#3c4257] leading-relaxed">{finding.fix}</p>
          </div>
          <div className="rounded-lg bg-[#00263e]/5 px-4 py-3">
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#00263e] mb-1">Next Step</h4>
            <p className="text-[13px] text-[#00263e] font-medium">{finding.nextStep}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Results Page ──
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareStatus, setShareStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    fetch(`/api/audit/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.audit) setAudit(d.audit)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleDownloadPdf = async () => {
    if (!audit) return
    setPdfLoading(true)
    try {
      const { generatePdf } = await import('@/lib/pdf')
      await generatePdf(audit)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setPdfLoading(false)
  }

  const handleShare = async () => {
    if (!audit || !shareEmail.trim()) return
    setShareStatus('sending')
    try {
      const res = await fetch('/api/audit/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_id: audit.id,
          colleague_email: shareEmail.trim(),
          sender_name: audit.contact_name,
        }),
      })
      if (!res.ok) throw new Error()
      setShareStatus('sent')
    } catch {
      setShareStatus('error')
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fc] to-[#eef1f8]">
        <div className="text-[14px] text-[#6b7280]">Generating your report...</div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fc] to-[#eef1f8]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#00263e]">Audit not found</h1>
          <p className="mt-2 text-[14px] text-[#6b7280]">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const { scores, total_waste, findings } = audit
  const bandColor = scores.overall >= 75 ? '#10b981' : scores.overall >= 50 ? '#00263e' : scores.overall >= 25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fc] to-[#eef1f8]">
      <header className="pt-8 pb-2 px-6 text-center">
        <div className="text-[13px] font-semibold tracking-widest uppercase text-[#00263e]/60">
          Transputec AI Readiness Audit
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24">
        {/* ── Hero: Score + Waste ── */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#e5e7eb] p-8 md:p-10">
          <div className="text-center">
            <p className="text-[14px] text-[#6b7280]">Results for</p>
            <h1 className="mt-1 text-2xl font-bold text-[#00263e]">{audit.company_name}</h1>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-8 items-center">
            {/* Score circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f0f2f5" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={bandColor} strokeWidth="10"
                    strokeDasharray={`${(scores.overall / 100) * 327} 327`}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: bandColor }}>{scores.overall}</span>
                  <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider">out of 100</span>
                </div>
              </div>
              <div className="mt-3 inline-block rounded-full px-4 py-1.5 text-[13px] font-bold"
                style={{ backgroundColor: `${bandColor}15`, color: bandColor }}>
                {scores.band}
              </div>
            </div>

            {/* Waste figure */}
            <div className="text-center md:text-left">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">Estimated Annual Waste</p>
              <p className="mt-1 text-4xl md:text-5xl font-bold text-[#dc2626]">{fmt(total_waste)}</p>
              <p className="mt-2 text-[13px] text-[#6b7280] leading-relaxed max-w-sm">
                Based on your answers, this is the estimated cost of inefficiency across your organisation each year.
              </p>
            </div>
          </div>

          <p className="mt-6 text-[14px] text-[#6b7280] leading-relaxed text-center max-w-xl mx-auto">
            {scores.bandDescription}
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00263e] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#003a5c] transition-colors disabled:opacity-50"
            >
              {pdfLoading ? 'Generating...' : 'Download Your Report'}
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#00263e] px-6 py-3 text-[14px] font-semibold text-[#00263e] hover:bg-[#00263e]/5 transition-colors"
            >
              {copied ? 'Link Copied!' : 'Share with a Colleague'}
            </button>
          </div>
        </div>

        {/* ── Category Breakdown ── */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#e5e7eb] p-8">
          <h2 className="text-lg font-bold text-[#00263e] text-center mb-6">Category Breakdown</h2>
          <RadarChart categories={scores.categories} />
          <div className="mt-6 space-y-3">
            {scores.categories.map(cat => {
              const color = cat.score >= 75 ? '#10b981' : cat.score >= 50 ? '#00263e' : cat.score >= 25 ? '#f59e0b' : '#ef4444'
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-[#3c4257]">{cat.label}</span>
                    <span className="text-[13px] font-bold" style={{ color }}>{cat.score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0f2f5] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${cat.score}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Findings ── */}
        {findings.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#00263e]">Key Findings</h2>
              <span className="text-[13px] text-[#dc2626] font-semibold">
                {findings.length} issue{findings.length !== 1 ? 's' : ''} identified
              </span>
            </div>
            <div className="space-y-3">
              {findings.map((f, i) => (
                <FindingCard key={f.id} finding={f} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Share with Colleague ── */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#e5e7eb] p-6">
          <h3 className="text-[15px] font-bold text-[#00263e]">Send this report to a colleague</h3>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            They&apos;ll receive a clean email with your results and the PDF report attached.
          </p>
          {shareStatus === 'sent' ? (
            <p className="mt-4 text-[13px] font-semibold text-emerald-600">
              Report sent successfully.
            </p>
          ) : (
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-[14px] text-[#1a1a2e] placeholder-[#c4c9d4] focus:outline-none focus:ring-2 focus:ring-[#00263e]/20 focus:border-[#00263e] transition-colors"
              />
              <button
                onClick={handleShare}
                disabled={!shareEmail.trim() || shareStatus === 'sending'}
                className="shrink-0 rounded-xl bg-[#00263e] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#003a5c] transition-colors disabled:opacity-40"
              >
                {shareStatus === 'sending' ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
          {shareStatus === 'error' && (
            <p className="mt-2 text-[12px] text-red-600">Failed to send. Please try again.</p>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="mt-6 bg-[#00263e] rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold">Ready to eliminate this waste?</h2>
          <p className="mt-2 text-[14px] text-white/70 max-w-md mx-auto">
            Our AI transformation team can turn these findings into action.
            Most clients see ROI within the first month.
          </p>
          <a
            href="https://calendly.com/transputec-ai/consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-[14px] font-semibold text-[#00263e] hover:bg-[#f0f2f5] transition-colors"
          >
            Book a Free Consultation
          </a>
        </div>
      </main>
    </div>
  )
}
